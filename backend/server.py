from fastapi import FastAPI, APIRouter, Request, HTTPException, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
import io
import csv
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta

# Import pricing/depreciation FastAPI app (ml/entry.py)
from ml.entry import app as pricing_app
from ml.price_helper import load_artifacts, MODELS_DIR

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Analytics secret key from environment
ANALYTICS_EXPORT_KEY = os.environ.get('ANALYTICS_EXPORT_KEY', 'default-secret-change-me')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================
# Models
# ============================================================

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class AnalyticsEvent(BaseModel):
    event: str
    timestamp: str
    sessionId: str
    props: Optional[Dict[str, Any]] = {}

class AnalyticsEventDB(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event: str
    timestamp: str
    session_id: str
    props_json: Dict[str, Any] = {}
    user_agent: Optional[str] = None
    ip_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# New event models for business insights
class VehicleInput(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    trim: Optional[str] = None
    year: Optional[int] = None
    mileage: Optional[float] = None

class ResultData(BaseModel):
    market_price: Optional[float] = None
    green_low: Optional[float] = None
    green_high: Optional[float] = None
    red_low: Optional[float] = None
    red_high: Optional[float] = None
    confidence: Optional[float] = None
    sample_size: Optional[int] = None
    estimate_basis: Optional[str] = None

class BusinessEvent(BaseModel):
    """Event model for business insights analytics"""
    ts: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    event: str  # "search_submit", "view_price_graph", "view_depreciation", "copy_result", "page_view"
    session_id: str
    page: str = "/"
    vehicle: Optional[VehicleInput] = None
    result: Optional[ResultData] = None
    source: str = "frontend"
    app_version: Optional[str] = None

# ============================================================
# Helper Functions
# ============================================================

def hash_ip(ip: str) -> str:
    """Hash IP address for privacy - do not store raw IPs"""
    salt = os.environ.get('IP_HASH_SALT', 'default-salt')
    return hashlib.sha256(f"{ip}{salt}".encode()).hexdigest()[:16]

# ============================================================
# Status Routes (existing)
# ============================================================

@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ============================================================
# Analytics Routes (Private - no UI dashboard)
# ============================================================

@api_router.post("/analytics/event")
async def track_analytics_event(event: AnalyticsEvent, request: Request):
    """
    Track an analytics event from the frontend.
    Events are stored in MongoDB for later analysis.
    No PII is stored - IP is hashed if stored.
    """
    try:
        # Get client info
        user_agent = request.headers.get("user-agent", "")
        client_ip = request.client.host if request.client else ""
        
        # Create event document
        event_doc = AnalyticsEventDB(
            event=event.event,
            timestamp=event.timestamp,
            session_id=event.sessionId,
            props_json=event.props or {},
            user_agent=user_agent[:500] if user_agent else None,  # Limit UA length
            ip_hash=hash_ip(client_ip) if client_ip else None,
        )
        
        # Convert to dict for MongoDB
        doc = event_doc.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        # Insert into MongoDB
        await db.analytics_events.insert_one(doc)
        
        logger.info(f"Analytics event tracked: {event.event} from session {event.sessionId[:8]}...")
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Failed to track analytics event: {e}")
        # Don't fail the request - analytics should be fire-and-forget
        return {"success": False, "error": "Internal error"}

@api_router.get("/analytics/export.csv")
async def export_analytics_csv(key: str = Query(..., description="Export key for authentication")):
    """
    Export analytics events as CSV.
    Protected by secret key - no UI access.
    """
    if key != ANALYTICS_EXPORT_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid export key")
    
    try:
        # Fetch all events, sorted by created_at descending
        events = await db.analytics_events.find(
            {}, 
            {"_id": 0}
        ).sort("created_at", -1).to_list(10000)
        
        # Create CSV in memory
        output = io.StringIO()
        
        if events:
            fieldnames = ['id', 'event', 'timestamp', 'session_id', 'props_json', 'user_agent', 'ip_hash', 'created_at']
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for event in events:
                # Convert props_json to string
                event['props_json'] = str(event.get('props_json', {}))
                writer.writerow({k: event.get(k, '') for k in fieldnames})
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=analytics-export-{datetime.now().strftime('%Y%m%d')}.csv"
            }
        )
    
    except Exception as e:
        logger.error(f"Failed to export analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to export analytics")

@api_router.get("/analytics/summary")
async def get_analytics_summary(key: str = Query(..., description="Export key for authentication")):
    """
    Get analytics summary.
    Protected by secret key - no UI access.
    """
    if key != ANALYTICS_EXPORT_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid export key")
    
    try:
        # Total events
        total_events = await db.analytics_events.count_documents({})
        
        # Events by type (aggregation)
        event_counts_pipeline = [
            {"$group": {"_id": "$event", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        event_counts_cursor = db.analytics_events.aggregate(event_counts_pipeline)
        event_counts = {doc["_id"]: doc["count"] async for doc in event_counts_cursor}
        
        # Unique sessions
        unique_sessions = len(await db.analytics_events.distinct("session_id"))
        
        # Last 7 days breakdown
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        recent_events = await db.analytics_events.count_documents({
            "created_at": {"$gte": seven_days_ago}
        })
        
        # Daily breakdown for last 7 days
        daily_pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": seven_days_ago}
                }
            },
            {
                "$group": {
                    "_id": {"$substr": ["$created_at", 0, 10]},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": -1}}
        ]
        daily_cursor = db.analytics_events.aggregate(daily_pipeline)
        daily_counts = {doc["_id"]: doc["count"] async for doc in daily_cursor}
        
        return {
            "total_events": total_events,
            "unique_sessions": unique_sessions,
            "events_last_7_days": recent_events,
            "event_counts": event_counts,
            "daily_counts": daily_counts,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Failed to get analytics summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get analytics summary")

# ============================================================
# Health Check
# ============================================================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check MongoDB connection
        await db.command('ping')
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ============================================================
# Business Insights Events Routes (No /api prefix)
# ============================================================

@app.post("/events")
async def track_business_event(event: BusinessEvent):
    """
    Track business insights events.
    Stores events in MongoDB for later analysis.
    Fire-and-forget - does not block UI.
    """
    try:
        # Convert to dict for MongoDB
        doc = event.model_dump()
        
        # Ensure ts is a datetime and convert to ISO string
        if isinstance(doc.get('ts'), str):
            doc['ts'] = datetime.fromisoformat(doc['ts'].replace('Z', '+00:00'))
        elif doc.get('ts') is None:
            doc['ts'] = datetime.now(timezone.utc)
        
        # Convert datetime to ISO string for MongoDB storage
        doc['ts'] = doc['ts'].isoformat()
        
        # Insert into MongoDB
        await db.events.insert_one(doc)
        
        logger.debug(f"Business event tracked: {event.event} from session {event.session_id[:8]}...")
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Failed to track business event: {e}")
        # Don't fail the request - analytics should be fire-and-forget
        return {"success": False, "error": "Internal error"}

@app.get("/events/summary")
async def get_events_summary(days: int = Query(7, ge=1, le=365)):
    """
    Get summary of events for business insights.
    Returns totals by event type, top make/model by count, etc.
    """
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        # Convert to ISO string for comparison (ts is stored as ISO string)
        cutoff_date_str = cutoff_date.isoformat()
        
        # Total events by type
        event_counts_pipeline = [
            {"$match": {"ts": {"$gte": cutoff_date_str}}},
            {"$group": {"_id": "$event", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        event_counts_cursor = db.events.aggregate(event_counts_pipeline)
        event_counts = {doc["_id"]: doc["count"] async for doc in event_counts_cursor}
        
        # Top make/model by total count
        top_make_model_pipeline = [
            {"$match": {"ts": {"$gte": cutoff_date_str}, "vehicle": {"$exists": True, "$ne": None}}},
            {"$group": {
                "_id": {"make": "$vehicle.make", "model": "$vehicle.model"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        top_make_model_cursor = db.events.aggregate(top_make_model_pipeline)
        top_make_model = [
            {
                "make": doc["_id"]["make"],
                "model": doc["_id"]["model"],
                "count": doc["count"]
            }
            async for doc in top_make_model_cursor
        ]
        
        # Top make/model by search_submit count
        top_searches_pipeline = [
            {"$match": {
                "ts": {"$gte": cutoff_date_str},
                "event": "search_submit",
                "vehicle": {"$exists": True, "$ne": None}
            }},
            {"$group": {
                "_id": {"make": "$vehicle.make", "model": "$vehicle.model"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        top_searches_cursor = db.events.aggregate(top_searches_pipeline)
        top_searches = [
            {
                "make": doc["_id"]["make"],
                "model": doc["_id"]["model"],
                "count": doc["count"]
            }
            async for doc in top_searches_cursor
        ]
        
        return {
            "period_days": days,
            "cutoff_date": cutoff_date.isoformat(),
            "event_counts": event_counts,
            "top_make_model": top_make_model,
            "top_searches": top_searches,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Failed to get events summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get events summary")

@app.get("/events/top_models")
async def get_top_models(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    event: Optional[str] = Query(None, description="Filter by event type (e.g., 'search_submit')")
):
    """
    Get top models by event count.
    Useful for business insights on what users are searching for.
    """
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        # Convert to ISO string for comparison (ts is stored as ISO string)
        cutoff_date_str = cutoff_date.isoformat()
        
        match_filter = {
            "ts": {"$gte": cutoff_date_str},
            "vehicle": {"$exists": True, "$ne": None}
        }
        
        if event:
            match_filter["event"] = event
        
        pipeline = [
            {"$match": match_filter},
            {"$group": {
                "_id": {"make": "$vehicle.make", "model": "$vehicle.model"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        
        cursor = db.events.aggregate(pipeline)
        results = [
            {
                "make": doc["_id"]["make"],
                "model": doc["_id"]["model"],
                "count": doc["count"]
            }
            async for doc in cursor
        ]
        
        return {
            "period_days": days,
            "event_filter": event,
            "limit": limit,
            "results": results,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Failed to get top models: {e}")
        raise HTTPException(status_code=500, detail="Failed to get top models")

# Include the router in the main app
app.include_router(api_router)

# Include all routes from the pricing app (ml.entry:app)
# FastAPI apps expose their routes via .router
# This brings in:
# - POST /price
# - POST /price_graph  
# - POST /depreciation
# - GET /health/price_model
# - POST /admin/reload_price_model
app.include_router(pricing_app.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Load ML models on server startup and create MongoDB indexes"""
    try:
        logger.info("Loading ML price models...")
        load_artifacts(MODELS_DIR)
        logger.info("ML models loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load ML models: {e}")
        # Don't crash - allow server to start, but /price will return 503
    
    # Create indexes for events collection
    try:
        events_collection = db.events
        await events_collection.create_index([("ts", -1)])
        await events_collection.create_index([("event", 1), ("ts", -1)])
        await events_collection.create_index([("vehicle.make", 1), ("vehicle.model", 1), ("ts", -1)])
        logger.info("MongoDB indexes created for events collection")
    except Exception as e:
        logger.warning(f"Failed to create indexes (may already exist): {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

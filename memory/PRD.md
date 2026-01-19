# Used-Car Pricing ML Tool - PRD

## Original Problem Statement
Build a FULL working web app for a used-car pricing ML tool with:
- Frontend: React + modern UI components (Tailwind) - mobile and desktop responsive
- Users can predict car price bands via the ML API
- Cascading dropdown filters (Brand → Model → Trim) with "None / Not sure" allowed
- Track/log user behavior with analytics events
- Admin ability to reload models and show status
- Currency: THB with comma separators

## User Personas
1. **Car Buyers** - Want to know if a price is fair before purchasing
2. **Car Sellers** - Need to price their vehicles competitively
3. **Dealerships** - Quick price reference for inventory

## Core Requirements (Static)
- Cascading dropdowns: Make → Model → Trim
- Price prediction with Green/Yellow/Red bands
- Price graph visualization (PNG from ML service)
- Depreciation forecast chart
- localStorage-based analytics
- Dark/Light theme support
- Mobile responsive design
- Admin panel for model management

## What's Been Implemented (Dec 2025)
### Frontend (React)
- ✅ PredictionForm with cascading dropdowns (34+ car brands, 100+ models)
- ✅ ResultCard with price bands (Green/Yellow/Red) and THB formatting
- ✅ PriceGauge visual indicator
- ✅ GraphModal for price distribution chart
- ✅ DepreciationModal with chart/table toggle (Recharts)
- ✅ AnalyticsDashboard reading from localStorage
- ✅ AdminPanel with model reload simulation
- ✅ ThemeToggle (light/dark/system)
- ✅ Responsive Layout with navigation
- ✅ Mock API layer ready for backend connection

### API Layer (Mock)
- ✅ predictPrice() - generates price bands based on make/model/year/mileage
- ✅ getPriceGraph() - returns mock SVG chart
- ✅ getDepreciation() - returns 6-year depreciation forecast
- ✅ getMakes/getModels/getTrims() - from carData.js
- ✅ reloadModel() - mock admin endpoint

### Analytics (localStorage)
- ✅ Session tracking with UUID
- ✅ Event types: page_view, predict_submitted, predict_success, predict_error, graph_opened, depreciation_opened, cta_clicked, admin_reload
- ✅ Dashboard with stats, charts, recent events

## Prioritized Backlog

### P0 (Blocking)
None - MVP complete

### P1 (Next Phase)
- Connect to real Node.js/Express backend
- Connect to real PostgreSQL database
- Connect to real ML service at ML_BASE_URL
- Implement real session persistence

### P2 (Future)
- User authentication
- Save/bookmark predictions
- Lead capture form
- Export analytics to CSV/JSON from backend
- Real-time ML model status monitoring

## Architecture
```
Frontend (React) 
  ├── Pages: HomePage, AnalyticsPage
  ├── Components: PredictionForm, ResultCard, Modals, etc.
  ├── Lib: api.js (mock), analytics.js (localStorage), carData.js
  └── UI: Shadcn components, Tailwind CSS

Future:
Frontend → Node.js Backend → ML Service (FastAPI)
                ↓
           PostgreSQL (analytics, predictions, car_lookup)
```

## Next Tasks
1. Provide Node.js/Express backend code when ready
2. Provide ML_BASE_URL for real ML service connection
3. Set up PostgreSQL and run migrations
4. Switch `USE_MOCK = false` in api.js to use real backend

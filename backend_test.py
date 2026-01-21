#!/usr/bin/env python3
"""
Backend API Testing for Car Pricing Analytics
Tests the private analytics endpoints and other backend functionality
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class BackendAPITester:
    def __init__(self, base_url="https://pricecar.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.analytics_key = "car-pricing-analytics-secret-2024"

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict[str, Any] = None, params: Dict[str, str] = None, 
                 headers: Dict[str, str] = None) -> tuple[bool, Dict[str, Any]]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")

            try:
                return success, response.json() if response.text else {}
            except:
                return success, {"raw_response": response.text}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "Root Endpoint",
            "GET", 
            "api/",
            200
        )

    def test_analytics_event_tracking(self):
        """Test analytics event tracking endpoint"""
        test_event = {
            "event": "test_event",
            "timestamp": datetime.now().isoformat(),
            "sessionId": "test-session-123",
            "props": {
                "test_prop": "test_value",
                "prediction_id": "test-prediction-456"
            }
        }
        
        return self.run_test(
            "Analytics Event Tracking",
            "POST",
            "api/analytics/event",
            200,
            data=test_event
        )

    def test_analytics_summary_unauthorized(self):
        """Test analytics summary without key (should fail)"""
        return self.run_test(
            "Analytics Summary (Unauthorized)",
            "GET",
            "api/analytics/summary",
            401,
            params={"key": "wrong-key"}
        )

    def test_analytics_summary_authorized(self):
        """Test analytics summary with correct key"""
        return self.run_test(
            "Analytics Summary (Authorized)",
            "GET",
            "api/analytics/summary",
            200,
            params={"key": self.analytics_key}
        )

    def test_analytics_export_unauthorized(self):
        """Test analytics CSV export without key (should fail)"""
        return self.run_test(
            "Analytics CSV Export (Unauthorized)",
            "GET",
            "api/analytics/export.csv",
            401,
            params={"key": "wrong-key"}
        )

    def test_analytics_export_authorized(self):
        """Test analytics CSV export with correct key"""
        success, response = self.run_test(
            "Analytics CSV Export (Authorized)",
            "GET",
            "api/analytics/export.csv",
            200,
            params={"key": self.analytics_key}
        )
        
        if success:
            # Additional check for CSV content type
            url = f"{self.base_url}/api/analytics/export.csv"
            try:
                resp = requests.get(url, params={"key": self.analytics_key}, timeout=10)
                if 'text/csv' in resp.headers.get('content-type', ''):
                    print("   ✅ CSV content type confirmed")
                else:
                    print(f"   ⚠️  Unexpected content type: {resp.headers.get('content-type')}")
            except Exception as e:
                print(f"   ⚠️  Could not verify content type: {e}")
        
        return success, response

    def test_specific_analytics_events(self):
        """Test tracking specific analytics events mentioned in requirements"""
        events_to_test = [
            {
                "event": "page_view",
                "props": {"page": "/"}
            },
            {
                "event": "price_check_submit", 
                "props": {"make": "Toyota", "model": "Camry", "year": 2020}
            },
            {
                "event": "view_price_graph",
                "props": {"prediction_id": "test-123"}
            },
            {
                "event": "view_depreciation",
                "props": {"prediction_id": "test-123"}
            },
            {
                "event": "copy_result",
                "props": {"prediction_id": "test-123"}
            }
        ]
        
        all_passed = True
        for i, event_data in enumerate(events_to_test):
            test_event = {
                "event": event_data["event"],
                "timestamp": datetime.now().isoformat(),
                "sessionId": f"test-session-{i}",
                "props": event_data["props"]
            }
            
            success, _ = self.run_test(
                f"Analytics Event: {event_data['event']}",
                "POST",
                "api/analytics/event",
                200,
                data=test_event
            )
            
            if not success:
                all_passed = False
        
        return all_passed, {}

    def test_status_endpoints(self):
        """Test existing status endpoints"""
        # Test status creation
        status_data = {
            "client_name": "test_client"
        }
        
        success1, response1 = self.run_test(
            "Create Status Check",
            "POST",
            "api/status",
            200,
            data=status_data
        )
        
        # Test status retrieval
        success2, response2 = self.run_test(
            "Get Status Checks",
            "GET",
            "api/status",
            200
        )
        
        return success1 and success2, {"create": response1, "get": response2}

def main():
    """Run all backend tests"""
    print("🚀 Starting Backend API Tests")
    print("=" * 50)
    
    tester = BackendAPITester()
    
    # Run all tests
    test_results = []
    
    # Basic connectivity tests
    test_results.append(tester.test_health_check())
    test_results.append(tester.test_root_endpoint())
    
    # Status endpoints (existing functionality)
    test_results.append(tester.test_status_endpoints())
    
    # Analytics endpoints - core functionality
    test_results.append(tester.test_analytics_event_tracking())
    
    # Analytics endpoints - authentication
    test_results.append(tester.test_analytics_summary_unauthorized())
    test_results.append(tester.test_analytics_summary_authorized())
    test_results.append(tester.test_analytics_export_unauthorized())
    test_results.append(tester.test_analytics_export_authorized())
    
    # Specific analytics events
    test_results.append(tester.test_specific_analytics_events())
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
import requests
import sys
import json
from datetime import datetime
import uuid

class CampusSafetyAPITester:
    def __init__(self, base_url="https://echo-crime-alert.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@srmist.edu.in"
        self.test_roll_number = f"RA{datetime.now().strftime('%Y%m%d%H%M%S')}"

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")

    def make_request(self, method, endpoint, data=None, auth_required=False):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            
            return response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        print("\n🔍 Testing Root Endpoint...")
        response = self.make_request('GET', '')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = "Campus Crime Alert" in data.get("message", "")
                self.log_test("Root Endpoint", success, 
                            f"Status: {response.status_code}, Message: {data.get('message', 'No message')}")
                return success
            except:
                self.log_test("Root Endpoint", False, f"Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Root Endpoint", False, f"Status: {status}")
            return False

    def test_user_signup(self):
        """Test user registration"""
        print("\n🔍 Testing User Signup...")
        
        signup_data = {
            "name": "Test User",
            "email": self.test_user_email,
            "phone": "9876543210",
            "srm_roll_number": self.test_roll_number,
            "password": "TestPass123!"
        }
        
        response = self.make_request('POST', 'auth/signup', signup_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.token = data['access_token']
                    self.user_data = data['user']
                    self.log_test("User Signup", True, f"User ID: {self.user_data.get('id')}")
                    return True
                else:
                    self.log_test("User Signup", False, "Missing token or user data in response")
                    return False
            except:
                self.log_test("User Signup", False, "Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            error_msg = ""
            if response:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', 'Unknown error')
                except:
                    error_msg = response.text
            self.log_test("User Signup", False, f"Status: {status}, Error: {error_msg}")
            return False

    def test_user_signup_with_trusted_contacts(self):
        """Test user registration with trusted contacts"""
        print("\n🔍 Testing User Signup with Trusted Contacts...")
        
        # Create a new user with trusted contacts
        test_email = f"test_trusted_{datetime.now().strftime('%H%M%S')}@srmist.edu.in"
        test_roll = f"RA{datetime.now().strftime('%Y%m%d%H%M%S')}T"
        
        signup_data = {
            "name": "Test User with Contacts",
            "email": test_email,
            "phone": "9876543210",
            "srm_roll_number": test_roll,
            "password": "TestPass123!",
            "trusted_contact_1_name": "Emergency Contact 1",
            "trusted_contact_1_phone": "9123456789",
            "trusted_contact_2_name": "Emergency Contact 2", 
            "trusted_contact_2_phone": "9987654321"
        }
        
        response = self.make_request('POST', 'auth/signup', signup_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    user = data['user']
                    trusted_contacts = user.get('trusted_contacts', [])
                    success = len(trusted_contacts) == 2
                    if success:
                        contact1 = trusted_contacts[0]
                        contact2 = trusted_contacts[1]
                        success = (contact1.get('name') == 'Emergency Contact 1' and 
                                 contact1.get('phone') == '9123456789' and
                                 contact2.get('name') == 'Emergency Contact 2' and
                                 contact2.get('phone') == '9987654321')
                    
                    self.log_test("User Signup with Trusted Contacts", success, 
                                f"Contacts saved: {len(trusted_contacts)}")
                    return success
                else:
                    self.log_test("User Signup with Trusted Contacts", False, "Missing token or user data")
                    return False
            except Exception as e:
                self.log_test("User Signup with Trusted Contacts", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("User Signup with Trusted Contacts", False, f"Status: {status}")
            return False

    def test_user_login_email(self):
        """Test user login with email"""
        print("\n🔍 Testing User Login (Email)...")
        
        login_data = {
            "email_or_roll": self.test_user_email,
            "password": "TestPass123!"
        }
        
        response = self.make_request('POST', 'auth/login', login_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = 'access_token' in data and 'user' in data
                self.log_test("User Login (Email)", success)
                return success
            except:
                self.log_test("User Login (Email)", False, "Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("User Login (Email)", False, f"Status: {status}")
            return False

    def test_user_login_roll(self):
        """Test user login with SRM roll number"""
        print("\n🔍 Testing User Login (Roll Number)...")
        
        login_data = {
            "email_or_roll": self.test_roll_number,
            "password": "TestPass123!"
        }
        
        response = self.make_request('POST', 'auth/login', login_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = 'access_token' in data and 'user' in data
                self.log_test("User Login (Roll Number)", success)
                return success
            except:
                self.log_test("User Login (Roll Number)", False, "Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("User Login (Roll Number)", False, f"Status: {status}")
            return False

    def test_crime_report(self):
        """Test crime reporting with enhanced location data"""
        print("\n🔍 Testing Crime Report with Location Data...")
        
        if not self.token:
            self.log_test("Crime Report", False, "No authentication token")
            return False
        
        crime_data = {
            "title": "Test Theft Report",
            "description": "Testing theft reporting functionality with enhanced location",
            "crime_type": "theft",
            "location": {
                "lat": 12.8230,
                "lng": 80.0444,
                "address": "SRM KTR Campus, Academic Block A",
                "source": "current"
            },
            "severity": "medium",
            "is_anonymous": False
        }
        
        response = self.make_request('POST', 'crimes/report', crime_data, auth_required=True)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                location = data.get('location', {})
                success = ('id' in data and 
                          data.get('title') == crime_data['title'] and
                          location.get('source') == 'current' and
                          'lat' in location and 'lng' in location)
                self.log_test("Crime Report with Location", success, f"Crime ID: {data.get('id')}")
                return success
            except Exception as e:
                self.log_test("Crime Report with Location", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Crime Report with Location", False, f"Status: {status}")
            return False

    def test_get_crimes(self):
        """Test getting all crimes"""
        print("\n🔍 Testing Get Crimes...")
        
        response = self.make_request('GET', 'crimes')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = isinstance(data, list)
                self.log_test("Get Crimes", success, f"Found {len(data)} crimes")
                return success
            except:
                self.log_test("Get Crimes", False, "Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get Crimes", False, f"Status: {status}")
            return False

    def test_get_map_data(self):
        """Test getting map data"""
        print("\n🔍 Testing Get Map Data...")
        
        response = self.make_request('GET', 'crimes/map-data')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = 'crimes' in data and isinstance(data['crimes'], list)
                self.log_test("Get Map Data", success, f"Found {len(data.get('crimes', []))} map entries")
                return success
            except:
                self.log_test("Get Map Data", False, "Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get Map Data", False, f"Status: {status}")
            return False

    def test_sos_alert(self):
        """Test SOS alert creation with trusted contacts integration"""
        print("\n🔍 Testing SOS Alert with Trusted Contacts...")
        
        if not self.token:
            self.log_test("SOS Alert", False, "No authentication token")
            return False
        
        sos_data = {
            "location": {
                "lat": 12.8230,
                "lng": 80.0444,
                "address": "SRM KTR Campus Emergency",
                "source": "current"
            },
            "emergency_type": "security"
        }
        
        response = self.make_request('POST', 'sos/alert', sos_data, auth_required=True)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = ('id' in data and 
                          data.get('emergency_type') == 'security' and
                          'trusted_contacts_notified' in data)
                
                # Check if trusted contacts are included
                contacts_notified = data.get('trusted_contacts_notified', [])
                self.log_test("SOS Alert with Trusted Contacts", success, 
                            f"SOS ID: {data.get('id')}, Contacts notified: {len(contacts_notified)}")
                return success
            except Exception as e:
                self.log_test("SOS Alert with Trusted Contacts", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("SOS Alert with Trusted Contacts", False, f"Status: {status}")
            return False

    def test_get_sos_alerts(self):
        """Test getting SOS alerts"""
        print("\n🔍 Testing Get SOS Alerts...")
        
        response = self.make_request('GET', 'sos/alerts')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = isinstance(data, list)
                self.log_test("Get SOS Alerts", success, f"Found {len(data)} SOS alerts")
                return success
            except:
                self.log_test("Get SOS Alerts", False, "Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get SOS Alerts", False, f"Status: {status}")
            return False

    def test_get_recent_crimes(self):
        """Test getting recent crimes endpoint"""
        print("\n🔍 Testing Get Recent Crimes...")
        
        response = self.make_request('GET', 'crimes/recent?limit=5')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = isinstance(data, list) and len(data) <= 5
                self.log_test("Get Recent Crimes", success, f"Found {len(data)} recent crimes")
                return success
            except Exception as e:
                self.log_test("Get Recent Crimes", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get Recent Crimes", False, f"Status: {status}")
            return False

    def test_get_trusted_contacts(self):
        """Test getting user's trusted contacts"""
        print("\n🔍 Testing Get Trusted Contacts...")
        
        if not self.token:
            self.log_test("Get Trusted Contacts", False, "No authentication token")
            return False
        
        response = self.make_request('GET', 'user/trusted-contacts', auth_required=True)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = 'trusted_contacts' in data and isinstance(data['trusted_contacts'], list)
                contacts_count = len(data.get('trusted_contacts', []))
                self.log_test("Get Trusted Contacts", success, f"Found {contacts_count} trusted contacts")
                return success
            except Exception as e:
                self.log_test("Get Trusted Contacts", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get Trusted Contacts", False, f"Status: {status}")
            return False

    def test_get_user_profile(self):
        """Test getting user profile - NEW FEATURE"""
        print("\n🔍 Testing Get User Profile (NEW)...")
        
        if not self.token:
            self.log_test("Get User Profile", False, "No authentication token")
            return False
        
        response = self.make_request('GET', 'user/profile', auth_required=True)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                required_fields = ['id', 'name', 'email', 'phone', 'srm_roll_number', 'trusted_contacts', 'created_at']
                success = all(field in data for field in required_fields)
                
                if success:
                    # Verify data matches our test user
                    success = (data.get('email') == self.test_user_email and 
                             data.get('srm_roll_number') == self.test_roll_number)
                
                self.log_test("Get User Profile", success, 
                            f"Profile for: {data.get('name', 'Unknown')}")
                return success
            except Exception as e:
                self.log_test("Get User Profile", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get User Profile", False, f"Status: {status}")
            return False

    def test_update_trusted_contacts(self):
        """Test updating user's trusted contacts - NEW FEATURE"""
        print("\n🔍 Testing Update Trusted Contacts (NEW)...")
        
        if not self.token:
            self.log_test("Update Trusted Contacts", False, "No authentication token")
            return False
        
        # Test updating contacts
        update_data = {
            "contact1_name": "Updated Contact 1",
            "contact1_phone": "9111111111",
            "contact2_name": "Updated Contact 2", 
            "contact2_phone": "9222222222"
        }
        
        response = self.make_request('PUT', 'user/trusted-contacts', update_data, auth_required=True)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = ('message' in data and 
                          'trusted_contacts' in data and
                          len(data['trusted_contacts']) == 2)
                
                if success:
                    contacts = data['trusted_contacts']
                    contact1 = contacts[0]
                    contact2 = contacts[1]
                    success = (contact1.get('name') == 'Updated Contact 1' and
                             contact1.get('phone') == '9111111111' and
                             contact2.get('name') == 'Updated Contact 2' and
                             contact2.get('phone') == '9222222222')
                
                self.log_test("Update Trusted Contacts", success, 
                            f"Updated {len(data.get('trusted_contacts', []))} contacts")
                return success
            except Exception as e:
                self.log_test("Update Trusted Contacts", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Update Trusted Contacts", False, f"Status: {status}")
            return False

    def test_update_trusted_contacts_validation(self):
        """Test phone validation in trusted contacts update - NEW FEATURE"""
        print("\n🔍 Testing Trusted Contacts Phone Validation (NEW)...")
        
        if not self.token:
            self.log_test("Trusted Contacts Validation", False, "No authentication token")
            return False
        
        # Test with invalid phone number
        invalid_data = {
            "contact1_name": "Invalid Contact",
            "contact1_phone": "123456789",  # Invalid - doesn't start with 6-9
            "contact2_name": "Valid Contact",
            "contact2_phone": "9876543210"
        }
        
        response = self.make_request('PUT', 'user/trusted-contacts', invalid_data, auth_required=True)
        
        # Should return 400 for invalid phone
        if response and response.status_code == 400:
            try:
                data = response.json()
                success = 'detail' in data and 'Invalid phone number' in data['detail']
                self.log_test("Trusted Contacts Validation", success, 
                            f"Correctly rejected invalid phone: {data.get('detail', '')}")
                return success
            except Exception as e:
                self.log_test("Trusted Contacts Validation", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Trusted Contacts Validation", False, 
                        f"Expected 400 for invalid phone, got: {status}")
            return False

    def test_ai_predictions(self):
        """Test enhanced AI predictions endpoint with real NewsAPI and LLM integration"""
        print("\n🔍 Testing Enhanced AI Predictions...")
        
        response = self.make_request('GET', 'ai/predictions')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check main structure
                required_main_fields = ['predictions', 'trend_analysis', 'safety_tips', 'news_articles_analyzed', 'last_updated']
                has_main_structure = all(field in data for field in required_main_fields)
                
                if not has_main_structure:
                    self.log_test("Enhanced AI Predictions", False, f"Missing main fields: {[f for f in required_main_fields if f not in data]}")
                    return False
                
                # Check predictions structure
                predictions = data.get('predictions', [])
                predictions_count = len(predictions)
                
                if predictions_count > 0:
                    first_prediction = predictions[0]
                    required_pred_fields = ['id', 'prediction_text', 'confidence_level', 'crime_type', 'location_area', 'risk_factors', 'preventive_measures', 'data_sources', 'valid_until']
                    has_pred_fields = all(field in first_prediction for field in required_pred_fields)
                    
                    if not has_pred_fields:
                        missing_fields = [f for f in required_pred_fields if f not in first_prediction]
                        self.log_test("Enhanced AI Predictions", False, f"Prediction missing fields: {missing_fields}")
                        return False
                
                # Check trend analysis structure
                trend_analysis = data.get('trend_analysis', {})
                required_trend_fields = ['trend_type', 'crime_categories', 'time_period', 'key_insights', 'statistical_summary']
                has_trend_fields = all(field in trend_analysis for field in required_trend_fields)
                
                if not has_trend_fields:
                    missing_trend_fields = [f for f in required_trend_fields if f not in trend_analysis]
                    self.log_test("Enhanced AI Predictions", False, f"Trend analysis missing fields: {missing_trend_fields}")
                    return False
                
                # Check safety tips
                safety_tips = data.get('safety_tips', [])
                has_safety_tips = isinstance(safety_tips, list) and len(safety_tips) > 0
                
                # Check news articles analyzed count
                news_count = data.get('news_articles_analyzed', 0)
                
                success = has_main_structure and has_pred_fields and has_trend_fields and has_safety_tips
                
                details = f"Predictions: {predictions_count}, News analyzed: {news_count}, Safety tips: {len(safety_tips)}, Trend: {trend_analysis.get('trend_type', 'unknown')}"
                self.log_test("Enhanced AI Predictions", success, details)
                
                return success
                
            except Exception as e:
                self.log_test("Enhanced AI Predictions", False, f"JSON parsing error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            error_msg = ""
            if response:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', 'Unknown error')
                except:
                    error_msg = response.text[:200]
            self.log_test("Enhanced AI Predictions", False, f"Status: {status}, Error: {error_msg}")
            return False

    def test_ai_news_articles(self):
        """Test news articles endpoint"""
        print("\n🔍 Testing AI News Articles...")
        
        response = self.make_request('GET', 'ai/news-articles?limit=5')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check main structure
                required_fields = ['articles', 'count', 'last_updated']
                has_structure = all(field in data for field in required_fields)
                
                if not has_structure:
                    self.log_test("AI News Articles", False, f"Missing fields: {[f for f in required_fields if f not in data]}")
                    return False
                
                articles = data.get('articles', [])
                count = data.get('count', 0)
                
                # Verify count matches articles length
                count_matches = len(articles) == count
                
                # Check article structure if articles exist
                if articles:
                    first_article = articles[0]
                    required_article_fields = ['title', 'url', 'published_at', 'source_name', 'crime_score']
                    has_article_fields = all(field in first_article for field in required_article_fields)
                    
                    if not has_article_fields:
                        missing_fields = [f for f in required_article_fields if f not in first_article]
                        self.log_test("AI News Articles", False, f"Article missing fields: {missing_fields}")
                        return False
                
                success = has_structure and count_matches
                self.log_test("AI News Articles", success, f"Found {count} articles, Last updated: {data.get('last_updated', 'N/A')}")
                
                return success
                
            except Exception as e:
                self.log_test("AI News Articles", False, f"JSON parsing error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("AI News Articles", False, f"Status: {status}")
            return False

    def test_ai_refresh_analysis_without_auth(self):
        """Test refresh analysis endpoint without authentication (should fail)"""
        print("\n🔍 Testing AI Refresh Analysis (No Auth)...")
        
        response = self.make_request('POST', 'ai/refresh-analysis')
        
        # Should return 401 or 403 for missing authentication
        if response and response.status_code in [401, 403]:
            self.log_test("AI Refresh Analysis (No Auth)", True, f"Correctly rejected unauthorized request: {response.status_code}")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("AI Refresh Analysis (No Auth)", False, f"Expected 401/403, got: {status}")
            return False

    def test_ai_refresh_analysis_with_auth(self):
        """Test refresh analysis endpoint with authentication"""
        print("\n🔍 Testing AI Refresh Analysis (With Auth)...")
        
        if not self.token:
            self.log_test("AI Refresh Analysis (With Auth)", False, "No authentication token")
            return False
        
        response = self.make_request('POST', 'ai/refresh-analysis', auth_required=True)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check response structure
                required_fields = ['message', 'analysis', 'refreshed_at']
                has_structure = all(field in data for field in required_fields)
                
                if not has_structure:
                    self.log_test("AI Refresh Analysis (With Auth)", False, f"Missing fields: {[f for f in required_fields if f not in data]}")
                    return False
                
                # Check that analysis has the expected structure
                analysis = data.get('analysis', {})
                analysis_fields = ['predictions', 'trend_analysis', 'safety_tips']
                has_analysis_structure = all(field in analysis for field in analysis_fields)
                
                success = has_structure and has_analysis_structure
                self.log_test("AI Refresh Analysis (With Auth)", success, f"Refreshed at: {data.get('refreshed_at', 'N/A')}")
                
                return success
                
            except Exception as e:
                self.log_test("AI Refresh Analysis (With Auth)", False, f"JSON parsing error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            error_msg = ""
            if response:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', 'Unknown error')
                except:
                    error_msg = response.text[:200]
            self.log_test("AI Refresh Analysis (With Auth)", False, f"Status: {status}, Error: {error_msg}")
            return False

    def test_ai_predictions_fallback_behavior(self):
        """Test AI predictions fallback behavior when APIs might be unavailable"""
        print("\n🔍 Testing AI Predictions Fallback Behavior...")
        
        # Make multiple requests to test consistency and fallback mechanisms
        responses = []
        for i in range(2):
            response = self.make_request('GET', 'ai/predictions')
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    responses.append(data)
                except:
                    pass
            
            # Small delay between requests
            import time
            time.sleep(1)
        
        if len(responses) < 2:
            self.log_test("AI Predictions Fallback", False, "Could not get multiple responses for comparison")
            return False
        
        # Check that both responses have valid structure (indicating fallback works)
        first_response = responses[0]
        second_response = responses[1]
        
        # Both should have predictions
        has_predictions_1 = 'predictions' in first_response and len(first_response['predictions']) > 0
        has_predictions_2 = 'predictions' in second_response and len(second_response['predictions']) > 0
        
        # Check if responses are consistent (caching working) or different (fresh data)
        predictions_count_1 = len(first_response.get('predictions', []))
        predictions_count_2 = len(second_response.get('predictions', []))
        
        success = has_predictions_1 and has_predictions_2
        
        details = f"Response 1: {predictions_count_1} predictions, Response 2: {predictions_count_2} predictions"
        if success:
            # Check if we got mock data (news_articles_analyzed = 0) or real data
            news_count_1 = first_response.get('news_articles_analyzed', 0)
            news_count_2 = second_response.get('news_articles_analyzed', 0)
            
            if news_count_1 == 0 and news_count_2 == 0:
                details += " (Using fallback/mock data)"
            else:
                details += f" (Real data: {max(news_count_1, news_count_2)} articles)"
        
        self.log_test("AI Predictions Fallback", success, details)
        return success

    def test_ai_crime_filtering_accuracy(self):
        """Test the crime content filtering by checking prediction relevance"""
        print("\n🔍 Testing AI Crime Filtering Accuracy...")
        
        response = self.make_request('GET', 'ai/predictions')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                predictions = data.get('predictions', [])
                
                if not predictions:
                    self.log_test("AI Crime Filtering", False, "No predictions to analyze")
                    return False
                
                # Check if predictions contain crime-related content
                crime_related_count = 0
                total_predictions = len(predictions)
                
                crime_keywords = ['crime', 'theft', 'robbery', 'assault', 'safety', 'security', 'risk', 'danger', 'incident', 'violence']
                
                for prediction in predictions:
                    prediction_text = prediction.get('prediction_text', '').lower()
                    crime_type = prediction.get('crime_type', '')
                    
                    # Check if prediction contains crime-related keywords or has valid crime type
                    has_crime_keywords = any(keyword in prediction_text for keyword in crime_keywords)
                    has_valid_crime_type = crime_type in ['violent', 'property', 'drug', 'assault', 'cyber', 'general']
                    
                    if has_crime_keywords or has_valid_crime_type:
                        crime_related_count += 1
                
                # At least 80% of predictions should be crime-related
                accuracy_threshold = 0.8
                accuracy = crime_related_count / total_predictions if total_predictions > 0 else 0
                success = accuracy >= accuracy_threshold
                
                self.log_test("AI Crime Filtering", success, 
                            f"Crime relevance: {crime_related_count}/{total_predictions} ({accuracy:.1%})")
                
                return success
                
            except Exception as e:
                self.log_test("AI Crime Filtering", False, f"Analysis error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("AI Crime Filtering", False, f"Status: {status}")
            return False

    def test_ai_response_format_validation(self):
        """Test that AI responses match the expected enhanced models"""
        print("\n🔍 Testing AI Response Format Validation...")
        
        response = self.make_request('GET', 'ai/predictions')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Validate main response structure
                main_validation_errors = []
                
                # Check predictions array
                predictions = data.get('predictions', [])
                if not isinstance(predictions, list):
                    main_validation_errors.append("predictions should be a list")
                
                # Check trend_analysis object
                trend_analysis = data.get('trend_analysis', {})
                if not isinstance(trend_analysis, dict):
                    main_validation_errors.append("trend_analysis should be an object")
                
                # Check safety_tips array
                safety_tips = data.get('safety_tips', [])
                if not isinstance(safety_tips, list):
                    main_validation_errors.append("safety_tips should be a list")
                
                # Check news_articles_analyzed number
                news_count = data.get('news_articles_analyzed')
                if not isinstance(news_count, int):
                    main_validation_errors.append("news_articles_analyzed should be an integer")
                
                # Check last_updated datetime string
                last_updated = data.get('last_updated')
                if not isinstance(last_updated, str):
                    main_validation_errors.append("last_updated should be a datetime string")
                
                # Validate individual prediction structure
                prediction_validation_errors = []
                if predictions:
                    for i, pred in enumerate(predictions[:3]):  # Check first 3 predictions
                        required_pred_fields = {
                            'id': str,
                            'prediction_text': str,
                            'confidence_level': str,
                            'crime_type': str,
                            'location_area': str,
                            'risk_factors': list,
                            'preventive_measures': list,
                            'data_sources': list,
                            'valid_until': str,
                            'created_at': str
                        }
                        
                        for field, expected_type in required_pred_fields.items():
                            if field not in pred:
                                prediction_validation_errors.append(f"Prediction {i}: missing {field}")
                            elif not isinstance(pred[field], expected_type):
                                prediction_validation_errors.append(f"Prediction {i}: {field} should be {expected_type.__name__}")
                
                # Validate trend analysis structure
                trend_validation_errors = []
                required_trend_fields = {
                    'trend_type': str,
                    'crime_categories': list,
                    'time_period': str,
                    'key_insights': list,
                    'statistical_summary': dict
                }
                
                for field, expected_type in required_trend_fields.items():
                    if field not in trend_analysis:
                        trend_validation_errors.append(f"Trend analysis: missing {field}")
                    elif not isinstance(trend_analysis[field], expected_type):
                        trend_validation_errors.append(f"Trend analysis: {field} should be {expected_type.__name__}")
                
                # Compile all errors
                all_errors = main_validation_errors + prediction_validation_errors + trend_validation_errors
                
                success = len(all_errors) == 0
                
                if success:
                    self.log_test("AI Response Format Validation", True, 
                                f"All fields valid. Predictions: {len(predictions)}, Safety tips: {len(safety_tips)}")
                else:
                    error_summary = "; ".join(all_errors[:3])  # Show first 3 errors
                    if len(all_errors) > 3:
                        error_summary += f" (and {len(all_errors) - 3} more)"
                    self.log_test("AI Response Format Validation", False, error_summary)
                
                return success
                
            except Exception as e:
                self.log_test("AI Response Format Validation", False, f"Validation error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("AI Response Format Validation", False, f"Status: {status}")
            return False

    def test_voice_chatbot_initial_conversation(self):
        """Test voice chatbot initial conversation with 'Hi' message"""
        print("\n🔍 Testing Voice Chatbot - Initial Conversation...")
        
        chat_data = {
            "message": "Hi",
            "language_preference": None,
            "conversation_context": {},
            "session_id": None
        }
        
        response = self.make_request('POST', 'voice', chat_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check required response fields
                required_fields = ['response', 'session_id', 'language_used', 'conversation_context']
                has_required_fields = all(field in data for field in required_fields)
                
                if not has_required_fields:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Voice Chatbot Initial", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Check that response asks for language preference
                response_text = data.get('response', '').lower()
                has_language_prompt = any(word in response_text for word in ['language', 'english', 'tamil'])
                
                # Check quick buttons for language selection
                quick_buttons = data.get('quick_buttons', [])
                has_language_buttons = len(quick_buttons) >= 2
                
                # Check session ID is generated
                session_id = data.get('session_id', '')
                has_session_id = len(session_id) > 0
                
                success = has_required_fields and has_language_prompt and has_language_buttons and has_session_id
                
                self.log_test("Voice Chatbot Initial", success, 
                            f"Session: {session_id[:12]}..., Buttons: {len(quick_buttons)}")
                
                return success
                
            except Exception as e:
                self.log_test("Voice Chatbot Initial", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Voice Chatbot Initial", False, f"Status: {status}")
            return False

    def test_voice_chatbot_language_selection_english(self):
        """Test voice chatbot English language selection"""
        print("\n🔍 Testing Voice Chatbot - English Language Selection...")
        
        chat_data = {
            "message": "English",
            "language_preference": "english",
            "conversation_context": {"language_asked": True},
            "session_id": f"test_session_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request('POST', 'voice', chat_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check language is set to English
                language_used = data.get('language_used', '')
                is_english = language_used == 'english'
                
                # Check response is in English (no Tamil words)
                response_text = data.get('response', '')
                tamil_words = ['da', 'bro', 'anna', 'thangachi', 'pannunga', 'irukum']
                has_tamil = any(word in response_text.lower() for word in tamil_words)
                
                # Check conversation context is updated
                context = data.get('conversation_context', {})
                has_language_context = context.get('language') == 'english'
                
                success = is_english and not has_tamil and has_language_context
                
                self.log_test("Voice Chatbot English", success, 
                            f"Language: {language_used}, Context updated: {has_language_context}")
                
                return success
                
            except Exception as e:
                self.log_test("Voice Chatbot English", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Voice Chatbot English", False, f"Status: {status}")
            return False

    def test_voice_chatbot_language_selection_tamil(self):
        """Test voice chatbot Tamil-English (Tanglish) language selection"""
        print("\n🔍 Testing Voice Chatbot - Tamil-English Language Selection...")
        
        chat_data = {
            "message": "Tamil-English",
            "language_preference": "tamil_english",
            "conversation_context": {"language_asked": True},
            "session_id": f"test_session_tamil_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request('POST', 'voice', chat_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check language is set to Tamil-English
                language_used = data.get('language_used', '')
                is_tamil_english = language_used == 'tamil_english'
                
                # Check conversation context is updated
                context = data.get('conversation_context', {})
                has_language_context = context.get('language') == 'tamil_english'
                
                success = is_tamil_english and has_language_context
                
                self.log_test("Voice Chatbot Tamil-English", success, 
                            f"Language: {language_used}, Context updated: {has_language_context}")
                
                return success
                
            except Exception as e:
                self.log_test("Voice Chatbot Tamil-English", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Voice Chatbot Tamil-English", False, f"Status: {status}")
            return False

    def test_voice_chatbot_theft_intent_detection(self):
        """Test voice chatbot theft intent detection and quick buttons"""
        print("\n🔍 Testing Voice Chatbot - Theft Intent Detection...")
        
        chat_data = {
            "message": "My phone was stolen from the library",
            "language_preference": "english",
            "conversation_context": {"language": "english"},
            "session_id": f"test_theft_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request('POST', 'voice', chat_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check intent detection
                intent_detected = data.get('intent_detected', '')
                is_theft_intent = intent_detected == 'theft_report'
                
                # Check quick buttons for theft scenario
                quick_buttons = data.get('quick_buttons', [])
                has_report_button = any('report' in btn.get('text', '').lower() for btn in quick_buttons)
                has_map_button = any('map' in btn.get('text', '').lower() for btn in quick_buttons)
                
                # Check safety tip is provided
                safety_tip = data.get('safety_tip', '')
                has_safety_tip = len(safety_tip) > 0
                
                # Check response mentions reporting or help
                response_text = data.get('response', '').lower()
                mentions_help = any(word in response_text for word in ['report', 'help', 'police', 'security'])
                
                success = is_theft_intent and has_report_button and has_safety_tip and mentions_help
                
                self.log_test("Voice Chatbot Theft Intent", success, 
                            f"Intent: {intent_detected}, Buttons: {len(quick_buttons)}, Safety tip: {bool(safety_tip)}")
                
                return success
                
            except Exception as e:
                self.log_test("Voice Chatbot Theft Intent", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Voice Chatbot Theft Intent", False, f"Status: {status}")
            return False

    def test_voice_chatbot_emergency_intent_detection(self):
        """Test voice chatbot emergency intent detection"""
        print("\n🔍 Testing Voice Chatbot - Emergency Intent Detection...")
        
        chat_data = {
            "message": "Help! I'm in danger and need urgent assistance",
            "language_preference": "english",
            "conversation_context": {"language": "english"},
            "session_id": f"test_emergency_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request('POST', 'voice', chat_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check intent detection
                intent_detected = data.get('intent_detected', '')
                is_emergency_intent = intent_detected == 'emergency'
                
                # Check quick buttons for emergency scenario
                quick_buttons = data.get('quick_buttons', [])
                has_call_button = any('call' in btn.get('text', '').lower() or '100' in btn.get('text', '') for btn in quick_buttons)
                has_sos_button = any('sos' in btn.get('text', '').lower() for btn in quick_buttons)
                
                # Check response mentions emergency services
                response_text = data.get('response', '').lower()
                mentions_emergency = any(word in response_text for word in ['police', '100', 'emergency', 'call'])
                
                success = is_emergency_intent and (has_call_button or has_sos_button) and mentions_emergency
                
                self.log_test("Voice Chatbot Emergency Intent", success, 
                            f"Intent: {intent_detected}, Emergency buttons: {has_call_button or has_sos_button}")
                
                return success
                
            except Exception as e:
                self.log_test("Voice Chatbot Emergency Intent", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Voice Chatbot Emergency Intent", False, f"Status: {status}")
            return False

    def test_voice_chatbot_map_intent_detection(self):
        """Test voice chatbot map intent detection"""
        print("\n🔍 Testing Voice Chatbot - Map Intent Detection...")
        
        chat_data = {
            "message": "Can you show me the crime map for campus areas?",
            "language_preference": "english",
            "conversation_context": {"language": "english"},
            "session_id": f"test_map_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request('POST', 'voice', chat_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check intent detection
                intent_detected = data.get('intent_detected', '')
                is_map_intent = intent_detected == 'map_help'
                
                # Check quick buttons for map scenario
                quick_buttons = data.get('quick_buttons', [])
                has_map_button = any('map' in btn.get('text', '').lower() for btn in quick_buttons)
                
                # Check button action for navigation
                map_button_action = None
                for btn in quick_buttons:
                    if 'map' in btn.get('text', '').lower():
                        map_button_action = btn.get('action', '')
                        break
                
                has_navigate_action = map_button_action in ['navigate', 'confirm_navigate']
                
                success = is_map_intent and has_map_button and has_navigate_action
                
                self.log_test("Voice Chatbot Map Intent", success, 
                            f"Intent: {intent_detected}, Map button: {has_map_button}, Action: {map_button_action}")
                
                return success
                
            except Exception as e:
                self.log_test("Voice Chatbot Map Intent", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Voice Chatbot Map Intent", False, f"Status: {status}")
            return False

    def test_voice_chatbot_session_management(self):
        """Test voice chatbot session management and context persistence"""
        print("\n🔍 Testing Voice Chatbot - Session Management...")
        
        # First message to establish session
        session_id = f"test_session_mgmt_{datetime.now().strftime('%H%M%S')}"
        
        chat_data_1 = {
            "message": "Hi there",
            "language_preference": "english",
            "conversation_context": {},
            "session_id": session_id
        }
        
        response_1 = self.make_request('POST', 'voice', chat_data_1)
        
        if not response_1 or response_1.status_code != 200:
            self.log_test("Voice Chatbot Session Management", False, "First message failed")
            return False
        
        try:
            data_1 = response_1.json()
            context_1 = data_1.get('conversation_context', {})
            
            # Second message using same session
            chat_data_2 = {
                "message": "I need help with reporting",
                "language_preference": "english",
                "conversation_context": context_1,
                "session_id": session_id
            }
            
            response_2 = self.make_request('POST', 'voice', chat_data_2)
            
            if response_2 and response_2.status_code == 200:
                data_2 = response_2.json()
                
                # Check session ID consistency
                session_id_1 = data_1.get('session_id', '')
                session_id_2 = data_2.get('session_id', '')
                session_consistent = session_id_1 == session_id_2 == session_id
                
                # Check context persistence and updates
                context_2 = data_2.get('conversation_context', {})
                interaction_count = context_2.get('interaction_count', 0)
                context_updated = interaction_count > context_1.get('interaction_count', 0)
                
                success = session_consistent and context_updated
                
                self.log_test("Voice Chatbot Session Management", success, 
                            f"Session consistent: {session_consistent}, Context updated: {context_updated}")
                
                return success
            else:
                self.log_test("Voice Chatbot Session Management", False, "Second message failed")
                return False
                
        except Exception as e:
            self.log_test("Voice Chatbot Session Management", False, f"JSON error: {str(e)}")
            return False

    def test_voice_chatbot_invalid_request_handling(self):
        """Test voice chatbot error handling for invalid requests"""
        print("\n🔍 Testing Voice Chatbot - Invalid Request Handling...")
        
        # Test with missing message field
        invalid_data = {
            "language_preference": "english",
            "conversation_context": {},
            "session_id": "test_invalid"
        }
        
        response = self.make_request('POST', 'voice', invalid_data)
        
        # Should return 422 for validation error
        if response and response.status_code == 422:
            try:
                data = response.json()
                has_validation_error = 'detail' in data
                self.log_test("Voice Chatbot Invalid Request", True, 
                            f"Correctly rejected invalid request: {response.status_code}")
                return True
            except:
                self.log_test("Voice Chatbot Invalid Request", False, "Invalid JSON in error response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Voice Chatbot Invalid Request", False, f"Expected 422, got: {status}")
            return False

    def test_voice_chatbot_fallback_behavior(self):
        """Test voice chatbot fallback behavior when LLM might fail"""
        print("\n🔍 Testing Voice Chatbot - Fallback Behavior...")
        
        # Test with a very long message that might cause issues
        long_message = "Help me " * 100  # Very long repetitive message
        
        chat_data = {
            "message": long_message,
            "language_preference": "english",
            "conversation_context": {"language": "english"},
            "session_id": f"test_fallback_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request('POST', 'voice', chat_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check that we get a valid response even if LLM fails
                has_response = 'response' in data and len(data['response']) > 0
                has_session_id = 'session_id' in data and len(data['session_id']) > 0
                has_language = 'language_used' in data
                
                # Check if it's a fallback response
                response_text = data.get('response', '').lower()
                is_fallback = any(word in response_text for word in ['trouble', 'problem', 'emergency', 'sorry'])
                
                # Should have emergency buttons in fallback
                quick_buttons = data.get('quick_buttons', [])
                has_emergency_buttons = len(quick_buttons) > 0
                
                success = has_response and has_session_id and has_language
                
                self.log_test("Voice Chatbot Fallback", success, 
                            f"Fallback response: {is_fallback}, Emergency buttons: {len(quick_buttons)}")
                
                return success
                
            except Exception as e:
                self.log_test("Voice Chatbot Fallback", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Voice Chatbot Fallback", False, f"Status: {status}")
            return False

    def test_voice_chatbot_quick_buttons_structure(self):
        """Test voice chatbot quick buttons structure and actions"""
        print("\n🔍 Testing Voice Chatbot - Quick Buttons Structure...")
        
        chat_data = {
            "message": "I want to report a theft incident",
            "language_preference": "english",
            "conversation_context": {"language": "english"},
            "session_id": f"test_buttons_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request('POST', 'voice', chat_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                quick_buttons = data.get('quick_buttons', [])
                
                if not quick_buttons:
                    self.log_test("Voice Chatbot Quick Buttons", False, "No quick buttons provided")
                    return False
                
                # Check button structure
                valid_buttons = 0
                for button in quick_buttons:
                    has_text = 'text' in button and len(button['text']) > 0
                    has_action = 'action' in button and button['action'] in ['navigate', 'confirm_navigate', 'call', 'retry', 'select_language']
                    
                    if has_text and has_action:
                        valid_buttons += 1
                
                # Check for app-aware actions
                has_navigate_action = any(btn.get('action') in ['navigate', 'confirm_navigate'] for btn in quick_buttons)
                has_value_field = any('value' in btn for btn in quick_buttons)
                
                success = valid_buttons == len(quick_buttons) and has_navigate_action
                
                self.log_test("Voice Chatbot Quick Buttons", success, 
                            f"Valid buttons: {valid_buttons}/{len(quick_buttons)}, Navigate actions: {has_navigate_action}")
                
                return success
                
            except Exception as e:
                self.log_test("Voice Chatbot Quick Buttons", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Voice Chatbot Quick Buttons", False, f"Status: {status}")
            return False

    def test_voice_chatbot_safety_tips(self):
        """Test voice chatbot safety tips generation"""
        print("\n🔍 Testing Voice Chatbot - Safety Tips Generation...")
        
        chat_data = {
            "message": "What should I do to stay safe on campus?",
            "language_preference": "english",
            "conversation_context": {"language": "english"},
            "session_id": f"test_safety_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request('POST', 'voice', chat_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                
                # Check safety tip is provided
                safety_tip = data.get('safety_tip', '')
                has_safety_tip = len(safety_tip) > 0
                
                # Check safety tip format (should have emoji and helpful content)
                has_emoji = any(char in safety_tip for char in ['💡', '🔒', '🗺️', '🚨', '💪'])
                has_helpful_content = any(word in safety_tip.lower() for word in ['safe', 'security', 'emergency', 'contact', 'group'])
                
                # Check response also contains safety advice
                response_text = data.get('response', '').lower()
                response_has_safety = any(word in response_text for word in ['safe', 'security', 'careful', 'aware'])
                
                success = has_safety_tip and has_emoji and has_helpful_content
                
                self.log_test("Voice Chatbot Safety Tips", success, 
                            f"Safety tip: {bool(safety_tip)}, Emoji: {has_emoji}, Helpful: {has_helpful_content}")
                
                return success
                
            except Exception as e:
                self.log_test("Voice Chatbot Safety Tips", False, f"JSON error: {str(e)}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Voice Chatbot Safety Tips", False, f"Status: {status}")
            return False

    def test_voice_chatbot_general_conversation_no_buttons(self):
        """Test that general conversations have NO action buttons"""
        print("\n🔍 Testing Voice Chatbot - General Conversations (No Action Buttons)...")
        
        general_messages = [
            "Hello, how are you?",
            "Good morning",
            "Thank you for your help",
            "What's the weather like?",
            "Nice to meet you",
            "How's your day going?"
        ]
        
        passed_tests = 0
        total_tests = len(general_messages)
        
        for i, message in enumerate(general_messages):
            chat_data = {
                "message": message,
                "language_preference": "english",
                "conversation_context": {"language": "english"},
                "session_id": f"test_general_{i}_{datetime.now().strftime('%H%M%S')}"
            }
            
            response = self.make_request('POST', 'voice', chat_data)
            
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Check that NO action buttons are provided for general conversation
                    quick_buttons = data.get('quick_buttons', [])
                    has_no_action_buttons = len(quick_buttons) == 0
                    
                    # Check intent is general
                    intent_detected = data.get('intent_detected', '')
                    is_general_intent = intent_detected == 'general'
                    
                    if has_no_action_buttons and is_general_intent:
                        passed_tests += 1
                        print(f"  ✅ '{message[:30]}...' - No action buttons (correct)")
                    else:
                        print(f"  ❌ '{message[:30]}...' - Has {len(quick_buttons)} buttons, intent: {intent_detected}")
                        
                except Exception as e:
                    print(f"  ❌ '{message[:30]}...' - JSON error: {str(e)}")
            else:
                status = response.status_code if response else "No response"
                print(f"  ❌ '{message[:30]}...' - Status: {status}")
        
        success = passed_tests == total_tests
        self.log_test("Voice Chatbot General Conversations (No Buttons)", success, 
                    f"Passed: {passed_tests}/{total_tests} general conversation tests")
        
        return success

    def test_voice_chatbot_report_specific_buttons(self):
        """Test that report-specific requests show [Report Incident] button"""
        print("\n🔍 Testing Voice Chatbot - Report-Specific Requests (Report Button)...")
        
        report_messages = [
            "I want to report an incident",
            "Need to report something",
            "File a report",
            "I need to report a crime",
            "How do I report an incident?"
        ]
        
        passed_tests = 0
        total_tests = len(report_messages)
        
        for i, message in enumerate(report_messages):
            chat_data = {
                "message": message,
                "language_preference": "english",
                "conversation_context": {"language": "english"},
                "session_id": f"test_report_{i}_{datetime.now().strftime('%H%M%S')}"
            }
            
            response = self.make_request('POST', 'voice', chat_data)
            
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Check for Report Incident button
                    quick_buttons = data.get('quick_buttons', [])
                    has_report_button = any('report' in btn.get('text', '').lower() and 'incident' in btn.get('text', '').lower() 
                                          for btn in quick_buttons)
                    
                    # Check intent is report_help
                    intent_detected = data.get('intent_detected', '')
                    is_report_intent = intent_detected == 'report_help'
                    
                    # Check button has correct action
                    report_button_action = None
                    for btn in quick_buttons:
                        if 'report' in btn.get('text', '').lower() and 'incident' in btn.get('text', '').lower():
                            report_button_action = btn.get('action', '')
                            break
                    
                    has_correct_action = report_button_action == 'confirm_navigate'
                    
                    if has_report_button and is_report_intent and has_correct_action:
                        passed_tests += 1
                        print(f"  ✅ '{message[:30]}...' - Has Report Incident button")
                    else:
                        print(f"  ❌ '{message[:30]}...' - Report button: {has_report_button}, Intent: {intent_detected}, Action: {report_button_action}")
                        
                except Exception as e:
                    print(f"  ❌ '{message[:30]}...' - JSON error: {str(e)}")
            else:
                status = response.status_code if response else "No response"
                print(f"  ❌ '{message[:30]}...' - Status: {status}")
        
        success = passed_tests == total_tests
        self.log_test("Voice Chatbot Report-Specific Requests", success, 
                    f"Passed: {passed_tests}/{total_tests} report-specific tests")
        
        return success

    def test_voice_chatbot_map_specific_buttons(self):
        """Test that map-specific requests show [View Map] button"""
        print("\n🔍 Testing Voice Chatbot - Map-Specific Requests (View Map Button)...")
        
        map_messages = [
            "Show me the map",
            "View map",
            "Check the crime map",
            "I want to see the map",
            "Can you show me the crime locations?"
        ]
        
        passed_tests = 0
        total_tests = len(map_messages)
        
        for i, message in enumerate(map_messages):
            chat_data = {
                "message": message,
                "language_preference": "english",
                "conversation_context": {"language": "english"},
                "session_id": f"test_map_{i}_{datetime.now().strftime('%H%M%S')}"
            }
            
            response = self.make_request('POST', 'voice', chat_data)
            
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Check for View Map button
                    quick_buttons = data.get('quick_buttons', [])
                    has_map_button = any('view' in btn.get('text', '').lower() and 'map' in btn.get('text', '').lower() 
                                       for btn in quick_buttons)
                    
                    # Check intent is map_help
                    intent_detected = data.get('intent_detected', '')
                    is_map_intent = intent_detected == 'map_help'
                    
                    # Check button has correct action
                    map_button_action = None
                    for btn in quick_buttons:
                        if 'map' in btn.get('text', '').lower():
                            map_button_action = btn.get('action', '')
                            break
                    
                    has_correct_action = map_button_action == 'confirm_navigate'
                    
                    if has_map_button and is_map_intent and has_correct_action:
                        passed_tests += 1
                        print(f"  ✅ '{message[:30]}...' - Has View Map button")
                    else:
                        print(f"  ❌ '{message[:30]}...' - Map button: {has_map_button}, Intent: {intent_detected}, Action: {map_button_action}")
                        
                except Exception as e:
                    print(f"  ❌ '{message[:30]}...' - JSON error: {str(e)}")
            else:
                status = response.status_code if response else "No response"
                print(f"  ❌ '{message[:30]}...' - Status: {status}")
        
        success = passed_tests == total_tests
        self.log_test("Voice Chatbot Map-Specific Requests", success, 
                    f"Passed: {passed_tests}/{total_tests} map-specific tests")
        
        return success

    def test_voice_chatbot_sos_specific_buttons(self):
        """Test that SOS/Help requests show [SOS/Helplines] button"""
        print("\n🔍 Testing Voice Chatbot - SOS/Help Requests (SOS/Helplines Button)...")
        
        sos_messages = [
            "I need helplines",
            "SOS",
            "Need emergency numbers",
            "Show me emergency contacts",
            "I need help numbers"
        ]
        
        passed_tests = 0
        total_tests = len(sos_messages)
        
        for i, message in enumerate(sos_messages):
            chat_data = {
                "message": message,
                "language_preference": "english",
                "conversation_context": {"language": "english"},
                "session_id": f"test_sos_{i}_{datetime.now().strftime('%H%M%S')}"
            }
            
            response = self.make_request('POST', 'voice', chat_data)
            
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Check for SOS/Helplines button
                    quick_buttons = data.get('quick_buttons', [])
                    has_sos_button = any(('sos' in btn.get('text', '').lower() and 'helplines' in btn.get('text', '').lower()) or
                                       'sos' in btn.get('text', '').lower() or 'helplines' in btn.get('text', '').lower()
                                       for btn in quick_buttons)
                    
                    # Check intent is sos_help
                    intent_detected = data.get('intent_detected', '')
                    is_sos_intent = intent_detected == 'sos_help'
                    
                    # Check button has correct action
                    sos_button_action = None
                    for btn in quick_buttons:
                        if 'sos' in btn.get('text', '').lower() or 'helplines' in btn.get('text', '').lower():
                            sos_button_action = btn.get('action', '')
                            break
                    
                    has_correct_action = sos_button_action == 'confirm_navigate'
                    
                    if has_sos_button and is_sos_intent and has_correct_action:
                        passed_tests += 1
                        print(f"  ✅ '{message[:30]}...' - Has SOS/Helplines button")
                    else:
                        print(f"  ❌ '{message[:30]}...' - SOS button: {has_sos_button}, Intent: {intent_detected}, Action: {sos_button_action}")
                        
                except Exception as e:
                    print(f"  ❌ '{message[:30]}...' - JSON error: {str(e)}")
            else:
                status = response.status_code if response else "No response"
                print(f"  ❌ '{message[:30]}...' - Status: {status}")
        
        success = passed_tests == total_tests
        self.log_test("Voice Chatbot SOS/Help Requests", success, 
                    f"Passed: {passed_tests}/{total_tests} SOS/help-specific tests")
        
        return success

    def test_voice_chatbot_enhanced_intent_detection(self):
        """Test enhanced intent detection logic comprehensively"""
        print("\n🔍 Testing Voice Chatbot - Enhanced Intent Detection Logic...")
        
        test_cases = [
            # General conversations - should have NO buttons
            {"message": "Hello there", "expected_intent": "general", "expected_buttons": 0},
            {"message": "How are you doing?", "expected_intent": "general", "expected_buttons": 0},
            {"message": "Thanks for the help", "expected_intent": "general", "expected_buttons": 0},
            
            # Report-specific - should have Report button
            {"message": "I want to report an incident", "expected_intent": "report_help", "expected_button_text": "report incident"},
            {"message": "Need to file a report", "expected_intent": "report_help", "expected_button_text": "report incident"},
            
            # Map-specific - should have View Map button  
            {"message": "Show me the crime map", "expected_intent": "map_help", "expected_button_text": "view map"},
            {"message": "Check the map", "expected_intent": "map_help", "expected_button_text": "view map"},
            
            # SOS-specific - should have SOS/Helplines button
            {"message": "I need helplines", "expected_intent": "sos_help", "expected_button_text": "sos"},
            {"message": "SOS emergency numbers", "expected_intent": "sos_help", "expected_button_text": "sos"},
        ]
        
        passed_tests = 0
        total_tests = len(test_cases)
        
        for i, test_case in enumerate(test_cases):
            chat_data = {
                "message": test_case["message"],
                "language_preference": "english",
                "conversation_context": {"language": "english"},
                "session_id": f"test_enhanced_{i}_{datetime.now().strftime('%H%M%S')}"
            }
            
            response = self.make_request('POST', 'voice', chat_data)
            
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Check intent detection
                    intent_detected = data.get('intent_detected', '')
                    intent_correct = intent_detected == test_case["expected_intent"]
                    
                    # Check button expectations
                    quick_buttons = data.get('quick_buttons', [])
                    
                    if "expected_buttons" in test_case:
                        # Test for specific number of buttons (usually 0 for general)
                        buttons_correct = len(quick_buttons) == test_case["expected_buttons"]
                        test_passed = intent_correct and buttons_correct
                        
                        if test_passed:
                            passed_tests += 1
                            print(f"  ✅ '{test_case['message'][:25]}...' - Intent: {intent_detected}, Buttons: {len(quick_buttons)}")
                        else:
                            print(f"  ❌ '{test_case['message'][:25]}...' - Expected intent: {test_case['expected_intent']}, got: {intent_detected}, Expected buttons: {test_case['expected_buttons']}, got: {len(quick_buttons)}")
                    
                    elif "expected_button_text" in test_case:
                        # Test for specific button text
                        expected_text = test_case["expected_button_text"].lower()
                        has_expected_button = any(expected_text in btn.get('text', '').lower() for btn in quick_buttons)
                        test_passed = intent_correct and has_expected_button
                        
                        if test_passed:
                            passed_tests += 1
                            print(f"  ✅ '{test_case['message'][:25]}...' - Intent: {intent_detected}, Has '{expected_text}' button")
                        else:
                            button_texts = [btn.get('text', '') for btn in quick_buttons]
                            print(f"  ❌ '{test_case['message'][:25]}...' - Expected intent: {test_case['expected_intent']}, got: {intent_detected}, Expected button with '{expected_text}', got buttons: {button_texts}")
                        
                except Exception as e:
                    print(f"  ❌ '{test_case['message'][:25]}...' - JSON error: {str(e)}")
            else:
                status = response.status_code if response else "No response"
                print(f"  ❌ '{test_case['message'][:25]}...' - Status: {status}")
        
        success = passed_tests == total_tests
        self.log_test("Voice Chatbot Enhanced Intent Detection", success, 
                    f"Passed: {passed_tests}/{total_tests} enhanced intent detection tests")
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Campus Safety API Tests...")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_root_endpoint,
            self.test_user_signup,
            self.test_user_signup_with_trusted_contacts,
            self.test_user_login_email,
            self.test_user_login_roll,
            self.test_get_trusted_contacts,
            self.test_get_user_profile,  # NEW
            self.test_update_trusted_contacts,  # NEW
            self.test_update_trusted_contacts_validation,  # NEW
            self.test_crime_report,
            self.test_get_crimes,
            self.test_get_recent_crimes,
            self.test_get_map_data,
            self.test_sos_alert,
            self.test_get_sos_alerts,
            # AI Crime Prediction Tests - NEW COMPREHENSIVE SUITE
            self.test_ai_predictions,
            self.test_ai_news_articles,
            self.test_ai_refresh_analysis_without_auth,
            self.test_ai_refresh_analysis_with_auth,
            self.test_ai_predictions_fallback_behavior,
            self.test_ai_crime_filtering_accuracy,
            self.test_ai_response_format_validation,
            # Voice Chatbot Tests - NEW COMPREHENSIVE SUITE
            self.test_voice_chatbot_initial_conversation,
            self.test_voice_chatbot_language_selection_english,
            self.test_voice_chatbot_language_selection_tamil,
            self.test_voice_chatbot_theft_intent_detection,
            self.test_voice_chatbot_emergency_intent_detection,
            self.test_voice_chatbot_map_intent_detection,
            self.test_voice_chatbot_session_management,
            self.test_voice_chatbot_invalid_request_handling,
            self.test_voice_chatbot_fallback_behavior,
            self.test_voice_chatbot_quick_buttons_structure,
            self.test_voice_chatbot_safety_tips,
            # NEW: Enhanced Action Button Logic Tests (Focus of this review)
            self.test_voice_chatbot_general_conversation_no_buttons,
            self.test_voice_chatbot_report_specific_buttons,
            self.test_voice_chatbot_map_specific_buttons,
            self.test_voice_chatbot_sos_specific_buttons,
            self.test_voice_chatbot_enhanced_intent_detection
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ {test.__name__} - EXCEPTION: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 API Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All API tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = CampusSafetyAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
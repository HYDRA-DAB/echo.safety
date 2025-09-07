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
            self.test_ai_response_format_validation
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
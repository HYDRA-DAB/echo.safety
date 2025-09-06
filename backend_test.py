import requests
import sys
import json
from datetime import datetime
import uuid

class CampusSafetyAPITester:
    def __init__(self, base_url="https://campus-safety.preview.emergentagent.com/api"):
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
        """Test AI predictions endpoint"""
        print("\n🔍 Testing AI Predictions...")
        
        response = self.make_request('GET', 'ai/predictions')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                success = 'predictions' in data and isinstance(data['predictions'], list)
                predictions_count = len(data.get('predictions', []))
                self.log_test("AI Predictions", success, f"Found {predictions_count} predictions")
                
                # Verify prediction structure
                if success and predictions_count > 0:
                    first_prediction = data['predictions'][0]
                    required_fields = ['id', 'prediction_text', 'confidence_level', 'crime_type', 'location_area']
                    has_all_fields = all(field in first_prediction for field in required_fields)
                    if not has_all_fields:
                        print("⚠️  Warning: Prediction missing required fields")
                
                return success
            except:
                self.log_test("AI Predictions", False, "Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("AI Predictions", False, f"Status: {status}")
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
            self.test_crime_report,
            self.test_get_crimes,
            self.test_get_recent_crimes,
            self.test_get_map_data,
            self.test_sos_alert,
            self.test_get_sos_alerts,
            self.test_ai_predictions
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
#!/usr/bin/env python3
"""
Focused Voice Chatbot API Testing
Tests the /api/voice endpoint comprehensively
"""

import requests
import json
from datetime import datetime

class VoiceChatbotTester:
    def __init__(self, base_url="https://echo-crime-alert.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if details:
                print(f"   📋 {details}")
        else:
            print(f"❌ {name} - FAILED: {details}")

    def make_request(self, data):
        """Make POST request to voice endpoint"""
        url = f"{self.base_url}/voice"
        headers = {'Content-Type': 'application/json'}
        
        try:
            response = requests.post(url, json=data, headers=headers, timeout=15)
            return response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None

    def test_initial_greeting(self):
        """Test initial greeting without language preference"""
        print("\n🔍 Testing Initial Greeting...")
        
        data = {
            "message": "Hi"
        }
        
        response = self.make_request(data)
        
        if response and response.status_code == 200:
            try:
                result = response.json()
                
                # Check required fields
                required_fields = ['response', 'session_id', 'language_used', 'conversation_context']
                missing_fields = [f for f in required_fields if f not in result]
                
                if missing_fields:
                    self.log_test("Initial Greeting", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Check language selection prompt
                response_text = result['response'].lower()
                has_language_prompt = 'language' in response_text or 'english' in response_text or 'tamil' in response_text
                
                # Check quick buttons
                quick_buttons = result.get('quick_buttons', [])
                has_language_buttons = len(quick_buttons) >= 2
                
                # Check session ID generation
                session_id = result['session_id']
                has_valid_session = len(session_id) > 10
                
                success = has_language_prompt and has_language_buttons and has_valid_session
                
                details = f"Session: {session_id[:15]}..., Buttons: {len(quick_buttons)}, Language prompt: {has_language_prompt}"
                self.log_test("Initial Greeting", success, details)
                
                return success, result
                
            except Exception as e:
                self.log_test("Initial Greeting", False, f"JSON parsing error: {str(e)}")
                return False, None
        else:
            status = response.status_code if response else "No response"
            self.log_test("Initial Greeting", False, f"HTTP Status: {status}")
            return False, None

    def test_english_selection(self):
        """Test English language selection"""
        print("\n🔍 Testing English Language Selection...")
        
        data = {
            "message": "English",
            "language_preference": "english",
            "conversation_context": {"language_asked": True},
            "session_id": f"test_en_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request(data)
        
        if response and response.status_code == 200:
            try:
                result = response.json()
                
                # Check language is set correctly
                language_used = result.get('language_used', '')
                is_english = language_used == 'english'
                
                # Check context is updated
                context = result.get('conversation_context', {})
                context_language = context.get('language', '')
                context_updated = context_language == 'english'
                
                # Check response doesn't contain Tamil words
                response_text = result.get('response', '').lower()
                tamil_words = ['da', 'bro', 'anna', 'pannunga', 'irukum', 'naan']
                has_tamil = any(word in response_text for word in tamil_words)
                
                success = is_english and context_updated and not has_tamil
                
                details = f"Language: {language_used}, Context: {context_language}, Tamil words: {has_tamil}"
                self.log_test("English Selection", success, details)
                
                return success, result
                
            except Exception as e:
                self.log_test("English Selection", False, f"JSON parsing error: {str(e)}")
                return False, None
        else:
            status = response.status_code if response else "No response"
            self.log_test("English Selection", False, f"HTTP Status: {status}")
            return False, None

    def test_tamil_selection(self):
        """Test Tamil-English language selection"""
        print("\n🔍 Testing Tamil-English Language Selection...")
        
        data = {
            "message": "Tamil-English",
            "language_preference": "tamil_english",
            "conversation_context": {"language_asked": True},
            "session_id": f"test_ta_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request(data)
        
        if response and response.status_code == 200:
            try:
                result = response.json()
                
                # Check language is set correctly
                language_used = result.get('language_used', '')
                is_tamil_english = language_used == 'tamil_english'
                
                # Check context is updated
                context = result.get('conversation_context', {})
                context_language = context.get('language', '')
                context_updated = context_language == 'tamil_english'
                
                success = is_tamil_english and context_updated
                
                details = f"Language: {language_used}, Context: {context_language}"
                self.log_test("Tamil-English Selection", success, details)
                
                return success, result
                
            except Exception as e:
                self.log_test("Tamil-English Selection", False, f"JSON parsing error: {str(e)}")
                return False, None
        else:
            status = response.status_code if response else "No response"
            self.log_test("Tamil-English Selection", False, f"HTTP Status: {status}")
            return False, None

    def test_theft_intent(self):
        """Test theft intent detection"""
        print("\n🔍 Testing Theft Intent Detection...")
        
        data = {
            "message": "Someone stole my laptop from the library",
            "language_preference": "english",
            "conversation_context": {"language": "english"},
            "session_id": f"test_theft_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request(data)
        
        if response and response.status_code == 200:
            try:
                result = response.json()
                
                # Check intent detection
                intent = result.get('intent_detected', '')
                is_theft_intent = intent == 'theft_report'
                
                # Check quick buttons
                quick_buttons = result.get('quick_buttons', [])
                button_texts = [btn.get('text', '').lower() for btn in quick_buttons]
                has_report_button = any('report' in text for text in button_texts)
                has_map_button = any('map' in text for text in button_texts)
                
                # Check safety tip
                safety_tip = result.get('safety_tip', '')
                has_safety_tip = len(safety_tip) > 0
                
                # Check response mentions help
                response_text = result.get('response', '').lower()
                mentions_help = any(word in response_text for word in ['report', 'help', 'police', 'security'])
                
                success = is_theft_intent and has_report_button and has_safety_tip
                
                details = f"Intent: {intent}, Report button: {has_report_button}, Safety tip: {bool(safety_tip)}"
                self.log_test("Theft Intent Detection", success, details)
                
                return success, result
                
            except Exception as e:
                self.log_test("Theft Intent Detection", False, f"JSON parsing error: {str(e)}")
                return False, None
        else:
            status = response.status_code if response else "No response"
            self.log_test("Theft Intent Detection", False, f"HTTP Status: {status}")
            return False, None

    def test_emergency_intent(self):
        """Test emergency intent detection"""
        print("\n🔍 Testing Emergency Intent Detection...")
        
        data = {
            "message": "Help! I'm in danger and need urgent help",
            "language_preference": "english",
            "conversation_context": {"language": "english"},
            "session_id": f"test_emergency_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request(data)
        
        if response and response.status_code == 200:
            try:
                result = response.json()
                
                # Check intent detection
                intent = result.get('intent_detected', '')
                is_emergency_intent = intent == 'emergency'
                
                # Check quick buttons for emergency actions
                quick_buttons = result.get('quick_buttons', [])
                button_texts = [btn.get('text', '').lower() for btn in quick_buttons]
                has_call_button = any('call' in text or '100' in text for text in button_texts)
                has_sos_button = any('sos' in text for text in button_texts)
                
                # Check response mentions emergency services
                response_text = result.get('response', '').lower()
                mentions_emergency = any(word in response_text for word in ['police', '100', 'emergency', 'call'])
                
                success = is_emergency_intent and (has_call_button or has_sos_button) and mentions_emergency
                
                details = f"Intent: {intent}, Emergency buttons: {has_call_button or has_sos_button}, Mentions emergency: {mentions_emergency}"
                self.log_test("Emergency Intent Detection", success, details)
                
                return success, result
                
            except Exception as e:
                self.log_test("Emergency Intent Detection", False, f"JSON parsing error: {str(e)}")
                return False, None
        else:
            status = response.status_code if response else "No response"
            self.log_test("Emergency Intent Detection", False, f"HTTP Status: {status}")
            return False, None

    def test_session_persistence(self):
        """Test session management and context persistence"""
        print("\n🔍 Testing Session Persistence...")
        
        session_id = f"test_session_{datetime.now().strftime('%H%M%S')}"
        
        # First message
        data1 = {
            "message": "Hi",
            "language_preference": "english",
            "conversation_context": {},
            "session_id": session_id
        }
        
        response1 = self.make_request(data1)
        
        if not response1 or response1.status_code != 200:
            self.log_test("Session Persistence", False, "First message failed")
            return False, None
        
        try:
            result1 = response1.json()
            context1 = result1.get('conversation_context', {})
            
            # Second message with same session
            data2 = {
                "message": "I need help with reporting",
                "language_preference": "english",
                "conversation_context": context1,
                "session_id": session_id
            }
            
            response2 = self.make_request(data2)
            
            if response2 and response2.status_code == 200:
                result2 = response2.json()
                
                # Check session consistency
                session1 = result1.get('session_id', '')
                session2 = result2.get('session_id', '')
                session_consistent = session1 == session2 == session_id
                
                # Check context evolution
                context2 = result2.get('conversation_context', {})
                interaction_count = context2.get('interaction_count', 0)
                context_evolved = interaction_count > context1.get('interaction_count', 0)
                
                success = session_consistent and context_evolved
                
                details = f"Session consistent: {session_consistent}, Context evolved: {context_evolved}, Interactions: {interaction_count}"
                self.log_test("Session Persistence", success, details)
                
                return success, result2
            else:
                self.log_test("Session Persistence", False, "Second message failed")
                return False, None
                
        except Exception as e:
            self.log_test("Session Persistence", False, f"JSON parsing error: {str(e)}")
            return False, None

    def test_quick_buttons_structure(self):
        """Test quick buttons structure and navigation actions"""
        print("\n🔍 Testing Quick Buttons Structure...")
        
        data = {
            "message": "I want to report a crime",
            "language_preference": "english",
            "conversation_context": {"language": "english"},
            "session_id": f"test_buttons_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request(data)
        
        if response and response.status_code == 200:
            try:
                result = response.json()
                
                quick_buttons = result.get('quick_buttons', [])
                
                if not quick_buttons:
                    self.log_test("Quick Buttons Structure", False, "No quick buttons provided")
                    return False, None
                
                # Validate button structure
                valid_buttons = 0
                navigation_buttons = 0
                
                for i, button in enumerate(quick_buttons):
                    has_text = 'text' in button and len(button['text']) > 0
                    has_action = 'action' in button
                    
                    if has_text and has_action:
                        valid_buttons += 1
                        
                        # Check for navigation actions
                        action = button.get('action', '')
                        if action in ['navigate', 'confirm_navigate']:
                            navigation_buttons += 1
                            # Should have value for navigation
                            has_value = 'value' in button
                            if not has_value:
                                print(f"   ⚠️  Navigation button {i} missing 'value' field")
                
                all_valid = valid_buttons == len(quick_buttons)
                has_navigation = navigation_buttons > 0
                
                success = all_valid and has_navigation
                
                details = f"Valid buttons: {valid_buttons}/{len(quick_buttons)}, Navigation buttons: {navigation_buttons}"
                self.log_test("Quick Buttons Structure", success, details)
                
                return success, result
                
            except Exception as e:
                self.log_test("Quick Buttons Structure", False, f"JSON parsing error: {str(e)}")
                return False, None
        else:
            status = response.status_code if response else "No response"
            self.log_test("Quick Buttons Structure", False, f"HTTP Status: {status}")
            return False, None

    def test_safety_tips(self):
        """Test safety tips generation"""
        print("\n🔍 Testing Safety Tips Generation...")
        
        data = {
            "message": "How can I stay safe on campus?",
            "language_preference": "english",
            "conversation_context": {"language": "english"},
            "session_id": f"test_safety_{datetime.now().strftime('%H%M%S')}"
        }
        
        response = self.make_request(data)
        
        if response and response.status_code == 200:
            try:
                result = response.json()
                
                # Check safety tip exists
                safety_tip = result.get('safety_tip', '')
                has_safety_tip = len(safety_tip) > 0
                
                # Check for emoji (indicates proper formatting)
                emojis = ['💡', '🔒', '🗺️', '🚨', '💪']
                has_emoji = any(emoji in safety_tip for emoji in emojis)
                
                # Check for safety-related content
                safety_keywords = ['safe', 'security', 'emergency', 'contact', 'group', 'travel', 'report']
                has_safety_content = any(keyword in safety_tip.lower() for keyword in safety_keywords)
                
                success = has_safety_tip and has_emoji and has_safety_content
                
                details = f"Has tip: {has_safety_tip}, Has emoji: {has_emoji}, Safety content: {has_safety_content}"
                if has_safety_tip:
                    details += f"\n   💡 Tip: {safety_tip[:60]}..."
                
                self.log_test("Safety Tips Generation", success, details)
                
                return success, result
                
            except Exception as e:
                self.log_test("Safety Tips Generation", False, f"JSON parsing error: {str(e)}")
                return False, None
        else:
            status = response.status_code if response else "No response"
            self.log_test("Safety Tips Generation", False, f"HTTP Status: {status}")
            return False, None

    def test_invalid_request(self):
        """Test error handling for invalid requests"""
        print("\n🔍 Testing Invalid Request Handling...")
        
        # Missing required 'message' field
        data = {
            "language_preference": "english",
            "conversation_context": {},
            "session_id": "test_invalid"
        }
        
        response = self.make_request(data)
        
        # Should return 422 for validation error
        if response and response.status_code == 422:
            try:
                result = response.json()
                has_error_detail = 'detail' in result
                
                self.log_test("Invalid Request Handling", True, f"Correctly rejected with 422: {has_error_detail}")
                return True, result
            except:
                self.log_test("Invalid Request Handling", False, "Invalid JSON in error response")
                return False, None
        else:
            status = response.status_code if response else "No response"
            self.log_test("Invalid Request Handling", False, f"Expected 422, got: {status}")
            return False, None

    def run_comprehensive_test(self):
        """Run all voice chatbot tests"""
        print("🎤 Voice Chatbot Comprehensive Testing")
        print("=" * 50)
        
        tests = [
            self.test_initial_greeting,
            self.test_english_selection,
            self.test_tamil_selection,
            self.test_theft_intent,
            self.test_emergency_intent,
            self.test_session_persistence,
            self.test_quick_buttons_structure,
            self.test_safety_tips,
            self.test_invalid_request
        ]
        
        results = []
        
        for test in tests:
            try:
                success, result = test()
                results.append((test.__name__, success, result))
            except Exception as e:
                print(f"❌ {test.__name__} - EXCEPTION: {str(e)}")
                results.append((test.__name__, False, None))
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 Voice Chatbot Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Voice Chatbot tests passed!")
            return True
        else:
            failed_tests = [name for name, success, _ in results if not success]
            print(f"⚠️  Failed tests: {', '.join(failed_tests)}")
            return False

def main():
    tester = VoiceChatbotTester()
    success = tester.run_comprehensive_test()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
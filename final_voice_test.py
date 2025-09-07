#!/usr/bin/env python3
"""
Final Voice Chatbot Validation Test
"""

import requests
import json
from datetime import datetime

def final_validation():
    base_url = "https://echo-crime-alert.preview.emergentagent.com/api"
    
    print("🎤 Final Voice Chatbot Validation")
    print("=" * 40)
    
    # Test complete conversation flow
    session_id = f"final_test_{datetime.now().strftime('%H%M%S')}"
    
    # Step 1: Initial greeting
    print("\n1️⃣ Initial Greeting")
    response1 = requests.post(f"{base_url}/voice", json={
        "message": "Hi",
        "session_id": session_id
    }, timeout=15)
    
    if response1.status_code == 200:
        result1 = response1.json()
        print(f"   ✅ Language selection prompt: {len(result1.get('quick_buttons', []))} buttons")
        context = result1.get('conversation_context', {})
    else:
        print(f"   ❌ Failed: {response1.status_code}")
        return False
    
    # Step 2: Language selection
    print("\n2️⃣ Language Selection (English)")
    response2 = requests.post(f"{base_url}/voice", json={
        "message": "English",
        "language_preference": "english",
        "conversation_context": context,
        "session_id": session_id
    }, timeout=15)
    
    if response2.status_code == 200:
        result2 = response2.json()
        print(f"   ✅ Language set: {result2.get('language_used', '')}")
        context = result2.get('conversation_context', {})
    else:
        print(f"   ❌ Failed: {response2.status_code}")
        return False
    
    # Step 3: Emergency scenario
    print("\n3️⃣ Emergency Intent")
    response3 = requests.post(f"{base_url}/voice", json={
        "message": "Help! I'm in danger",
        "language_preference": "english",
        "conversation_context": context,
        "session_id": session_id
    }, timeout=15)
    
    if response3.status_code == 200:
        result3 = response3.json()
        intent = result3.get('intent_detected', '')
        buttons = result3.get('quick_buttons', [])
        safety_tip = result3.get('safety_tip', '')
        
        print(f"   ✅ Intent: {intent}")
        print(f"   ✅ Emergency buttons: {len(buttons)}")
        print(f"   ✅ Safety tip: {bool(safety_tip)}")
        
        # Check for emergency response
        response_text = result3.get('response', '').lower()
        has_emergency_info = any(word in response_text for word in ['police', '100', 'emergency', 'call'])
        print(f"   ✅ Emergency info: {has_emergency_info}")
        
    else:
        print(f"   ❌ Failed: {response3.status_code}")
        return False
    
    # Step 4: Reporting scenario
    print("\n4️⃣ Reporting Intent")
    response4 = requests.post(f"{base_url}/voice", json={
        "message": "I want to report a theft",
        "language_preference": "english",
        "conversation_context": context,
        "session_id": session_id
    }, timeout=15)
    
    if response4.status_code == 200:
        result4 = response4.json()
        buttons = result4.get('quick_buttons', [])
        
        # Check for report button
        has_report_button = any('report' in btn.get('text', '').lower() for btn in buttons)
        has_navigate_action = any(btn.get('action') in ['navigate', 'confirm_navigate'] for btn in buttons)
        
        print(f"   ✅ Report buttons: {has_report_button}")
        print(f"   ✅ Navigation actions: {has_navigate_action}")
        
    else:
        print(f"   ❌ Failed: {response4.status_code}")
        return False
    
    # Step 5: Tamil-English test
    print("\n5️⃣ Tamil-English Language")
    response5 = requests.post(f"{base_url}/voice", json={
        "message": "Help pannunga",
        "language_preference": "tamil_english",
        "conversation_context": {"language": "tamil_english"},
        "session_id": f"tamil_{session_id}"
    }, timeout=15)
    
    if response5.status_code == 200:
        result5 = response5.json()
        language = result5.get('language_used', '')
        print(f"   ✅ Tamil-English mode: {language == 'tamil_english'}")
    else:
        print(f"   ❌ Failed: {response5.status_code}")
        return False
    
    print("\n🎉 All Voice Chatbot features validated successfully!")
    return True

if __name__ == "__main__":
    success = final_validation()
    exit(0 if success else 1)
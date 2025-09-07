#!/usr/bin/env python3
"""
Debug Voice Chatbot Issues
"""

import requests
import json
from datetime import datetime

def test_voice_endpoint():
    base_url = "https://echo-crime-alert.preview.emergentagent.com/api"
    
    print("🔍 Testing Voice Chatbot Endpoint in Detail...")
    
    # Test 1: Theft intent detection
    print("\n1. Testing Theft Intent Detection:")
    theft_data = {
        "message": "Someone stole my laptop from the library",
        "language_preference": "english",
        "conversation_context": {"language": "english"},
        "session_id": f"debug_theft_{datetime.now().strftime('%H%M%S')}"
    }
    
    try:
        response = requests.post(f"{base_url}/voice", json=theft_data, timeout=15)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   Intent detected: {result.get('intent_detected', 'None')}")
            print(f"   Response: {result.get('response', '')[:100]}...")
            print(f"   Quick buttons: {len(result.get('quick_buttons', []))}")
            for i, btn in enumerate(result.get('quick_buttons', [])):
                print(f"     Button {i+1}: {btn.get('text', '')} -> {btn.get('action', '')}")
            print(f"   Safety tip: {result.get('safety_tip', '')[:50]}...")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {str(e)}")
    
    # Test 2: Invalid request
    print("\n2. Testing Invalid Request:")
    invalid_data = {
        "language_preference": "english",
        "conversation_context": {},
        "session_id": "test_invalid"
        # Missing 'message' field
    }
    
    try:
        response = requests.post(f"{base_url}/voice", json=invalid_data, timeout=15)
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            try:
                error_result = response.json()
                print(f"   Error detail: {error_result}")
            except:
                print(f"   Error text: {response.text}")
        else:
            print(f"   Unexpected success: {response.json()}")
    except Exception as e:
        print(f"   Exception: {str(e)}")
    
    # Test 3: Safety tip content
    print("\n3. Testing Safety Tip Content:")
    safety_data = {
        "message": "How can I stay safe on campus?",
        "language_preference": "english",
        "conversation_context": {"language": "english"},
        "session_id": f"debug_safety_{datetime.now().strftime('%H%M%S')}"
    }
    
    try:
        response = requests.post(f"{base_url}/voice", json=safety_data, timeout=15)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            safety_tip = result.get('safety_tip', '')
            print(f"   Safety tip: {safety_tip}")
            
            # Check for safety keywords
            safety_keywords = ['safe', 'security', 'emergency', 'contact', 'group', 'travel', 'report']
            found_keywords = [kw for kw in safety_keywords if kw in safety_tip.lower()]
            print(f"   Safety keywords found: {found_keywords}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {str(e)}")

if __name__ == "__main__":
    test_voice_endpoint()
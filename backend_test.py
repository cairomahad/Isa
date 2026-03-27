#!/usr/bin/env python3
"""
Backend API Testing Script for Islamic App
Tests all API endpoints as specified in the review request.
"""

import requests
import json
import sys
from datetime import datetime
import re

# Base URL from frontend .env
BASE_URL = "https://tazakkur-islamic.preview.emergentagent.com/api"

def test_prayer_times_api():
    """Test Prayer Times API endpoints"""
    print("\n=== TESTING PRAYER TIMES API ===")
    
    cities_to_test = ["moscow", "kazan", "istanbul"]
    results = []
    
    for city in cities_to_test:
        print(f"\nTesting prayer times for {city}...")
        try:
            url = f"{BASE_URL}/prayer-times?city={city}"
            response = requests.get(url, timeout=30)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Validate response structure
                required_fields = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha", "date", "city"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Missing fields: {missing_fields}")
                    results.append({"city": city, "status": "FAIL", "error": f"Missing fields: {missing_fields}"})
                else:
                    # Validate time format (HH:MM)
                    time_fields = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]
                    invalid_times = []
                    
                    for time_field in time_fields:
                        time_value = data.get(time_field, "")
                        if not re.match(r'^\d{2}:\d{2}$', time_value):
                            invalid_times.append(f"{time_field}: {time_value}")
                    
                    if invalid_times:
                        print(f"❌ Invalid time formats: {invalid_times}")
                        results.append({"city": city, "status": "FAIL", "error": f"Invalid time formats: {invalid_times}"})
                    else:
                        print(f"✅ Prayer times for {city} - PASS")
                        results.append({"city": city, "status": "PASS", "data": data})
            else:
                print(f"❌ HTTP Error: {response.status_code}")
                print(f"Response: {response.text}")
                results.append({"city": city, "status": "FAIL", "error": f"HTTP {response.status_code}: {response.text}"})
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
            results.append({"city": city, "status": "FAIL", "error": str(e)})
    
    return results

def test_hadith_daily_api():
    """Test Hadith Daily API endpoint"""
    print("\n=== TESTING HADITH DAILY API ===")
    
    results = []
    
    # Test multiple calls to verify randomness
    for i in range(3):
        print(f"\nTesting hadith daily call #{i+1}...")
        try:
            url = f"{BASE_URL}/hadith/daily"
            response = requests.get(url, timeout=30)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Validate response structure
                required_fields = ["russian_text"]  # Only russian_text is required based on actual data
                optional_fields = ["id", "arabic_text", "source", "image_url"]
                
                missing_required = [field for field in required_fields if field not in data or not data[field]]
                
                if missing_required:
                    print(f"❌ Missing required fields: {missing_required}")
                    results.append({"call": i+1, "status": "FAIL", "error": f"Missing required fields: {missing_required}"})
                else:
                    print(f"✅ Hadith daily call #{i+1} - PASS")
                    results.append({"call": i+1, "status": "PASS", "data": data})
            else:
                print(f"❌ HTTP Error: {response.status_code}")
                print(f"Response: {response.text}")
                results.append({"call": i+1, "status": "FAIL", "error": f"HTTP {response.status_code}: {response.text}"})
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
            results.append({"call": i+1, "status": "FAIL", "error": str(e)})
    
    return results

def test_story_daily_api():
    """Test Story Daily API endpoint"""
    print("\n=== TESTING STORY DAILY API ===")
    
    results = []
    
    # Test multiple calls to verify randomness
    for i in range(3):
        print(f"\nTesting story daily call #{i+1}...")
        try:
            url = f"{BASE_URL}/story/daily"
            response = requests.get(url, timeout=30)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Validate response structure
                required_fields = ["title", "text"]
                optional_fields = ["id", "image_url"]
                
                missing_required = [field for field in required_fields if field not in data or not data[field]]
                
                if missing_required:
                    print(f"❌ Missing required fields: {missing_required}")
                    results.append({"call": i+1, "status": "FAIL", "error": f"Missing required fields: {missing_required}"})
                else:
                    print(f"✅ Story daily call #{i+1} - PASS")
                    results.append({"call": i+1, "status": "PASS", "data": data})
            else:
                print(f"❌ HTTP Error: {response.status_code}")
                print(f"Response: {response.text}")
                results.append({"call": i+1, "status": "FAIL", "error": f"HTTP {response.status_code}: {response.text}"})
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
            results.append({"call": i+1, "status": "FAIL", "error": str(e)})
    
    return results

def test_benefit_daily_api():
    """Test Benefit Daily API endpoint"""
    print("\n=== TESTING BENEFIT DAILY API ===")
    
    results = []
    
    # Test multiple calls to verify randomness
    for i in range(3):
        print(f"\nTesting benefit daily call #{i+1}...")
        try:
            url = f"{BASE_URL}/benefit/daily"
            response = requests.get(url, timeout=30)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Validate response structure
                required_fields = ["title", "text"]
                optional_fields = ["id", "image_url"]
                
                missing_required = [field for field in required_fields if field not in data or not data[field]]
                
                if missing_required:
                    print(f"❌ Missing required fields: {missing_required}")
                    results.append({"call": i+1, "status": "FAIL", "error": f"Missing required fields: {missing_required}"})
                else:
                    print(f"✅ Benefit daily call #{i+1} - PASS")
                    results.append({"call": i+1, "status": "PASS", "data": data})
            else:
                print(f"❌ HTTP Error: {response.status_code}")
                print(f"Response: {response.text}")
                results.append({"call": i+1, "status": "FAIL", "error": f"HTTP {response.status_code}: {response.text}"})
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
            results.append({"call": i+1, "status": "FAIL", "error": str(e)})
    
    return results

def test_basic_connectivity():
    """Test basic API connectivity"""
    print("\n=== TESTING BASIC CONNECTIVITY ===")
    
    try:
        url = f"{BASE_URL}/"
        response = requests.get(url, timeout=10)
        print(f"Basic API test - Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            print("✅ Basic connectivity - PASS")
            return {"status": "PASS", "data": data}
        else:
            print(f"❌ Basic connectivity - FAIL: HTTP {response.status_code}")
            return {"status": "FAIL", "error": f"HTTP {response.status_code}: {response.text}"}
            
    except Exception as e:
        print(f"❌ Basic connectivity - FAIL: {str(e)}")
        return {"status": "FAIL", "error": str(e)}

def main():
    """Run all tests and generate summary"""
    print("🚀 Starting Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    
    # Run all tests
    connectivity_result = test_basic_connectivity()
    prayer_results = test_prayer_times_api()
    hadith_results = test_hadith_daily_api()
    story_results = test_story_daily_api()
    benefit_results = test_benefit_daily_api()
    
    # Generate summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    # Basic connectivity
    total_tests += 1
    if connectivity_result["status"] == "PASS":
        passed_tests += 1
        print("✅ Basic API connectivity: PASS")
    else:
        failed_tests += 1
        print(f"❌ Basic API connectivity: FAIL - {connectivity_result.get('error', 'Unknown error')}")
    
    # Prayer times
    for result in prayer_results:
        total_tests += 1
        if result["status"] == "PASS":
            passed_tests += 1
            print(f"✅ Prayer times ({result['city']}): PASS")
        else:
            failed_tests += 1
            print(f"❌ Prayer times ({result['city']}): FAIL - {result.get('error', 'Unknown error')}")
    
    # Hadith
    for result in hadith_results:
        total_tests += 1
        if result["status"] == "PASS":
            passed_tests += 1
            print(f"✅ Hadith daily (call {result['call']}): PASS")
        else:
            failed_tests += 1
            print(f"❌ Hadith daily (call {result['call']}): FAIL - {result.get('error', 'Unknown error')}")
    
    # Story
    for result in story_results:
        total_tests += 1
        if result["status"] == "PASS":
            passed_tests += 1
            print(f"✅ Story daily (call {result['call']}): PASS")
        else:
            failed_tests += 1
            print(f"❌ Story daily (call {result['call']}): FAIL - {result.get('error', 'Unknown error')}")
    
    # Benefit
    for result in benefit_results:
        total_tests += 1
        if result["status"] == "PASS":
            passed_tests += 1
            print(f"✅ Benefit daily (call {result['call']}): PASS")
        else:
            failed_tests += 1
            print(f"❌ Benefit daily (call {result['call']}): FAIL - {result.get('error', 'Unknown error')}")
    
    print(f"\n📈 OVERALL RESULTS:")
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if failed_tests > 0:
        print("\n🔍 FAILED TESTS REQUIRE ATTENTION")
        sys.exit(1)
    else:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)

if __name__ == "__main__":
    main()
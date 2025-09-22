#!/usr/bin/env python3
"""
Test script to validate the GitHub Actions setup locally.
Run this script to test if your environment is properly configured.
"""

import os
import sys
import json
import requests
from dotenv import load_dotenv

def test_environment():
    """Test if the environment is properly set up."""
    print("🧪 Testing GitHub Actions environment setup...")
    
    # Load environment variables
    load_dotenv()
    
    # Check if credentials exist
    email = os.getenv('KICKBASE_EMAIL')
    password = os.getenv('KICKBASE_PASSWORD')
    
    if not email:
        print("❌ KICKBASE_EMAIL not found in environment variables")
        print("   Make sure you have a .env file with KICKBASE_EMAIL=your_email")
        return False
    
    if not password:
        print("❌ KICKBASE_PASSWORD not found in environment variables")
        print("   Make sure you have a .env file with KICKBASE_PASSWORD=your_password")
        return False
    
    print("✅ Credentials found in environment")
    print(f"📝 Email: {email}")
    print(f"📝 Password length: {len(password)}")
    print(f"📝 Password starts with: {password[:10]}...")
    print(f"📝 Password ends with: ...{password[-10:]}")
    
    # Check for potential encoding issues
    if '\\\\' in password:
        print("⚠️  Double backslash detected in password - this might cause issues")
        corrected_password = password.replace('\\\\', '\\')
        print(f"📝 Trying with corrected password (single backslash)")
        password = corrected_password
    
    # Test login and API connection
    print("🔐 Testing login and API connection...")
    try:
        # Login request - try different formats
        login_url = "https://api.kickbase.com/v4/user/login"
        
        # Try the exact format from your successful example
        login_data = {
            "ext": True,
            "em": email,
            "loy": False,
            "pass": password,
            "rep": {}
        }
        
        # Add headers that might be expected
        login_headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        response = requests.post(login_url, json=login_data, headers=login_headers)

        
        if response.status_code == 200:
            data = response.json()
            print(f"📝 Response data keys: {list(data.keys())}")
            token = data.get('tkn')
            if token:
                print("✅ Login successful, token obtained")
                print(f"📝 Token preview: {token[:20]}...")
                
                # Test API call with token
                test_url = "https://api.kickbase.com/v4/competitions/1/players/173?leagueId=5378755"
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                
                api_response = requests.get(test_url, headers=headers)
                if api_response.status_code == 200:
                    print("✅ API connection successful with fresh token")
                    expiry = data.get('tknex', 'Unknown')
                    print(f"   Token expires at: {expiry}")
                    return True
                else:
                    print(f"❌ API call failed with status: {api_response.status_code}")
                    print(f"📝 API response: {api_response.text[:200]}...")
                    return False
            else:
                print("❌ Login successful but no token received")
                print(f"📝 Available keys in response: {list(data.keys())}")
                return False
        elif response.status_code == 401:
            print("❌ Login failed (401 Unauthorized)")
            print("   Please check your email and password")
            print(f"📝 Error response: {response.text}")
            return False
        else:
            print(f"❌ Login failed with status code: {response.status_code}")
            print(f"📝 Response: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False

def test_file_structure():
    """Test if required files exist."""
    print("📁 Testing file structure...")
    
    required_files = [
        'requirements.txt',
        'python/all_players.json',
        '.github/workflows/update-players.yml'
    ]
    
    all_exist = True
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path} exists")
        else:
            print(f"❌ {file_path} not found")
            all_exist = False
    
    return all_exist

def main():
    """Run all tests."""
    print("🚀 GitHub Actions Setup Validation")
    print("=" * 40)
    
    tests_passed = 0
    total_tests = 2
    
    if test_environment():
        tests_passed += 1
    
    print()
    
    if test_file_structure():
        tests_passed += 1
    
    print()
    print("📋 Test Summary")
    print("-" * 20)
    print(f"Tests passed: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Your setup is ready for GitHub Actions.")
        print("\nNext steps:")
        print("1. Commit and push these changes to GitHub")
        print("2. Add KICKBASE_EMAIL and KICKBASE_PASSWORD to your GitHub repository secrets")
        print("3. The workflow will run automatically every Sunday")
        print("4. You can also trigger it manually from the Actions tab")
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
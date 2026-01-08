#!/usr/bin/env python3
"""
Quick test script to verify the complete workflow
"""

import os
import sys
from dotenv import load_dotenv
from login import login_to_kickbase

# Load environment
load_dotenv()

print("=" * 60)
print("🧪 TESTING KICKBASE WORKFLOW")
print("=" * 60)

# Test 1: Check environment variables
print("\n1️⃣ Checking environment variables...")
email = os.getenv('KICKBASE_EMAIL')
password = os.getenv('KICKBASE_PASSWORD')
token = os.getenv('BEARER_TOKEN')

print(f"   KICKBASE_EMAIL: {'✅ Set' if email else '❌ Not set'}")
print(f"   KICKBASE_PASSWORD: {'✅ Set' if password else '❌ Not set'}")
print(f"   BEARER_TOKEN: {'✅ Set' if token else '⚠️  Not set (will login)'}")

if not email or not password:
    print("\n❌ Missing credentials!")
    print("Please set KICKBASE_EMAIL and KICKBASE_PASSWORD in .env file")
    sys.exit(1)

# Test 2: Login
print("\n2️⃣ Testing login...")
test_token = login_to_kickbase()

if test_token:
    print("✅ Login successful!")
else:
    print("❌ Login failed!")
    sys.exit(1)

# Test 3: Check required files
print("\n3️⃣ Checking required files...")
required_files = ['all_players.json']
for file in required_files:
    exists = os.path.exists(file)
    print(f"   {file}: {'✅' if exists else '❌'}")
    if not exists:
        print(f"   Warning: {file} not found, getDetailedPlayers.py might fail")

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED!")
print("=" * 60)
print("\nYou can now run: python getDetailedPlayers.py")

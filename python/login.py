#!/usr/bin/env python3
"""
Kickbase Login Script
Authenticates with email/password and retrieves a bearer token
"""

import requests
import json
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Kickbase API endpoints
LOGIN_URL = "https://api.kickbase.com/v4/user/login"

def login_to_kickbase(email=None, password=None):
    """
    Login to Kickbase API and return the bearer token
    
    Args:
        email: Kickbase account email (defaults to KICKBASE_EMAIL env var)
        password: Kickbase account password (defaults to KICKBASE_PASSWORD env var)
    
    Returns:
        str: Bearer token if successful, None otherwise
    """
    # Get credentials from parameters or environment
    email = email or os.getenv('KICKBASE_EMAIL')
    password = password or os.getenv('KICKBASE_PASSWORD')
    
    if not email or not password:
        print("❌ Email or password not provided")
        print("Set KICKBASE_EMAIL and KICKBASE_PASSWORD environment variables")
        return None
    
    print(f"🔐 Attempting to login with email: {email[:3]}***{email[-10:]}")
    
    # Prepare login payload - use Kickbase API field names
    payload = {
        "ext": True,
        "em": email,
        "loy": False,
        "pass": password,
        "rep": {}
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.post(LOGIN_URL, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('tkn')  # Kickbase returns 'tkn', not 'token'
            
            if token:
                print("✅ Login successful!")
                print(f"Token length: {len(token)}")
                print(f"Token preview: {token[:20]}...")
                
                # Print token expiry if available
                expiry = data.get('tknex', 'Unknown')
                print(f"Token expires at: {expiry}")
                
                return token
            else:
                print("❌ Login successful but no token in response")
                print(f"Response: {json.dumps(data, indent=2)}")
                return None
        else:
            print(f"❌ Login failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during login: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error during login: {e}")
        return None

def save_token_to_env(token):
    """
    Save token to .env file (optional - for local development)
    """
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    
    # Read existing .env content
    env_content = ""
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            env_content = f.read()
    
    # Update or add BEARER_TOKEN
    if 'BEARER_TOKEN=' in env_content:
        # Replace existing token
        lines = env_content.split('\n')
        new_lines = []
        for line in lines:
            if line.startswith('BEARER_TOKEN='):
                new_lines.append(f'BEARER_TOKEN={token}')
            else:
                new_lines.append(line)
        env_content = '\n'.join(new_lines)
    else:
        # Add new token
        if env_content and not env_content.endswith('\n'):
            env_content += '\n'
        env_content += f'BEARER_TOKEN={token}\n'
    
    # Write back to file
    with open(env_file, 'w') as f:
        f.write(env_content)
    
    print(f"✅ Token saved to {env_file}")

if __name__ == "__main__":
    print("=== Kickbase Login ===")
    
    # Attempt login
    token = login_to_kickbase()
    
    if token:
        # Export token to environment (for current session)
        os.environ['BEARER_TOKEN'] = token
        print(f"\n✅ BEARER_TOKEN set in environment")
        
        # Optionally save to .env file
        save_to_file = input("\nSave token to .env file? (y/n): ").lower().strip()
        if save_to_file == 'y':
            save_token_to_env(token)
        
        sys.exit(0)
    else:
        print("\n❌ Login failed - could not retrieve token")
        sys.exit(1)

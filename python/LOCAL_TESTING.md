# Local Testing Guide

## Setup

1. **Create a `.env` file in the `python` directory:**
   ```bash
   cd python
   cp .env.example .env
   ```

2. **Edit `.env` and add your credentials:**
   ```bash
   KICKBASE_EMAIL=your.email@example.com
   KICKBASE_PASSWORD=your_password
   ```

3. **Install dependencies:**
   ```bash
   pip install -r ../requirements.txt
   ```

## Testing the Login

Test if your credentials work and retrieve a token:

```bash
cd python
python login.py
```

This will:
- Attempt to login with your credentials
- Display the token if successful
- Optionally save the token to your `.env` file

## Running the Player Data Update Locally

Once you have confirmed your login works, run the main script:

```bash
cd python
python getDetailedPlayers.py
```

The script will:
1. Check for `BEARER_TOKEN` in environment
2. If not found, automatically login using `KICKBASE_EMAIL` and `KICKBASE_PASSWORD`
3. Fetch detailed player data
4. Save to `detailed_players.json`

## Testing the Complete Workflow Locally

To simulate what GitHub Actions will do:

```bash
# From the root directory
cd python

# Run the script (it will auto-login if needed)
python getDetailedPlayers.py

# Check the output
ls -l detailed_players.json

# Validate JSON
python -m json.tool detailed_players.json > /dev/null && echo "✅ Valid JSON"

# Copy to public folder
cp detailed_players.json ../public/detailed_players.json
```

## Troubleshooting

### "Login failed with status code: 401"
- Check that your email and password are correct
- Make sure you're using the actual Kickbase account credentials

### "BEARER_TOKEN not found"
- Make sure your `.env` file is in the `python` directory
- Check that the file is named exactly `.env` (not `.env.txt`)
- Run `python login.py` to verify credentials work

### "Module not found: login"
- Make sure you're running from the `python` directory
- The `login.py` file should be in the same directory

## GitHub Actions Setup

To use this in GitHub Actions, add these secrets to your repository:

1. Go to: **Settings** → **Secrets and variables** → **Actions**
2. Add:
   - `KICKBASE_EMAIL`: Your Kickbase email
   - `KICKBASE_PASSWORD`: Your Kickbase password

The workflow will automatically login and get a fresh token each time it runs.

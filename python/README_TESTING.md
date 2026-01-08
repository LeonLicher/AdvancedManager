# 🚀 Quick Start - Local Testing

## Windows Users (Easiest Method)

1. **Create your `.env` file:**
   - Copy `.env.example` to `.env`
   - Edit `.env` with your credentials:
     ```
     KICKBASE_EMAIL=your.email@example.com
     KICKBASE_PASSWORD=your_password
     ```

2. **Double-click `test_local.bat`**
   - It will test your credentials
   - Ask if you want to run the full update
   - Copy the results to the public folder

## Manual Testing (All Platforms)

### 1. Setup Environment
```bash
cd python
cp .env.example .env
# Edit .env with your credentials
```

### 2. Install Dependencies
```bash
pip install -r ../requirements.txt
```

### 3. Test Login
```bash
python login.py
```

### 4. Run Full Test
```bash
python test_workflow.py
```

### 5. Update Player Data
```bash
python getDetailedPlayers.py
```

### 6. Copy to Public
```bash
cp detailed_players.json ../public/detailed_players.json
```

## 🔐 GitHub Actions Setup

Add these secrets to your GitHub repository:
- `KICKBASE_EMAIL` - Your Kickbase email
- `KICKBASE_PASSWORD` - Your Kickbase password

The workflow automatically logs in and gets a fresh token each run.

## 📝 Files

- `login.py` - Handles authentication
- `getDetailedPlayers.py` - Main script (auto-calls login if needed)
- `test_workflow.py` - Tests your setup
- `test_local.bat` - Windows batch script for easy testing
- `LOCAL_TESTING.md` - Detailed testing guide

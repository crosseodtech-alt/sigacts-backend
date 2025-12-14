# Iraq SIGACTS Backend API

Backend server for the Iraq SIGACTS visualization project. Processes incident data and serves it via REST API.

## Features

- **Fast Data Access**: CSV loaded once at startup, indexed by date
- **Efficient Filtering**: Server-side filtering by date, type, category, province
- **Pre-processed Dashboard Data**: Treemap, radar, and heatmap data calculated server-side
- **CORS Enabled**: Works with GitHub Pages frontend
- **In-Memory Storage**: No database needed, fast response times

## API Endpoints

### Data Endpoints
- `GET /api/dates` - Get all available dates
- `GET /api/metadata` - Get types, categories, and provinces
- `GET /api/incidents/:date` - Get incidents for a specific date
  - Query params: `?type=X&category=Y&province=Z` (all optional)
- `GET /api/boundary` - Get Iraq GeoJSON boundary

### Dashboard Endpoints
- `GET /api/dashboard/treemap` - Incident type distribution data
- `GET /api/dashboard/radar` - Time-of-day patterns for Enemy Action & Explosive Hazard
- `GET /api/dashboard/heatmap` - Daily incident intensity by year (2003-2011)

## Local Development

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Make sure data files are in `/data` folder:
   - `IQ_SIGACTs_-_cleaned.csv`
   - `iq.json`

### Run Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

Server will start on `http://localhost:3000`

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/

# Get dates
curl http://localhost:3000/api/dates

# Get incidents for a specific date
curl http://localhost:3000/api/incidents/2007-12-15

# Get filtered incidents
curl "http://localhost:3000/api/incidents/2007-12-15?type=Enemy%20Action&province=Baghdad"

# Get dashboard data
curl http://localhost:3000/api/dashboard/treemap
curl http://localhost:3000/api/dashboard/radar
curl http://localhost:3000/api/dashboard/heatmap
```

## Deployment to Render

### Step 1: Push to GitHub

1. Create a new GitHub repository: `sigacts-backend`

2. Initialize git and push:
```bash
git init
git add .
git commit -m "Initial commit: Iraq SIGACTS backend"
git remote add origin https://github.com/YOUR_USERNAME/sigacts-backend.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign in

2. Click **"New +"** → **"Web Service"**

3. Connect your GitHub repository: `sigacts-backend`

4. Configure the service:
   - **Name**: `sigacts-backend` (or your choice)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free tier is fine

5. Add environment variables:
   - `NODE_ENV` = `production`

6. Click **"Create Web Service"**

7. Wait for deployment (first deploy takes ~5-10 minutes)

8. Your API will be available at: `https://sigacts-backend.onrender.com`

### Step 3: Test Production API

```bash
# Test your deployed API
curl https://sigacts-backend.onrender.com/
curl https://sigacts-backend.onrender.com/api/dates
```

## Response Examples

### GET /api/incidents/2007-12-15

```json
{
  "date": "2007-12-15",
  "count": 142,
  "incidents": [
    {
      "lat": 33.3128,
      "lng": 44.3615,
      "date": "2007-12-15",
      "type": "Enemy Action",
      "category": "Direct Fire",
      "targetCategory": "Coalition Forces",
      "target": "US Patrol",
      "forceType": "CF",
      "city": "Baghdad",
      "province": "Baghdad",
      "time": "14:23:00"
    }
    // ... more incidents
  ]
}
```

### GET /api/dashboard/treemap

```json
{
  "series": [
    {
      "name": "Enemy Action",
      "data": [
        { "x": "Direct Fire", "y": 45231 },
        { "x": "IED Explosion", "y": 32145 }
      ]
    },
    {
      "name": "Explosive Hazard",
      "data": [
        { "x": "IED Found/Cleared", "y": 28934 }
      ]
    }
  ]
}
```

## Performance Notes

- CSV loads in ~2-3 seconds on startup
- All 200k+ incidents indexed in memory
- Date queries: < 10ms response time
- Dashboard aggregations: < 50ms response time
- Memory usage: ~150-200MB

## Tech Stack

- **Node.js** - Runtime
- **Express** - Web framework
- **csv-parser** - CSV processing
- **CORS** - Cross-origin support

## Next Steps

After deploying backend, update your frontend to call these API endpoints instead of loading CSV files locally.

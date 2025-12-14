require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dataProcessor = require('./data-processor');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from GitHub Pages
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load data on startup
let dataLoaded = false;

async function initializeData() {
  try {
    const csvPath = path.join(__dirname, 'data', 'IQ_SIGACTs_-_cleaned.csv');
    const boundaryPath = path.join(__dirname, 'data', 'iq.json');
    
    await dataProcessor.loadData(csvPath, boundaryPath);
    dataLoaded = true;
    console.log('✅ Data initialization complete!');
  } catch (error) {
    console.error('❌ Error loading data:', error);
    process.exit(1);
  }
}

// Middleware to check if data is loaded
function ensureDataLoaded(req, res, next) {
  if (!dataLoaded) {
    return res.status(503).json({ 
      error: 'Server is still loading data. Please try again in a moment.' 
    });
  }
  next();
}

// ========== ROUTES ==========

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Iraq SIGACTS API Server is running!',
    status: dataLoaded ? 'ready' : 'loading',
    endpoints: [
      'GET /api/dates',
      'GET /api/metadata',
      'GET /api/incidents/:date',
      'GET /api/dashboard/treemap',
      'GET /api/dashboard/radar',
      'GET /api/dashboard/heatmap',
      'GET /api/boundary'
    ]
  });
});

// Get all available dates
app.get('/api/dates', ensureDataLoaded, (req, res) => {
  try {
    const dates = dataProcessor.getDates();
    console.log(`📅 Sent ${dates.length} dates to client`);
    res.json({ dates });
  } catch (error) {
    console.error('Error fetching dates:', error);
    res.status(500).json({ error: 'Failed to fetch dates' });
  }
});

// Get metadata (types, categories, provinces)
app.get('/api/metadata', ensureDataLoaded, (req, res) => {
  try {
    const metadata = dataProcessor.getMetadata();
    console.log('📊 Sent metadata to client');
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// Get incidents for a specific date with optional filters
// Example: /api/incidents/2007-12-15?type=Enemy%20Action&category=all&province=Baghdad
app.get('/api/incidents/:date', ensureDataLoaded, (req, res) => {
  try {
    const { date } = req.params;
    const filters = {
      type: req.query.type,
      category: req.query.category,
      province: req.query.province
    };
    
    const incidents = dataProcessor.getIncidents(date, filters);
    console.log(`📤 Sent ${incidents.length} incidents for ${date}`);
    res.json({ 
      date,
      count: incidents.length,
      incidents 
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// Get treemap data (incident type distribution)
app.get('/api/dashboard/treemap', ensureDataLoaded, (req, res) => {
  try {
    const data = dataProcessor.getTreemapData();
    console.log('📊 Sent treemap data to client');
    res.json({ series: data });
  } catch (error) {
    console.error('Error generating treemap data:', error);
    res.status(500).json({ error: 'Failed to generate treemap data' });
  }
});

// Get radar chart data (time patterns)
app.get('/api/dashboard/radar', ensureDataLoaded, (req, res) => {
  try {
    const data = dataProcessor.getRadarData();
    console.log('📊 Sent radar chart data to client');
    res.json(data);
  } catch (error) {
    console.error('Error generating radar data:', error);
    res.status(500).json({ error: 'Failed to generate radar data' });
  }
});

// Get heatmap data (daily intensity by year)
app.get('/api/dashboard/heatmap', ensureDataLoaded, (req, res) => {
  try {
    const data = dataProcessor.getHeatmapData();
    console.log('📊 Sent heatmap data to client');
    res.json(data);
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    res.status(500).json({ error: 'Failed to generate heatmap data' });
  }
});

// Get Iraq boundary GeoJSON
app.get('/api/boundary', ensureDataLoaded, (req, res) => {
  try {
    const boundary = dataProcessor.getBoundary();
    if (!boundary) {
      return res.status(404).json({ error: 'Boundary data not found' });
    }
    console.log('🗺️  Sent boundary data to client');
    res.json(boundary);
  } catch (error) {
    console.error('Error fetching boundary:', error);
    res.status(500).json({ error: 'Failed to fetch boundary' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  await initializeData();
  
  app.listen(PORT, () => {
    console.log(`\n🌐 Server is running on http://localhost:${PORT}`);
    console.log(`📍 API endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/api/dates`);
    console.log(`   GET  http://localhost:${PORT}/api/metadata`);
    console.log(`   GET  http://localhost:${PORT}/api/incidents/:date`);
    console.log(`   GET  http://localhost:${PORT}/api/dashboard/treemap`);
    console.log(`   GET  http://localhost:${PORT}/api/dashboard/radar`);
    console.log(`   GET  http://localhost:${PORT}/api/dashboard/heatmap`);
    console.log(`   GET  http://localhost:${PORT}/api/boundary\n`);
  });
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

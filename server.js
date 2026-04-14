require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const dataProcessor    = require('./data-processor');
const afgDataProcessor = require('./afg-data-processor');

const app  = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== STARTUP FLAGS =====
let iraqDataLoaded = false;
let afgDataLoaded  = false;

// ===== DATA INITIALIZATION =====
async function initializeData() {
  try {
    // ---- Iraq ----
    const iraqCsvPath     = path.join(__dirname, 'data', 'IQ_SIGACTs_-_cleaned.csv');
    const iraqBoundaryPath = path.join(__dirname, 'data', 'iq.json');
    const heatmapJsonPath  = path.join(__dirname, 'data', 'sigacts_data.json');

    await dataProcessor.loadData(iraqCsvPath, iraqBoundaryPath, heatmapJsonPath);
    iraqDataLoaded = true;
    console.log('✅ Iraq data initialization complete!');
  } catch (error) {
    console.error('❌ Error loading Iraq data:', error);
    process.exit(1);
  }

  try {
    // ---- Afghanistan ----
    const afgCsvPath      = path.join(__dirname, 'data', 'AfgSigacts_cleaned.csv');
    const afgBoundaryPath = path.join(__dirname, 'data', 'af.json');

    await afgDataProcessor.loadData(afgCsvPath, afgBoundaryPath);
    afgDataLoaded = true;
    console.log('✅ Afghanistan data initialization complete!');
  } catch (error) {
    console.error('❌ Error loading Afghanistan data:', error);
    // Don't exit -- Iraq still works if Afghan load fails
    console.error('⚠️  Server continuing without Afghanistan data.');
  }
}

// ===== READY-CHECK MIDDLEWARE =====
function ensureIraqLoaded(req, res, next) {
  if (!iraqDataLoaded) {
    return res.status(503).json({ error: 'Iraq data is still loading. Please try again in a moment.' });
  }
  next();
}

function ensureAfgLoaded(req, res, next) {
  if (!afgDataLoaded) {
    return res.status(503).json({ error: 'Afghanistan data is still loading. Please try again in a moment.' });
  }
  next();
}

// =============================================================
// ===== IRAQ ROUTES (unchanged) ===============================
// =============================================================

app.get('/', (req, res) => {
  res.json({
    message: '🚀 SIGACTS API Server is running!',
    status: {
      iraq:        iraqDataLoaded ? 'ready' : 'loading',
      afghanistan: afgDataLoaded  ? 'ready' : 'loading'
    },
    endpoints: [
      // Iraq
      'GET /api/dates',
      'GET /api/metadata',
      'GET /api/incidents/:date',
      'GET /api/dashboard/treemap',
      'GET /api/dashboard/radar',
      'GET /api/dashboard/heatmap',
      'GET /api/boundary',
      // Afghanistan
      'GET /api/afg/dates',
      'GET /api/afg/metadata',
      'GET /api/afg/incidents/:date',
      'GET /api/afg/dashboard/treemap',
      'GET /api/afg/dashboard/radar',
      'GET /api/afg/dashboard/heatmap',
      'GET /api/afg/boundary'
    ]
  });
});

app.get('/api/dates', ensureIraqLoaded, (req, res) => {
  try {
    const dates = dataProcessor.getDates();
    console.log(`📅 [Iraq] Sent ${dates.length} dates`);
    res.json({ dates });
  } catch (error) {
    console.error('Error fetching Iraq dates:', error);
    res.status(500).json({ error: 'Failed to fetch dates' });
  }
});

app.get('/api/metadata', ensureIraqLoaded, (req, res) => {
  try {
    const metadata = dataProcessor.getMetadata();
    console.log('📊 [Iraq] Sent metadata');
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching Iraq metadata:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

app.get('/api/incidents/:date', ensureIraqLoaded, (req, res) => {
  try {
    const { date } = req.params;
    const filters = {
      type:     req.query.type,
      category: req.query.category,
      province: req.query.province
    };
    const incidents = dataProcessor.getIncidents(date, filters);
    console.log(`📤 [Iraq] Sent ${incidents.length} incidents for ${date}`);
    res.json({ date, count: incidents.length, incidents });
  } catch (error) {
    console.error('Error fetching Iraq incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

app.get('/api/dashboard/treemap', ensureIraqLoaded, (req, res) => {
  try {
    const data = dataProcessor.getTreemapData();
    console.log('📊 [Iraq] Sent treemap data');
    res.json(data);
  } catch (error) {
    console.error('Error generating Iraq treemap:', error);
    res.status(500).json({ error: 'Failed to generate treemap data' });
  }
});

app.get('/api/dashboard/radar', ensureIraqLoaded, (req, res) => {
  try {
    const data = dataProcessor.getRadarData();
    console.log('📊 [Iraq] Sent radar data');
    res.json(data);
  } catch (error) {
    console.error('Error generating Iraq radar:', error);
    res.status(500).json({ error: 'Failed to generate radar data' });
  }
});

app.get('/api/dashboard/heatmap', ensureIraqLoaded, (req, res) => {
  try {
    const data = dataProcessor.getHeatmapData();
    console.log('📊 [Iraq] Sent heatmap data');
    res.json(data);
  } catch (error) {
    console.error('Error generating Iraq heatmap:', error);
    res.status(500).json({ error: 'Failed to generate heatmap data' });
  }
});

app.get('/api/boundary', ensureIraqLoaded, (req, res) => {
  try {
    const boundary = dataProcessor.getBoundary();
    if (!boundary) return res.status(404).json({ error: 'Iraq boundary data not found' });
    console.log('🗺️  [Iraq] Sent boundary');
    res.json(boundary);
  } catch (error) {
    console.error('Error fetching Iraq boundary:', error);
    res.status(500).json({ error: 'Failed to fetch boundary' });
  }
});

// =============================================================
// ===== AFGHANISTAN ROUTES ====================================
// =============================================================

app.get('/api/afg/dates', ensureAfgLoaded, (req, res) => {
  try {
    const dates = afgDataProcessor.getDates();
    console.log(`📅 [Afghanistan] Sent ${dates.length} dates`);
    res.json({ dates });
  } catch (error) {
    console.error('Error fetching Afghanistan dates:', error);
    res.status(500).json({ error: 'Failed to fetch dates' });
  }
});

app.get('/api/afg/metadata', ensureAfgLoaded, (req, res) => {
  try {
    const metadata = afgDataProcessor.getMetadata();
    console.log('📊 [Afghanistan] Sent metadata');
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching Afghanistan metadata:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

app.get('/api/afg/incidents/:date', ensureAfgLoaded, (req, res) => {
  try {
    const { date } = req.params;
    const filters = {
      type:     req.query.type,
      category: req.query.category
      // No province filter for Afghanistan
    };
    const incidents = afgDataProcessor.getIncidents(date, filters);
    console.log(`📤 [Afghanistan] Sent ${incidents.length} incidents for ${date}`);
    res.json({ date, count: incidents.length, incidents });
  } catch (error) {
    console.error('Error fetching Afghanistan incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

app.get('/api/afg/dashboard/treemap', ensureAfgLoaded, (req, res) => {
  try {
    const data = afgDataProcessor.getTreemapData();
    console.log('📊 [Afghanistan] Sent treemap data');
    res.json(data);
  } catch (error) {
    console.error('Error generating Afghanistan treemap:', error);
    res.status(500).json({ error: 'Failed to generate treemap data' });
  }
});

app.get('/api/afg/dashboard/radar', ensureAfgLoaded, (req, res) => {
  try {
    const data = afgDataProcessor.getRadarData();
    console.log('📊 [Afghanistan] Sent radar data');
    res.json(data);
  } catch (error) {
    console.error('Error generating Afghanistan radar:', error);
    res.status(500).json({ error: 'Failed to generate radar data' });
  }
});

app.get('/api/afg/dashboard/heatmap', ensureAfgLoaded, (req, res) => {
  try {
    const data = afgDataProcessor.getHeatmapData();
    console.log('📊 [Afghanistan] Sent heatmap data');
    res.json(data);
  } catch (error) {
    console.error('Error generating Afghanistan heatmap:', error);
    res.status(500).json({ error: 'Failed to generate heatmap data' });
  }
});

app.get('/api/afg/boundary', ensureAfgLoaded, (req, res) => {
  try {
    const boundary = afgDataProcessor.getBoundary();
    if (!boundary) return res.status(404).json({ error: 'Afghanistan boundary data not found' });
    console.log('🗺️  [Afghanistan] Sent boundary');
    res.json(boundary);
  } catch (error) {
    console.error('Error fetching Afghanistan boundary:', error);
    res.status(500).json({ error: 'Failed to fetch boundary' });
  }
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// =============================================================
// ===== SERVER START ==========================================
// =============================================================
async function startServer() {
  await initializeData();

  app.listen(PORT, () => {
    console.log(`\n🌐 Server running on http://localhost:${PORT}`);
    console.log('📍 Iraq endpoints:');
    console.log(`   GET /api/dates`);
    console.log(`   GET /api/metadata`);
    console.log(`   GET /api/incidents/:date`);
    console.log(`   GET /api/dashboard/treemap`);
    console.log(`   GET /api/dashboard/radar`);
    console.log(`   GET /api/dashboard/heatmap`);
    console.log(`   GET /api/boundary`);
    console.log('📍 Afghanistan endpoints:');
    console.log(`   GET /api/afg/dates`);
    console.log(`   GET /api/afg/metadata`);
    console.log(`   GET /api/afg/incidents/:date`);
    console.log(`   GET /api/afg/dashboard/treemap`);
    console.log(`   GET /api/afg/dashboard/radar`);
    console.log(`   GET /api/afg/dashboard/heatmap`);
    console.log(`   GET /api/afg/boundary\n`);
  });
}

startServer();

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

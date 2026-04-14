const fs  = require('fs');
const csv = require('csv-parser');

class AfgDataProcessor {
  constructor() {
    this.allIncidents = [];
    this.dateIndex    = new Map(); // Maps YYYY-MM-DD -> incident array
    this.types        = new Set();
    this.categories   = new Set();
    this.dates        = [];
    this.boundary     = null;
    this.isLoaded     = false;
  }

  // Strip N/E suffixes and return a plain float
  // e.g. '35.83523N' -> 35.83523,  '063.84149E' -> 63.84149
  parseCoord(str) {
    return parseFloat(String(str).replace(/[NnEeSsWw]/g, ''));
  }

  async loadData(csvPath, boundaryPath) {
    console.log('📊 Loading Afghanistan SIGACTS data...');

    return new Promise((resolve, reject) => {
      const incidents = [];

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {

          // ---- Skip header bleed-through rows ----
          const rawType = row['Incident Type'] || '';
          const rawCat  = row['Incident Category'] || '';
          if (rawType === 'Incident Type' || rawCat === 'Incident Category') return;
          if (!rawType || rawType === 'Unknown') return;

          // ---- Parse date and time ----
          const dateTime = row.date_time_occ || '';
          const datePart = dateTime.split(' ')[0];
          const timePart = dateTime.split(' ')[1] || '';

          // Convert M/D/YYYY to YYYY-MM-DD
          let formattedDate = datePart;
          if (datePart.includes('/')) {
            const parts = datePart.split('/');
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day   = parts[1].padStart(2, '0');
              const year  = parts[2];
              formattedDate = `${year}-${month}-${day}`;
            }
          }

          // ---- Parse coordinates ----
          const lat = this.parseCoord(row.mgrs_Y);
          const lng = this.parseCoord(row.mgrs_X);

          // Skip rows with invalid coordinates
          if (isNaN(lat) || isNaN(lng)) return;

          const incident = {
            lat,
            lng,
            date:     formattedDate,
            type:     rawType,
            category: rawCat || 'N/A',
            time:     timePart
          };

          incidents.push(incident);

          // Build indexes
          this.types.add(incident.type);
          this.categories.add(incident.category);

          if (!this.dateIndex.has(formattedDate)) {
            this.dateIndex.set(formattedDate, []);
          }
          this.dateIndex.get(formattedDate).push(incident);
        })
        .on('end', () => {
          this.allIncidents = incidents;
          this.dates = Array.from(this.dateIndex.keys()).sort();

          console.log(`✅ Loaded ${incidents.length} Afghanistan incidents`);
          console.log(`📅 Date range: ${this.dates[0]} to ${this.dates[this.dates.length - 1]}`);
          console.log(`🏷️  Types: ${this.types.size}, Categories: ${this.categories.size}`);

          // Load Afghanistan boundary GeoJSON
          if (boundaryPath && fs.existsSync(boundaryPath)) {
            this.boundary = JSON.parse(fs.readFileSync(boundaryPath, 'utf8'));
            console.log('🗺️  Loaded Afghanistan boundary GeoJSON');
          }

          this.isLoaded = true;
          resolve();
        })
        .on('error', reject);
    });
  }

  // ---- Get all available dates ----
  getDates() {
    return this.dates;
  }

  // ---- Get incidents for a specific date with optional filters ----
  getIncidents(date, filters = {}) {
    let incidents = this.dateIndex.get(date) || [];

    if (filters.type && filters.type !== 'all') {
      incidents = incidents.filter(i => i.type === filters.type);
    }
    if (filters.category && filters.category !== 'all') {
      incidents = incidents.filter(i => i.category === filters.category);
    }

    return incidents;
  }

  // ---- Get metadata (types and categories only -- no provinces in Afghan data) ----
  getMetadata() {
    return {
      types:      Array.from(this.types).sort(),
      categories: Array.from(this.categories).sort()
    };
  }

  // ---- Treemap data -- Friendly Fire excluded from chart ----
  getTreemapData() {
    const treemapData = {};

    for (const incident of this.allIncidents) {
      const type     = incident.type;
      const category = incident.category;

      // Exclude Friendly Fire from treemap -- still visible on map
      if (type === 'Friendly Fire') continue;

      if (!treemapData[type]) treemapData[type] = {};
      if (!treemapData[type][category]) treemapData[type][category] = 0;
      treemapData[type][category]++;
    }

    const series = [];
    for (const incidentType in treemapData) {
      const cats      = treemapData[incidentType];
      const chartData = [];
      for (const category in cats) {
        chartData.push({ x: category, y: cats[category] });
      }
      series.push({ name: incidentType, data: chartData });
    }

    return { series };
  }

  // ---- Radar data -- time-of-day patterns for Enemy Action and Explosive Hazard ----
  getRadarData() {
    const timeBuckets = {
      'Early Night (00:00-03:59)':    0,
      'Early Morning (04:00-08:59)':  0,
      'Mid-Morning (09:00-11:59)':    0,
      'Early Afternoon (12:00-14:59)':0,
      'Late Afternoon (15:00-17:59)': 0,
      'Evening (18:00-21:59)':        0,
      'Late Night (22:00-23:59)':     0
    };

    // Deep copy for each type
    const radarDataEnemy     = { ...timeBuckets };
    const radarDataExplosive = { ...timeBuckets };

    for (const incident of this.allIncidents) {
      if (!incident.time) continue;

      const hour = parseInt(incident.time.split(':')[0]);
      if (isNaN(hour)) continue;

      let bucket = '';
      if      (hour <  4)  bucket = 'Early Night (00:00-03:59)';
      else if (hour <  9)  bucket = 'Early Morning (04:00-08:59)';
      else if (hour < 12)  bucket = 'Mid-Morning (09:00-11:59)';
      else if (hour < 15)  bucket = 'Early Afternoon (12:00-14:59)';
      else if (hour < 18)  bucket = 'Late Afternoon (15:00-17:59)';
      else if (hour < 22)  bucket = 'Evening (18:00-21:59)';
      else                 bucket = 'Late Night (22:00-23:59)';

      if      (incident.type === 'Enemy Action')    radarDataEnemy[bucket]++;
      else if (incident.type === 'Explosive Hazard') radarDataExplosive[bucket]++;
    }

    return {
      enemy: {
        categories: Object.keys(radarDataEnemy),
        values:     Object.values(radarDataEnemy)
      },
      explosive: {
        categories: Object.keys(radarDataExplosive),
        values:     Object.values(radarDataExplosive)
      }
    };
  }

  // ---- Heatmap data -- calculated directly from CSV (no separate JSON needed) ----
  getHeatmapData() {
    // Count incidents per date
    const dateCounts = {};
    for (const incident of this.allIncidents) {
      if (!dateCounts[incident.date]) dateCounts[incident.date] = 0;
      dateCounts[incident.date]++;
    }

    // Return sorted parallel arrays matching the Iraq heatmap response shape
    const sortedDates  = Object.keys(dateCounts).sort();
    const sortedCounts = sortedDates.map(d => dateCounts[d]);

    return {
      dates:  sortedDates,
      counts: sortedCounts
    };
  }

  // ---- Get Afghanistan boundary GeoJSON ----
  getBoundary() {
    return this.boundary;
  }
}

module.exports = new AfgDataProcessor();

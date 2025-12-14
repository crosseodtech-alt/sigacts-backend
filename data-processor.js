const fs = require('fs');
const csv = require('csv-parser');

class DataProcessor {
  constructor() {
    this.allIncidents = [];
    this.dateIndex = new Map(); // Maps dates to incident arrays
    this.types = new Set();
    this.categories = new Set();
    this.provinces = new Set();
    this.dates = [];
    this.iraqBoundary = null;
    this.isLoaded = false;
  }

  // Load and process the CSV file
  async loadData(csvPath, boundaryPath) {
    console.log('📊 Loading SIGACTS data...');
    
    return new Promise((resolve, reject) => {
      const incidents = [];
      
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          const dateTime = row.date_time_occ || '';
          const datePart = dateTime.split(' ')[0];
          const timePart = dateTime.split(' ')[1] || '';
          
          const incident = {
            lat: parseFloat(row.mgrs_Y),
            lng: parseFloat(row.mgrs_X),
            date: datePart,
            type: row['Incident Type'] || 'Unknown',
            category: row['Incident Category'] || 'N/A',
            targetCategory: row['Target Category'] || 'N/A',
            target: row.target || 'N/A',
            forceType: row.force_type || 'N/A',
            city: row.City || 'N/A',
            province: row.Province || 'N/A',
            time: timePart
          };
          
          incidents.push(incident);
          
          // Build indexes
          this.types.add(incident.type);
          this.categories.add(incident.category);
          this.provinces.add(incident.province);
          
          // Index by date for fast lookup
          if (!this.dateIndex.has(datePart)) {
            this.dateIndex.set(datePart, []);
          }
          this.dateIndex.get(datePart).push(incident);
        })
        .on('end', () => {
          this.allIncidents = incidents;
          this.dates = Array.from(this.dateIndex.keys()).sort((a, b) => 
            new Date(a) - new Date(b)
          );
          
          console.log(`✅ Loaded ${incidents.length} incidents`);
          console.log(`📅 Date range: ${this.dates[0]} to ${this.dates[this.dates.length - 1]}`);
          console.log(`🏷️  Types: ${this.types.size}, Categories: ${this.categories.size}, Provinces: ${this.provinces.size}`);
          
          // Load Iraq boundary
          if (boundaryPath && fs.existsSync(boundaryPath)) {
            this.iraqBoundary = JSON.parse(fs.readFileSync(boundaryPath, 'utf8'));
            console.log('🗺️  Loaded Iraq boundary GeoJSON');
          }
          
          this.isLoaded = true;
          resolve();
        })
        .on('error', reject);
    });
  }

  // Get all available dates
  getDates() {
    return this.dates;
  }

  // Get incidents for a specific date with optional filters
  getIncidents(date, filters = {}) {
    let incidents = this.dateIndex.get(date) || [];
    
    // Apply filters
    if (filters.type && filters.type !== 'all') {
      incidents = incidents.filter(i => i.type === filters.type);
    }
    
    if (filters.category && filters.category !== 'all') {
      incidents = incidents.filter(i => i.category === filters.category);
    }
    
    if (filters.province && filters.province !== 'all') {
      incidents = incidents.filter(i => i.province === filters.province);
    }
    
    return incidents;
  }

  // Get metadata (types, categories, provinces)
  getMetadata() {
    return {
      types: Array.from(this.types).sort(),
      categories: Array.from(this.categories).sort(),
      provinces: Array.from(this.provinces).sort()
    };
  }

  // Process data for treemap chart
  getTreemapData() {
    const treemapData = {};
    
    for (const incident of this.allIncidents) {
      const type = incident.type;
      const category = incident.category;
      
      if (!treemapData[type]) {
        treemapData[type] = {};
      }
      if (!treemapData[type][category]) {
        treemapData[type][category] = 0;
      }
      treemapData[type][category]++;
    }
    
    // Transform into ApexCharts format
    const series = [];
    for (const incidentType in treemapData) {
      const categories = treemapData[incidentType];
      const chartData = [];
      
      for (const category in categories) {
        chartData.push({
          x: category,
          y: categories[category]
        });
      }
      
      series.push({
        name: incidentType,
        data: chartData
      });
    }
    
    return series;
  }

  // Process data for radar charts (time of day patterns)
  getRadarData() {
    const radarDataEnemy = {
      'Early Night (00:00-03:59)': 0,
      'Early Morning (04:00-08:59)': 0,
      'Mid-Morning (09:00-11:59)': 0,
      'Early Afternoon (12:00-14:59)': 0,
      'Late Afternoon (15:00-17:59)': 0,
      'Evening (18:00-21:59)': 0,
      'Late Night (22:00-23:59)': 0
    };
    
    const radarDataExplosive = {
      'Early Night (00:00-03:59)': 0,
      'Early Morning (04:00-08:59)': 0,
      'Mid-Morning (09:00-11:59)': 0,
      'Early Afternoon (12:00-14:59)': 0,
      'Late Afternoon (15:00-17:59)': 0,
      'Evening (18:00-21:59)': 0,
      'Late Night (22:00-23:59)': 0
    };
    
    for (const incident of this.allIncidents) {
      if (!incident.time) continue;
      
      const hour = parseInt(incident.time.split(':')[0]);
      let timeCategory = '';
      
      if (hour >= 0 && hour < 4) timeCategory = 'Early Night (00:00-03:59)';
      else if (hour >= 4 && hour < 9) timeCategory = 'Early Morning (04:00-08:59)';
      else if (hour >= 9 && hour < 12) timeCategory = 'Mid-Morning (09:00-11:59)';
      else if (hour >= 12 && hour < 15) timeCategory = 'Early Afternoon (12:00-14:59)';
      else if (hour >= 15 && hour < 18) timeCategory = 'Late Afternoon (15:00-17:59)';
      else if (hour >= 18 && hour < 22) timeCategory = 'Evening (18:00-21:59)';
      else if (hour >= 22 && hour < 24) timeCategory = 'Late Night (22:00-23:59)';
      
      if (incident.type === 'Enemy Action') {
        radarDataEnemy[timeCategory]++;
      } else if (incident.type === 'Explosive Hazard') {
        radarDataExplosive[timeCategory]++;
      }
    }
    
    return {
      enemy: {
        categories: Object.keys(radarDataEnemy),
        values: Object.values(radarDataEnemy)
      },
      explosive: {
        categories: Object.keys(radarDataExplosive),
        values: Object.values(radarDataExplosive)
      }
    };
  }

  // Process data for heatmap chart (daily intensity by year)
  getHeatmapData() {
    const yearlyData = {};
    
    for (const incident of this.allIncidents) {
      const date = incident.date;
      if (!date) continue;
      
      const year = date.split('-')[0];
      
      if (!yearlyData[year]) {
        yearlyData[year] = {};
      }
      
      if (!yearlyData[year][date]) {
        yearlyData[year][date] = 0;
      }
      
      yearlyData[year][date]++;
    }
    
    // Calculate day of year for each date
    const getDayOfYear = (dateStr) => {
      const date = new Date(dateStr);
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date - start;
      const oneDay = 1000 * 60 * 60 * 24;
      return Math.floor(diff / oneDay);
    };
    
    // Transform into format with dates and counts arrays
    const dates = [];
    const counts = [];
    
    // Sort all dates
    const allDates = this.allIncidents
      .map(i => i.date)
      .filter(d => d)
      .sort();
    
    // Count incidents per date
    const dateCounts = {};
    for (const incident of this.allIncidents) {
      if (!incident.date) continue;
      dateCounts[incident.date] = (dateCounts[incident.date] || 0) + 1;
    }
    
    // Get unique sorted dates
    const uniqueDates = [...new Set(allDates)].sort();
    
    for (const date of uniqueDates) {
      dates.push(date);
      counts.push(dateCounts[date] || 0);
    }
    
    return { dates, counts };
  }

  // Get Iraq boundary GeoJSON
  getBoundary() {
    return this.iraqBoundary;
  }
}

module.exports = new DataProcessor();

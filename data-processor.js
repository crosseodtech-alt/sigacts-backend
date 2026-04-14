https://editor.p5js.org/jcross6233/full/zySONMGSS

I am looking to expand this project with more information. I have found a dataset with informaiton from the afghanistan war and want to replicate what I have here, esentially expanding the project to 4 "tabs". 2 with maps, and 2 with data viz. Take a look at this dataset that I have here and let me know what I will need to do in order to get this to work. I know that I have to pare the event category and type down to fewer choices. Also, should I limit the dataset to lat/long or just MGRS? The link goes to the project page ans should let you access the code as is.
Apr 6
Searched the web, ran 2 commands, viewed a file

Good, I have a solid picture of the dataset now. Here's a thorough breakdown of everything you'll need to think through before building this out.
Dataset Overview

431,547 records spanning roughly 2008–2014, with 6 fields: time, event_type, event_category, mgrs, lat, lon. Every row has both lat/lon and MGRS -- no missing values in either column. That's the good news.
MGRS vs. Lat/Lon

Use lat/lon. Here's why:

    Leaflet (which you're likely using for the map tab) natively ingests decimal degrees. Your lat/lon values are in a 35.83523N / 063.84149E string format, so you'll need a small parser to strip the N/E and convert to signed decimals -- but that's trivial compared to a full MGRS-to-decimal converter.
    MGRS conversion in the browser requires either a library or a substantial math implementation. It adds complexity with zero benefit since you already have clean lat/lon.
    Keep MGRS in the dataset as a display field (useful to show in popups for the military context), but drive all map logic off lat/lon.

The Category/Type Consolidation Problem

This is your biggest data prep task. Right now you have:

    event_type: ~90 unique values (messy -- many are actually categories that leaked into the wrong column, e.g., "Direct Fire," "IED Threat," "Indirect Fire" appearing as event_types)
    event_category: 130+ unique values, with significant redundancy and noise (e.g., "UNEXPLODED ORDNANCE" and "Unexploded Ordnance" are the same thing; "IED Hoax" and "Hoax IED" are duplicates; "event_category" and "ReportKey" are clearly header bleed-through artifacts)

Recommended consolidation for event_type (6–8 buckets):
Consolidated Label	Captures
Enemy Action	Enemy Action, Direct Fire, Indirect Fire, Attack Threat, IED Explosion, SAFIRE
Explosive Hazard	Explosive Hazard, IED Found and Cleared, IED Threat, Unexploded Ordnance, Mine Strike/Find
Threats	Threats, Attack Threat, Kidnapping Threat, Assassination Threat, Intimidation Threat
Friendly Action	Friendly Action, CAS, Counter-Insurgency, Escalation of Force
Criminal Event	Criminal Event, Murder, Theft, Smuggling, Narcotics, Corruption
Non-Combat	Non-Combat Event, Meeting, Accident, Medevac, Reintegration
Other/Unknown	Other, None Selected, NULL
For event_category, consolidate to ~10–12 top categories by count, then bucket the rest into "Other." The top candidates by volume:

    Direct Fire (103k)
    IED Found/Cleared (40k)
    IED Explosion (33k)
    IED Threat (25k)
    Indirect Fire (23k)
    Attack Threat (22k)
    Threats (21k)
    Reported Location (18k)
    Cache Found/Cleared (13k)
    Detain (10k)
    Unexploded Ordnance (10k)
    Other (everything else)

Four-Tab Architecture Plan

Based on your Iraq project structure, here's a natural expansion:
Tab	Content
Map 1 -- Incident Density	Leaflet heatmap + cluster toggle by category, similar to your Iraq map
Map 2 -- Temporal Map	Same base map, but filterable by year (2008–2014) -- shows how the conflict shifted spatially over time
Viz 1 -- Category Dashboard	Bar/treemap of incident counts by category; timeline of events per month
Viz 2 -- Conflict Intensity	A spiral or calendar heatmap of daily incident counts (your Iraq spiral would translate directly here)
Data Prep Steps Before You Start Coding

    Parse lat/lon strings -- strip N/E suffixes and convert to floats. Negative values aren't an issue since Afghanistan is entirely in the NE quadrant.
    Normalize case on categories -- e.g., UNEXPLODED ORDNANCE → Unexploded Ordnance.
    Consolidate event_type -- map all ~90 values to your 6–8 buckets using a lookup object in JS.
    Consolidate event_category -- keep the top 11 by count, map everything else to Other.
    Parse timestamps -- you'll want year and month extracted for the temporal filter on Map 2 and the timeline viz.
    Strip junk rows -- there are a handful of rows where event_type or event_category contains header strings like "event_type" or "ReportKey". Easy to filter with a simple exclusion list.

Performance Consideration

At 431k rows, you cannot load the raw CSV in the browser the way you'd do it with a smaller dataset. For context, your Iraq dataset was ~200k and already required careful handling. You have a few options:

    Pre-aggregate -- process the CSV in Python/R, generate summary JSON files (e.g., monthly counts by category, top 10k incidents for mapping), and load those instead.
    Spatial sampling -- for the map, display a random 10–15% sample (still visually representative at the heatmap level) while keeping full data for the charts.
    Server-side filtering -- since you already have a Node/Express backend from your job map project, you could serve filtered slices on demand.

The pre-aggregation route is probably the cleanest fit for a p5.js-style project. I can help you write the Python or R script to prep the output files whenever you're ready to move into that phase.

I think you misunderstood a couple of things, so let me clarify. I want to keep the Iraq data as is, and have an exact replica of how to display the data for the Afghanistan data. This means a map with the Afghanistan JSON in leaflet and the same kind of selction window to filter data. It also means another data viz tab showing the Afghanistan data just like the Iraq. I will pare my Afghan data into the same categories as the Iraq data so I can reuse some of the code. I think I will also just eliminate the MGRS column as its not needed for geolocating the event eince I have lat/long.

As far as data hosing, I will use the same format as I have with iraq in that the data will be JSON and be hosted in the Render database.

Do you understand where I am at on this? or would you like further clarification?
Apr 6

Yes, that makes complete sense now. To summarize what you're building:

    Keep the Iraq tabs exactly as they are -- the map tab and the data viz tab stay untouched.
    Add two new tabs mirroring those exact Iraq tabs, but fed by Afghanistan data: one Leaflet map with the same filter/selection panel, and one data viz tab with the same chart types.
    Reuse the existing code structure as much as possible -- same category schema, same UI components, same Leaflet setup. The Afghanistan data just slots in as a parallel dataset.
    Drop the MGRS column during your data prep since lat/lon is all you need.
    Pre-process the Afghan CSV into JSON matching the same schema your Iraq data already uses, then host it on Render the same way.

The key prep work on your end before touching the code:

    Consolidate your Afghan event_type and event_category values to match whatever category labels your Iraq JSON already uses.
    Strip MGRS, parse the lat/lon strings to clean decimals, parse timestamps, and export to JSON in the same shape as your Iraq data.
    Upload to Render.

The one thing I'd want to look at before you get too far into coding is your existing project source -- specifically how the Iraq JSON is structured and how the tab/filter logic is wired up -- so I can give you precise guidance on where to duplicate things versus where to parameterize. Can you share the sketch code directly, or paste the relevant files here? The /full/ URL renders the output but doesn't expose the source.

https://editor.p5js.org/jcross6233/sketches/zySONMGSS
Apr 6
Fetched: P4-Final by jcross6233 -p5.js Web Editor

The editor is requiring a login to access the source files. You'll need to either share the code directly by pasting it here, or make the sketch public and share a direct link to the individual files.

The easiest path is probably just copying and pasting the contents of your key files -- likely sketch.js, index.html, and whatever separate JS files you have for the map and viz tabs. Even just sketch.js and index.html would give me enough to map out exactly where to duplicate things for the Afghanistan tabs.
Apr 6

Let me read the sketch.js file since it's the most important piece:
Viewed 2 files

Good, I have the full picture now. Here's exactly what you need to do across all three files:
The Architecture

Your Iraq data has these fields per incident: type, category, targetCategory, target, forceType, time, city, province, lat, lng. Your Afghanistan data has: time, event_type, event_category, lat, lon. The popup will be simpler for Afghanistan -- that's fine, you just display what you have.
Changes Needed by File
index.html -- 4 structural additions

1. Two new main tab buttons -- currently you have Geographic Map and Data Visualizations. You need four:
html

<button class="main-tab-btn active" onclick="switchMainView('iraq-map')">Iraq: Map</button>
<button class="main-tab-btn" onclick="switchMainView('iraq-dash')">Iraq: Visualizations</button>
<button class="main-tab-btn" onclick="switchMainView('afg-map')">Afghanistan: Map</button>
<button class="main-tab-btn" onclick="switchMainView('afg-dash')">Afghanistan: Visualizations</button>

2. A second map <div> inside a new view-container for Afghanistan. Copy the entire #map-view block, rename all IDs with an afg- prefix (afg-map, afg-control-panel, afg-date-slider, afg-type-filter, afg-category-filter, afg-legend, etc.), and update the <h2> title and date range text.

3. A second dashboard <div> -- copy the entire #dashboard-view block, rename all IDs with an afg- prefix (afg-dashboard-view, afg-treemap-chart, afg-radar-chart-enemy, afg-radar-chart-explosive, afg-bar-chart, etc.), and update the header title.

4. Drop the Province filter from the Afghanistan control panel -- your data doesn't have a province field, just type and category. You can keep the same layout but remove that <select> block.
sketch.js -- parallel Afghanistan functions

The pattern is: duplicate every Iraq function with an Afg suffix and point it at the Afghanistan API URL and the afg- prefixed DOM elements. Specifically:

    Add const AFG_API_URL = 'https://your-afg-backend.onrender.com';
    Duplicate all map globals: myAfgMap, afgMarkerCluster, afgHeatLayer, afgDates, etc.
    Duplicate all dashboard globals: afgTreemapChart, afgRadarChartEnemy, etc.
    Duplicate initMap() → initAfgMap() -- change the .setView() coordinates to Afghanistan ([33.9, 67.7], 6), point the boundary fetch at your AFG API, reference all afg- DOM element IDs
    Duplicate loadMetadata(), loadDates(), loadDate(), populateFilters(), applyFilters(), drawIncidents(), createIncidentMarker(), switchViewMode(), updateHeatmap() -- all with Afg variants using AFG_API_URL and afg- DOM IDs
    The createIncidentMarker() popup for Afghanistan will be simpler since you only have type, category, and time -- no city/province/target fields
    Duplicate loadDashboardData(), loadTreemapData(), loadRadarData(), loadHeatmapData(), and all four init*Chart() functions with Afg variants pointing at afg- chart container IDs
    Update switchMainView() to handle all four view names, and update resizeCharts() to resize all 8 chart instances

style.css -- minimal changes

The only thing that might need attention is if you want the Afghanistan map's #afg-control-panel or #afg-legend styled differently (e.g., a slightly different accent color to visually distinguish the two theaters at a glance). Otherwise the existing CSS rules will cover the new IDs if you structure the HTML identically.
Backend Work (Render)

Same structure as Iraq -- you need an Afghanistan Express backend with these endpoints:

    GET /api/dates -- all unique dates from your cleaned Afghan JSON
    GET /api/metadata -- unique types and categories (no provinces needed)
    GET /api/incidents/:date?type=&category= -- filtered daily slice
    GET /api/dashboard/treemap
    GET /api/dashboard/radar
    GET /api/dashboard/heatmap
    GET /api/boundary -- Afghanistan GeoJSON boundary (available free from natural earth or gadm.org)

The heatmap endpoint date range will span 2008--2014, so the initBarChart() color scale ranges may want a slight tweak since Afghanistan had higher sustained daily counts than Iraq in certain years -- worth checking once data is loaded.
Data Prep Checklist Before Backend Work

    Strip MGRS column
    Parse lat/lon strings (35.83523N → 35.83523, 063.84149E → 63.84149)
    Normalize your consolidated event_type and event_category values to match the Iraq schema labels exactly (Enemy Action, Explosive Hazard, Friendly Fire for types -- or whatever subset you decide on)
    Parse timestamps into a consistent YYYY-MM-DD date field
    Export to JSON

Want me to write the Python script to do that data prep, or would you rather start with scaffolding out the HTML and JS changes?

This is going to be done in JS and HTML, I dont want to switch to Python right now.

Also, I cant remember, does my project use the Lat Long, or does it use the MGRS in leaflet? For some reason I thought it was using MGRS for the data pointing.
Apr 6

Your project uses lat/lng -- not MGRS. You can see it clearly in sketch.js:
js

let marker = L.marker([incident.lat, incident.lng], { icon: icon });

and in the heatmap:
js

return [incident.lat, incident.lng, intensity];

Leaflet doesn't natively understand MGRS at all -- it always works in decimal degrees. MGRS is only in your raw CSV as a reference field and never actually gets used in the visualization. So dropping it during your data prep is the right call and won't affect anything.

As for the data prep -- you want to do it in JS. The cleanest approach would be a small standalone Node.js script that reads your raw Afghanistan CSV, cleans and consolidates the fields, strips MGRS, parses the lat/lon strings to decimals, and writes out the JSON. You'd run it once locally to generate the data file, then load that into your Render backend the same way you did with Iraq. Want me to write that script?

lets go ahead and do that.
Apr 6

I'll need to look at your Iraq backend to understand the exact JSON shape the frontend expects before writing the Afghan prep script. Do you have the backend code you can share? Specifically I'm looking for:

    How the incidents are stored/structured in MongoDB
    What the /api/incidents/:date response object looks like
    What the /api/dashboard/treemap, /radar, and /heatmap endpoints return

If you have the backend server.js or equivalent, paste that and I can write the Afghan prep script to output data in exactly the right shape to slot into the same backend structure.

can you access this site???

https://github.com/crosseodtech-alt/sigacts-backend/tree/main
5:01 PM

I can try:
Failed to fetch: https://github.com/crosseodtech-alt/sigacts-backend/tree/main

No -- GitHub blocks automated fetching via robots.txt. You'll need to paste the backend code directly here. The files I need are most likely server.js (or index.js) and if you have a separate data loading or schema file, that too. Even just the server file should be enough to see the response shapes.

ok, it was worth a shot. Its been so long since I did this project that I forget how It was organized. I want the new afghanistan addition to work smoothly, so I was hoping you could help me read it.  

let me get into this and get back to you. I may find what I need here.
5:03 PM

Sounds good -- take your time digging through it. When you come back, just paste the relevant sections and we'll get the Afghan prep script written to match exactly.

The key things to look for while you're in there:

    The shape of a single incident object as it's stored (field names, how lat/lng are keyed)
    What the three dashboard endpoints (/treemap, /radar, /heatmap) return -- specifically the structure of the series data
    Whether the data is stored as raw JSON files or loaded into MongoDB, since that affects how we structure the Afghan output

for the problem I am having with the N and E being in the lats and longs, can we just sort that out in the code? or does it need to be done before it is thrown into my render/github setup?
1:59 PM

It can absolutely be sorted out in the Node.js prep script before the data hits Render -- and that's the better place to handle it. Here's why:

    You want clean decimal numbers stored in your database/JSON, not strings with N/E suffixes. If you store them dirty, you'd have to parse them on every single API request, in the frontend, and anywhere else the data gets touched.
    Do it once in the prep script, store it clean, and every downstream piece (Leaflet, heatmap, dashboard) just works without any extra handling.

The conversion itself is trivial in JS:
js

function parseCoord(str) {
  return parseFloat(str.replace(/[NSEW]/g, ''));
}

Since all of Afghanistan is in the northern/eastern hemisphere, you'll never have negative values to worry about -- just strip the letters and parse the float. That'll be a one-liner inside the prep script when we write it.

So the short answer: handle it in the prep script, store clean decimals, don't touch it again after that.

ok. I think i finally have my data cleaned to where I am happy with it. I have uploaded both my shapefile and sfghanistan sigacts into the same folder in github as my other data. I uploaded them here for you to see how they are named as well as how they look. Lets start making the next steps forward. My approach, which may be wrong and I want you to correct me if there is a better way, is to format the index.html and style.css before moving to the sketch.js
2:03 PM

Let me look at both files first:
Viewed 2 files, ran a command

Good. I have everything I need. Your approach of doing HTML/CSS first then sketch.js is actually the right order -- you want the DOM elements in place before wiring up the JS logic. A couple of notes before you share the backend code and we dive in:

On your cleaned data: You still have MGRS in there as column 4, and the column headers are mgrs_Y and mgrs_X for lat/lon (which is a bit counterintuitive -- Y is latitude, X is longitude, which is correct mathematically but worth keeping in mind). The prep script will just reference columns by name and ignore MGRS entirely.

One thing to clean up before the script: There's a stray header row in the data (the Incident Type and Incident Category entries with count 1 -- those are rows where the header leaked in). The script will filter those out.

Your three types are clean: Enemy Action, Explosive Hazard, Friendly Fire -- matches Iraq exactly.

The GeoJSON looks good -- valid FeatureCollection, ready to serve directly from the backend.

So yes -- go ahead and share the backend code when you find it and we'll tackle HTML/CSS first, then sketch.js, then the prep script and backend additions all with a clear picture of the full data flow.

fun fact with the X and Y.... the original data source for the iraq data had them that way and I just had you write that into the script.
2:05 PM

Ha -- that tracks. MGRS grid coordinates are easting (X) and northing (Y), so whoever originally labeled the columns was thinking in grid coordinate terms rather than geographic lat/lon terms. Easy to mix up, and since Afghanistan is entirely NE quadrant it never caused a wrong-sign problem that would have tipped you off.

Just something to keep in mind when the prep script references those column names -- we'll pull mgrs_Y as lat and mgrs_X as lon, strip the N/E, and store them as lat and lng to match what your frontend already expects from the Iraq data.

Have you tracked down the backend code yet?

s
2:06 PM

Now I have the complete picture. Your approach of HTML/CSS first is correct. Here's what I can see:

Good news: The backend architecture is almost entirely reusable. The data-processor.js already handles your Afghanistan CSV column names (date_time_occ, Incident Type, Incident Category, mgrs_Y, mgrs_X) -- it just needs a second instance pointed at the Afghan data. The heatmap for Afghanistan won't need a separate JSON file like Iraq does since the date range is contained within the CSV itself.

One important difference: Afghanistan has no City, Province, Target Category, target, or force_type columns, so the incident object will be simpler. The backend and frontend both need to reflect that.

Here's the plan before we write any code -- confirm you agree with this structure:

Backend: Add a second DataProcessor instance (afgProcessor) in server.js loading AfgSigacts_cleaned.csv and af.json, with all routes duplicated under /api/afg/.... No separate heatmap JSON needed -- the processor calculates it directly from the CSV data the same way it does radar.

Frontend index.html: Four tab buttons, two new view containers with afg- prefixed IDs, Province filter removed from the Afghan control panel.

sketch.js: All Afghan functions namespaced with Afg, pointing at AFG_API_URL and afg- DOM elements.

Does that structure match what you're envisioning? And do you want the Afghan backend on the same Render service as Iraq, or a separate one?

this is exactly what I am looking for. I plan on using the same render service, and I want everything to sit in the same folders as where it currently sits.
2:09 PM

Perfect. Let's start with index.html since you have everything you need to do that now. Here's the updated file:
Viewed a file, created a file

Now the CSS -- only additions needed, nothing from the original gets removed:
Created a file, read a file

Here's a summary of every change made and why:

index.html changes:

    Four tab buttons replacing the original two, each with a flag emoji for quick visual identification
    Iraq views kept with identical IDs -- nothing in your existing sketch.js breaks
    Afghanistan map view is a direct copy with all IDs prefixed afg- and the Province filter removed since that field doesn't exist in your data
    Afghanistan dashboard is a direct copy with afg- prefixed IDs and the date range updated to 2008–2014
    switchDashTab() calls now pass a theater argument ('iraq' or 'afg') so the JS can target the right set of tab buttons and panes -- you'll see how that works when we write sketch.js

style.css changes:

    All original rules untouched
    #afg-map added alongside #map for the absolute positioning
    #afg-control-panel mirrors #control-panel exactly
    #afg-legend mirrors #legend exactly
    All paired selectors (sliders, stats, scrollbars) extended with afg- variants
    Mobile breakpoint covers both control panels and both legends

Ready to move to sketch.js whenever you are.
Index
Code · HTML 
Style
Code · CSS 

looks good, lets do the sketch now.
2:13 PM
Created a file, read a file

Here's a breakdown of every meaningful decision made:

Lazy initialization -- the Afghanistan map and dashboard don't load until the user first clicks those tabs. This is important because Leaflet throws errors if you try to initialize a map inside a hidden div, and it avoids making 6 extra API calls on page load before the user has even looked at the Afghan data.

switchMainView() rewritten -- uses a lookup object instead of if/else chains, handles all four view names cleanly, and triggers the lazy-init logic on first visit.

switchDashTab() updated -- now takes a theater argument ('iraq' or 'afg') so it scopes its button/pane toggling to the correct dashboard container only, preventing one theater's tabs from interfering with the other.

renderHeatmapChart() shared function -- the heatmap chart config is identical between Iraq and Afghanistan, so rather than duplicating 80 lines twice, both initBarChart() and initAfgBarChart() call the same renderer. It takes a selector and a setter callback to assign the chart instance back to the right variable.

Afghanistan popup is simpler -- only shows type, category, date, and time since you don't have city/province/target fields in the Afghan data.

Both API URLs point to the same Render service -- AFG_API_URL and API_URL are the same value right now, ready for the backend routes we add next.

Next step is the backend -- data-processor.js and server.js. Ready when you are.
Sketch
JS 

looking good. One thing I want to change to the original though. since the dataset is so small for both iq and afg, I want to remove the Friendly fire visualizations in the incident type vis. should we handle that now before moving on?
2:19 PM

Good call -- cleaner to handle it now before the backend work. The change touches three places:

    index.html -- remove the Friendly Fire legend item from both map views
    style.css -- nothing to change
    sketch.js -- remove Friendly Fire from getIncidentColor() default fallback (it already falls to grey, so no crash, but cleaner to be explicit), and more importantly remove it from the treemap -- that's driven by whatever the backend sends, so the real fix is in data-processor.js

Actually, since the treemap, radar, and heatmap all pull from the raw data on the backend, the cleanest place to filter Friendly Fire out of the visualizations is in data-processor.js -- specifically in getTreemapData() and getRadarData(). The map markers can stay since Friendly Fire incidents are real events worth showing geographically, you just don't want them cluttering the charts.

So the question before we edit: do you want Friendly Fire completely gone (no markers on the map either, removed from the type filter dropdown), or just excluded from the dashboard visualizations while still being plottable on the map?

I want the markers to be on the map, just not on the treemap.
2:20 PM

Easy fix then -- one line in getTreemapData() in data-processor.js. The radar already only processes Enemy Action and Explosive Hazard explicitly, so Friendly Fire was never in there to begin with. The heatmap just counts all incidents by day so Friendly Fire stays in that count too, which is correct since it's a real event contributing to daily intensity.

The only change needed is in getTreemapData() -- add a filter to skip Friendly Fire incidents when building the treemap aggregation:
Viewed 2 files

One line added to the loop. Here's the updated data-processor.js:
Ran a command, edited a file, read a file

That's the only change needed. Since this same data-processor.js will serve as the base for the Afghanistan processor too, the Friendly Fire exclusion will carry over to both treemaps automatically when we build the backend out.

Ready to move on to the backend -- server.js and the new Afghanistan processor?
Data processor
JS 

i see you dont have anything in this code for loading the afg JSON or data. or am I missing those lines?
2:21 PM

You're not missing anything -- I only made the one-line change to getTreemapData() and left everything else untouched. The Afghanistan data loading gets added in the next step when we work on the backend. The plan is:

    data-processor.js -- this becomes the Iraq-specific processor, stays largely as-is
    afg-data-processor.js -- a new parallel file for Afghanistan, same class structure but pointed at the Afghan CSV and af.json, with the simplified incident object (no city/province/target fields), and getHeatmapData() calculating directly from the CSV instead of reading a separate JSON file like Iraq does
    server.js -- loads both processors on startup and adds all the /api/afg/... routes alongside the existing /api/... Iraq routes

That's the full backend picture. Want to go ahead and write all three now?

totally makes sense. thank you. yes, lets move forward and write them now.
2:22 PM

Let's go. I'll write all three files:
Read full data-processor.js to use as base for afg version
Want to be notified when Claude responds?


Claude is AI and can make mistakes. Please double-check responses.
Data processor · JS
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
    this.heatmapData = null; // 2003-2011 heatmap data from JSON
    this.isLoaded = false;
  }
 
  // Load and process the CSV file
  async loadData(csvPath, boundaryPath, heatmapJsonPath) {
    console.log('📊 Loading SIGACTS data...');
    
    return new Promise((resolve, reject) => {
      const incidents = [];
      
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          const dateTime = row.date_time_occ || '';
          const datePart = dateTime.split(' ')[0];
          const timePart = dateTime.split(' ')[1] || '';
          
          // Convert M/D/YYYY to YYYY-MM-DD
          let formattedDate = datePart;
          if (datePart.includes('/')) {
            const parts = datePart.split('/');
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              const year = parts[2];
              formattedDate = `${year}-${month}-${day}`;
            }
          }
          
          const incident = {
            lat: parseFloat(row.mgrs_Y),
            lng: parseFloat(row.mgrs_X),
            date: formattedDate,
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
          if (!this.dateIndex.has(formattedDate)) {
            this.dateIndex.set(formattedDate, []);
          }
          this.dateIndex.get(formattedDate).push(incident);
        })
        .on('end', () => {
          this.allIncidents = incidents;
          // Sort dates as strings (YYYY-MM-DD format sorts correctly)
          this.dates = Array.from(this.dateIndex.keys()).sort();
          
          console.log(`✅ Loaded ${incidents.length} incidents`);
          console.log(`📅 Date range: ${this.dates[0]} to ${this.dates[this.dates.length - 1]}`);
          console.log(`🏷️  Types: ${this.types.size}, Categories: ${this.categories.size}, Provinces: ${this.provinces.size}`);
          
          // Load Iraq boundary
          if (boundaryPath && fs.existsSync(boundaryPath)) {
            this.iraqBoundary = JSON.parse(fs.readFileSync(boundaryPath, 'utf8'));
            console.log('🗺️  Loaded Iraq boundary GeoJSON');
          }
          
          // Load heatmap data (2003-2011)
          if (heatmapJsonPath && fs.existsSync(heatmapJsonPath)) {
            this.heatmapData = JSON.parse(fs.readFileSync(heatmapJsonPath, 'utf8'));
            console.log('📊 Loaded heatmap data (2003-2011)');
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
 
  // Process data for treemap chart - return series data
  getTreemapData() {
    const treemapData = {};
    
    for (const incident of this.allIncidents) {
      const type = incident.type;
      const category = incident.category;
 
      // Exclude Friendly Fire from treemap -- still visible on map
      if (type === 'Friendly Fire') continue;
 
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
    
    return { series };
  }
 
  // Process data for radar charts - return data only
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
 
  // Get heatmap data (2003-2011 from JSON)
  getHeatmapData() {
    if (this.heatmapData) {
      return {
        dates: this.heatmapData.dates,
        counts: this.heatmapData.counts
      };
    }
    // Fallback to empty if no data
    return { dates: [], counts: [] };
  }
 
  // Get Iraq boundary GeoJSON
  getBoundary() {
    return this.iraqBoundary;
  }
}
 
module.exports = new DataProcessor();
 


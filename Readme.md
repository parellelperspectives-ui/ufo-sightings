# 🛸 UFO Sightings Dashboard

An interactive data visualization dashboard to explore UFO sightings across time, geography, and event characteristics.

## 🌐 Live Demo

👉 https://parallel-perspectives.com/infographics/ufo-sightings

---

## 📊 Overview

This project provides an interactive interface to explore UFO sightings using:

* 📅 Temporal filtering (by year)
* 🌍 Geographic visualization (interactive map)
* 🧩 Dynamic filters (shape, country)
* 📈 Charts and KPIs
* 📋 Detailed event table
* 🔗 Shareable URLs (state preserved)

The dashboard is designed for **exploratory data analysis**, allowing users to quickly identify trends, patterns, and anomalies.

---

## 🚀 Features

### 🔎 Filtering

* Filter sightings by:

  * Year
  * Shape
  * Country
* Filters are **interdependent**:

  * Selecting a country updates available shapes
  * Selecting a shape updates available countries

### 🗺 Map Visualization

* Built with Leaflet + MarkerCluster
* Automatic clustering of events
* Smooth zoom and fit-to-data behavior
* Click from table → map focuses and opens popup
* Reset map view button

### 📊 Analytics

* KPI cards:

  * Total sightings
  * Countries represented
  * Most common shape
  * Average duration
* Charts:

  * Sightings over time
  * Top shapes
  * Top countries
  * Sightings by hour

### 📋 Event Table

* Scrollable table with:

  * City, country, shape, duration, comments
* “View” button:

  * Centers map on event
  * Opens popup
  * Scrolls to map

### 🔗 Sharing

* Share current state via:

  * Copy URL
  * Email
  * X (Twitter)
  * Facebook
  * LinkedIn
* URL includes filters:

  ```
  ?year=2004&shape=triangle&country=us
  ```

### 🧠 Methodology Modal

* Explains:

  * Data processing
  * Filtering logic
  * Map behavior
  * Limitations

---

## 🗂 Data Source

Data comes from:

👉 https://huggingface.co/datasets/kcimc/NUFORC

The dataset includes:

* Date & time
* Location (city, country, coordinates)
* Shape
* Duration
* Description

---

## ⚙️ Tech Stack

* **React**
* **D3.js** (data loading & parsing)
* **Leaflet + Leaflet.markercluster**
* **Recharts**
* **Tailwind CSS**
* **Webpack**

---

## 🧩 Project Structure

```
src/
├── components/
│   ├── dashboard/
│   │   ├── KPISection.jsx
│   │   └── ChartSection.jsx
│   ├── filters/
│   │   └── Dropdowns.jsx
│   ├── map/
│   │   └── MapView.jsx
│   ├── table/
│   │   └── EventTable.jsx
│
├── services/
│   └── dashboardService.js
│
├── utils/
│   └── formatters.js
│
├── App.jsx
└── index.jsx
```

---

## 🔄 Data Processing

1. CSV loaded with D3 (`d3.dsv`)
2. Rows normalized (trim + encoding fixes)
3. Year extracted from datetime
4. Coordinates parsed (lat/lon)
5. Invalid rows filtered out

Two datasets are maintained:

* `data` → full dataset
* `mapData` → only rows with valid coordinates

---

## 🔗 URL State Management

Filters are synced with the URL:

* Read on load
* Updated on change
* Enables sharing and persistence

Example:

```
/?year=1998&shape=light&country=us
```

---

## 🎯 UX Highlights

* Smooth scrolling (map & table)
* Auto-open popup on event selection
* Smart filter narrowing
* Responsive layout
* Dark mode support (UI only, map stays light for readability)

---

## 🛠 Installation

```bash
npm install
npm start
```

Build for production:

```bash
npm run build
```

---

## 📦 Deployment

Configured via Webpack:

```js
publicPath: '/infographics/data-ufo/'
```

Make sure assets (CSV, etc.) are correctly copied to `/public`.

---

# potential issue
issue with import fs, {constants as fsConstants} from 'node:fs/promises';
go to node_modules>open
change with 
import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

# ICON PARAMETERS

 const shapeIcons = {
      circle: { symbol: '●', color: '#1E90FF' },
      triangle: { symbol: '▲', color: '#4682B4' },
      light: { symbol: '✦', color: '#5F9EA0' },
      disk: { symbol: '⬤', color: 'darkgrey' },
      fireball: { symbol: '🔥', color: '#4169E1' },
      oval: { symbol: '◯', color: '#87CEEB' },
      sphere: { symbol: '◉', color: '#000000' },
      cigar: { symbol: '▭', color: '#000000' },
      formation: { symbol: '★', color: '#4682B4' },
      chevron: { symbol: '⌃', color: '#6CA6CD' },
      other: { symbol: '?', color: '#000000' },
    };

# MAP

map height is configurable in 
```html
 <div className="overflow-hidden border border-slate-200 dark:border-slate-800">
      <div id="map" style={{ height: '400px' }} />
    </div>
```

## ⚠️ Notes & Limitations

* Data quality varies (manual reports)
* Some locations are missing or imprecise
* Duration formats are inconsistent
* Trends are exploratory, not definitive

---

## ✨ Future Improvements

* Animated timeline playback
* Heatmap mode
* Country-level aggregation
* Improved map styling (MapLibre / vector tiles)
* Save & share presets

---

## 👨‍💻 Author

Built by
👉 https://parallel-perspectives.com/

---

## 📜 License

This project is for educational and visualization purposes.
Refer to the dataset license on Hugging Face for data usage.



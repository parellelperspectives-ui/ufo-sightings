export function parseUfoData(raw) {
  return raw
    .map((d, i) => {
      const lat = parseFloat(d.latitude);
      const lon = parseFloat(d['longitude '] ?? d.longitude);

      return {
        ...d,
        year: new Date(d.datetime).getFullYear(),
        lat,
        lon,
        rowId: i,
      };
    })
    .filter(d => !isNaN(d.lat) && !isNaN(d.lon) && !isNaN(d.year));
}

export function filterUfoData(data, { year, shape, country }) {
  return data.filter(d =>
    d.year === year &&
    (shape === 'all' || d.shape === shape) &&
    (country === 'all' || d.country === country)
  );
}

export function getAvailableShapes(data, year) {
  return [...new Set(data.filter(d => d.year === year).map(d => d.shape))]
    .filter(Boolean)
    .sort();
}

export function getAvailableCountries(data, year) {
  return [...new Set(data.filter(d => d.year === year).map(d => d.country))]
    .filter(Boolean)
    .sort();
}

export function getAvailableYears(data) {
  return [...new Set(data.map(d => d.year))].sort((a, b) => a - b);
}
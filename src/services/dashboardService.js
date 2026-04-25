export function getSightingsByYear(data) {
  if (!Array.isArray(data) || !data.length) return [];

  const counts = {};

  data.forEach(item => {
    if (item.year == null || item.year < 1905) return;
    counts[item.year] = (counts[item.year] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([year, count]) => ({
      year: Number(year),
      count
    }))
    .sort((a, b) => a.year - b.year);
}

export function getTopShapes(data, limit = 8) {
  if (!Array.isArray(data) || !data.length) return [];

  const counts = {};

  data.forEach(item => {
    const shape = item.shape || 'unknown';
    counts[shape] = (counts[shape] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([shape, count]) => ({ shape, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getTopCountries(data, limit = 10) {
  if (!Array.isArray(data) || !data.length) return [];

  const counts = {};

  data.forEach(item => {
    const country = (item.location || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .pop() || 'unknown';

    counts[country] = (counts[country] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getTotalSightings(data) {
  if (!Array.isArray(data)) return '0';
  return data.length.toLocaleString();
}

export function getCountryCount(data) {
  if (!Array.isArray(data)) return '0';

  return new Set(
    data
      .map(d =>
        (d.location || '')
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .pop()
      )
      .filter(Boolean)
  ).size.toLocaleString();
}

export function getMostCommonShape(data) {
  if (!Array.isArray(data) || !data.length) return 'N/A';

  const counts = {};

  data.forEach(item => {
    const shape = item.shape || 'unknown';
    counts[shape] = (counts[shape] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : 'N/A';
}

export function getAverageDuration(data) {
  if (!Array.isArray(data) || !data.length) return 'N/A';

  const durations = data
    .map(d => {
      const raw = String(d.duration || '').toLowerCase();
      if (!raw) return null;

      const hours   = raw.match(/(\d+\.?\d*)\s*hour/);
      const minutes = raw.match(/(\d+\.?\d*)\s*min/);
      const seconds = raw.match(/(\d+\.?\d*)\s*sec/);

      let total = 0;
      if (hours)   total += parseFloat(hours[1])   * 3600;
      if (minutes) total += parseFloat(minutes[1]) * 60;
      if (seconds) total += parseFloat(seconds[1]);

      return total > 0 ? total : null;
    })
    .filter(v => v !== null);

  if (!durations.length) return 'N/A';

  const avg = durations.reduce((sum, n) => sum + n, 0) / durations.length;

  if (avg < 60) return `${Math.round(avg)} sec`;

  const minutes = Math.floor(avg / 60);
  const seconds = Math.round(avg % 60);

  return seconds ? `${minutes} min ${seconds} sec` : `${minutes} min`;
}

export function getSightingsByHour(data) {
  const counts = Array(24).fill(0);

  data.forEach(d => {
    if (!d.date) return;

    const parts = d.date.split(' ');
    if (parts.length < 2) return;

    const timePart = parts[1];
    const hour = parseInt(timePart.split(':')[0], 10);

    if (!isNaN(hour) && hour >= 0 && hour < 24) {
      counts[hour]++;
    }
  });

  return counts.map((count, hour) => ({ hour, count }));
}

export function getSightingsByMonth(data) {
  if (!Array.isArray(data) || !data.length) return [];

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const counts = Array(12).fill(0);

  data.forEach(item => {
    if (!item.date) return;
    const month = parseInt(item.date.split('-')[1], 10) - 1;
    if (month >= 0 && month < 12) counts[month]++;
  });

  return counts.map((count, i) => ({ month: months[i], count }));
}

export function getCharacteristicsFrequency(data, limit = 8) {
  if (!Array.isArray(data) || !data.length) return [];

  const counts = {};

  data.forEach(item => {
    if (!Array.isArray(item.characteristics)) return;
    item.characteristics.forEach(c => {
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .map(([characteristic, count]) => ({ characteristic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getObserverDistribution(data) {
  if (!Array.isArray(data) || !data.length) return [];

  const buckets = { '1': 0, '2': 0, '3': 0, '4+': 0 };

  data.forEach(item => {
    const n = Number(item.observers);
    if (!Number.isFinite(n) || n <= 0) return;
    if (n === 1)      buckets['1']++;
    else if (n === 2) buckets['2']++;
    else if (n === 3) buckets['3']++;
    else              buckets['4+']++;
  });

  return Object.entries(buckets).map(([observers, count]) => ({
    observers,
    count
  }));
}

export function getShapeEvolution(data, topN = 6) {
  if (!Array.isArray(data) || !data.length) return { shapes: [], data: [] };

  const shapeCounts = {};
  data.forEach(item => {
    if (!item.year || item.year < 1950) return; // 👈 changed from 1905 to 1950
    const shape = item.shape || 'unknown';
    shapeCounts[shape] = (shapeCounts[shape] || 0) + 1;
  });

  const topShapes = Object.entries(shapeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([shape]) => shape);

  const decades = {};
  data.forEach(item => {
    if (!item.year || item.year < 1950) return; // 👈 changed here too
    const shape = item.shape || 'unknown';
    if (!topShapes.includes(shape)) return;

    const decade = Math.floor(item.year / 10) * 10;
    if (!decades[decade]) {
      decades[decade] = {};
      topShapes.forEach(s => (decades[decade][s] = 0));
    }
    decades[decade][shape]++;
  });

  const chartData = Object.entries(decades)
    .sort((a, b) => a[0] - b[0])
    .map(([decade, shapes]) => ({
      decade: `${decade}s`,
      ...shapes
    }));

  return { shapes: topShapes, data: chartData };
}
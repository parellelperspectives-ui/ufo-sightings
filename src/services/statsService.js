export function getTotalSightings(data) {
  return data.length;
}

export function getCountryCount(data) {
  return new Set(data.map(d => d.country).filter(Boolean)).size;
}

export function getMostCommonShape(data) {
  const counts = {};

  data.forEach(d => {
    if (!d.shape) return;
    counts[d.shape] = (counts[d.shape] || 0) + 1;
  });

  const entries = Object.entries(counts);
  if (!entries.length) return 'N/A';

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export function parseDurationToSeconds(value) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getAverageDurationSeconds(data) {
  const durations = data
    .map(d => parseDurationToSeconds(d.durationSeconds))
    .filter(v => v !== null);

  if (!durations.length) return null;

  const total = durations.reduce((sum, v) => sum + v, 0);
  return total / durations.length;
}

export function formatSecondsToReadable(seconds) {
  if (seconds === null || seconds === undefined) return 'N/A';

  if (seconds < 60) return `${Math.round(seconds)} sec`;

  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);

  if (mins < 60) return secs ? `${mins} min ${secs} sec` : `${mins} min`;

  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins ? `${hours} h ${remMins} min` : `${hours} h`;
}
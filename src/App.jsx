import React, { useState, useEffect, useMemo, useRef } from 'react';
import Dropdowns from './components/filters/Dropdowns';
import MapView from './components/map/MapView';
import EventTable from './components/table/EventTable';
import KPISection from './components/dashboard/KPISection';
import ChartSection from './components/dashboard/ChartSection';

import {
  getSightingsByYear,
  getSightingsByHour,
  getTopShapes,
  getTopCountries,
  getTotalSightings,
  getCountryCount,
  getMostCommonShape,
  getAverageDuration,
  getSightingsByMonth,          
  getCharacteristicsFrequency,  
  getObserverDistribution,     
  getShapeEvolution,  
} from './services/dashboardService';

const capitalizeFirst = (str = '') =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

const getInitialFiltersFromUrl = () => {
  const params = new URLSearchParams(window.location.search);

  const yearParam = params.get('year');
  const shapeParam = params.get('shape');
  const countryParam = params.get('country');

  return {
    year: yearParam ? Number(yearParam) : null,
    shape: shapeParam || 'all',
    country: countryParam || 'all',
  };
};

export default function App() {
  const initialFilters = getInitialFiltersFromUrl();

  const [data, setData] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [year, setYear] = useState(initialFilters.year);
  const [shape, setShape] = useState(initialFilters.shape);
  const [country, setCountry] = useState(initialFilters.country);

  const [center, setCenter] = useState([20, 0]);
  const [zoom, setZoom] = useState(2);
  const [bounds, setBounds] = useState(null);

  const [focusEvent, setFocusEvent] = useState(null);
  const [resetMapTrigger, setResetMapTrigger] = useState(0);

  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const tableRef = useRef(null);
  const mapSectionRef = useRef(null);

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  };

const parseCountry = (location = '') => {
  const parts = location.split(',').map(s => s.trim());
  return parts[parts.length - 1] || 'Unknown';
};

useEffect(() => {
  fetch('data/nuforc_clean.json')
    .then(res => res.json())
    .then(raw => {
        const parsed = raw
      .map(d => ({
        ...d,
        year: d.date ? Number(d.date.split('-')[0]) : NaN,
        lat: d.lat ?? NaN,
        lon: d.lon ?? NaN,
        country: parseCountry(d.location),
      }))
      .filter(d => !isNaN(d.year));

      const parsedForMap = parsed.filter(
        d => !isNaN(d.lat) && !isNaN(d.lon)
      );


      setData(parsed);
      setMapData(parsedForMap);
    });
}, []);

  const years = useMemo(
  () => Array.from(new Set(data.map(d => d.year)))
    .filter(y => y >= 1905)
    .sort((a, b) => a - b),
  [data]
);

  useEffect(() => {
    if (!years.length || year !== null) return;

    const counts = {};
    data.forEach(d => {
      counts[d.year] = (counts[d.year] || 0) + 1;
    });

    const validYears = years.filter(y => counts[y] > 50);
    const pool = validYears.length ? validYears : years;

    const randomYear = pool[Math.floor(Math.random() * pool.length)];
    setYear(randomYear);
  }, [years, year, data]);

  const shapes = useMemo(() => {
    if (year == null) return ['all'];

    return [
      'all',
      ...Array.from(
        new Set(
          data
            .filter(
              d =>
                d.year === year &&
                (country === 'all' || d.country === country)
            )
            .map(d => d.shape)
            .filter(Boolean)
        )
      ),
    ];
  }, [data, year, country]);

  const countries = useMemo(() => {
    if (year == null) return ['all'];

    return [
      'all',
      ...Array.from(
        new Set(
          data
            .filter(
              d =>
                d.year === year &&
                (shape === 'all' || d.shape === shape)
            )
            .map(d => d.country)
            .filter(Boolean)
        )
      ),
    ];
  }, [data, year, shape]);

  useEffect(() => {
    if (year == null) return;

    const params = new URLSearchParams();

    params.set('year', year);

    if (shape !== 'all') {
      params.set('shape', shape);
    }

    if (country !== 'all') {
      params.set('country', country);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [year, shape, country]);

  useEffect(() => {
  fetch('data/nuforc_clean.json')
    .then(res => res.json())
    .then(raw => {
      const parsed = raw
        .map(d => ({
          ...d,
          year: d.date ? Number(d.date.split('-')[0]) : NaN,
          lat: d.lat ?? NaN,
          lon: d.lon ?? NaN,
          country: parseCountry(d.location),
        }))
        .filter(d => !isNaN(d.year));

      const parsedForMap = parsed.filter(
        d => !isNaN(d.lat) && !isNaN(d.lon)
      );

      setData(parsed);
      setMapData(parsedForMap);
      setLoading(false); // 👈
    });
}, []);

  useEffect(() => {
    if (year != null && years.length && !years.includes(year)) {
      setYear(years[0]);
    }

    if (shape !== 'all' && shapes.length && !shapes.includes(shape)) {
      setShape('all');
    }

    if (country !== 'all' && countries.length && !countries.includes(country)) {
      setCountry('all');
    }
  }, [year, shape, country, years, shapes, countries]);

  useEffect(() => {
    const availableShapes = new Set(
      data
        .filter(
          d =>
            d.year === year &&
            (country === 'all' || d.country === country)
        )
        .map(d => d.shape)
    );

    const availableCountries = new Set(
      data
        .filter(
          d =>
            d.year === year &&
            (shape === 'all' || d.shape === shape)
        )
        .map(d => d.country)
    );

    if (shape !== 'all' && !availableShapes.has(shape)) {
      setShape('all');
    }

    if (country !== 'all' && !availableCountries.has(country)) {
      setCountry('all');
    }
  }, [year, data, shape, country]);

  useEffect(() => {
    setFocusEvent(null);
  }, [year, shape, country]);

  const filtered = useMemo(() => {
    return data.filter(
      d =>
        d.year === year &&
        (shape === 'all' || d.shape === shape) &&
        (country === 'all' || d.country === country)
    );
  }, [data, year, shape, country]);

  const filteredMapData = useMemo(() => {
    return mapData.filter(
      d =>
        d.year === year &&
        (shape === 'all' || d.shape === shape) &&
        (country === 'all' || d.country === country)
    );
  }, [mapData, year, shape, country]);

  const shapeLabel =
    shape === 'all' ? 'Events' : capitalizeFirst(shape);

  const countryLabel =
    country === 'all' ? 'All countries' : capitalizeFirst(country);

  const kpis = useMemo(
    () => ({
      totalSightings: getTotalSightings(filtered || []),
      countryCount: getCountryCount(filtered || []),
      mostCommonShape: getMostCommonShape(filtered || []),
      averageDuration: getAverageDuration(filtered || [])
    }),
    [filtered]
  );

  const sightingsByYear = useMemo(
    () => getSightingsByYear(data || []),
    [data]
  );

  const sightingsByHour = useMemo(
    () => getSightingsByHour(filtered || []),
    [filtered]
  );

  const topShapes = useMemo(
    () => getTopShapes(filtered || []),
    [filtered]
  );

  const topCountries = useMemo(
    () => getTopCountries(filtered || []),
    [filtered]
  );

  const sightingsByMonth = useMemo(
  () => getSightingsByMonth(filtered || []),
  [filtered]
);

const characteristicsFrequency = useMemo(
  () => getCharacteristicsFrequency(filtered || []),
  [filtered]
);

const observerDistribution = useMemo(
  () => getObserverDistribution(filtered || []),
  [filtered]
);

const shapeEvolution = useMemo(
  () => getShapeEvolution(data || []),  // uses full data, not filtered
  [data]
);

  const exportToCSV = () => {
    if (!filtered.length) return;

   const headers = [
      'date',
      'location',
      'shape',
      'duration',
      'observers',
      'characteristics',
      'summary',
      'lat',
      'lon'
    ];
    const rows = filtered.map(d =>
      headers
        .map(h => `"${(d[h] ?? '').toString().replace(/"/g, '""')}"`)
        .join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ufo_${year}_${shape}_${country}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetMapView = () => {
    setCenter([20, 0]);
    setZoom(2);
    setBounds(null);
    setFocusEvent(null);
    setResetMapTrigger(prev => prev + 1);
  };

  const resetFilters = () => {
    setShape('all');
    setCountry('all');
    setBounds(null);
    setCenter([20, 0]);
    setZoom(2);
    setFocusEvent(null);
    setResetMapTrigger(prev => prev + 1);
  };

  const shareUrl =
    typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = 'UFO Sightings Dashboard';
  const shareText =
    'Explore UFO sightings by year, shape, country, and map.';

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const emailShareUrl = `mailto:?subject=${encodeURIComponent(
    shareTitle
  )}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${shareText} ${shareUrl}`
  )}`;

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;

  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    shareUrl
  )}`;

  if (loading) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-slate-100">
      <div className="flex flex-col items-center gap-4">
        <span className="text-5xl animate-pulse">🛸</span>
        <h1 className="text-2xl font-semibold tracking-tight">
          UFO Sightings Dashboard
        </h1>
        <p className="text-sm text-slate-400">
          Loading sighting data…
        </p>
      </div>

      <div className="h-1 w-64 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-full animate-[loading_1.5s_ease-in-out_infinite] rounded-full bg-slate-400" />
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                UFO Sightings Dashboard
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Explore UFO events by year, shape and country.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsMethodologyOpen(true)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Methodology
              </button>

              <div className="relative group">
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-950"
                  aria-label="Share the visualisation"
                  aria-haspopup="dialog"
                  aria-expanded={isShareOpen}
                  title="Share"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 3791 3729"
                    className="h-5 w-5 fill-current"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M713 1152c197 0 375 80 504 209 29 29 56 61 80 95l1125-468c-36-85-55-178-55-275 0-197 80-375 209-504S2883 0 3080 0s375 80 504 209 209 307 209 504-80 375-209 504-307 209-504 209-375-80-504-209c-22-22-43-46-62-71l-1132 471c29 77 45 161 45 248 0 54-6 106-17 157l1131 530c11-13 23-26 36-39 129-129 307-209 504-209s375 80 504 209 209 307 209 504-80 375-209 504-307 209-504 209-375-80-504-209-209-307-209-504c0-112 26-219 73-313l-1092-512c-34 66-78 126-130 177-129 129-307 209-504 209s-375-80-504-209S2 2062 2 1865s80-375 209-504 307-209 504-209zm2742-815c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376zm0 2303c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376zM1089 1488c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376z" />
                  </svg>
                </button>

                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-slate-100 dark:text-slate-900"
                >
                  Share
                </span>
              </div>
            </div>
          </div>
        </header>

        <section role="main" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">
            {shapeLabel} in {countryLabel} {year ? `(${year})` : ''}
          </h2>

          <Dropdowns
            years={years}
            shapes={shapes}
            countries={countries}
            year={year}
            shape={shape}
            country={country}
            setYear={setYear}
            setShape={setShape}
            setCountry={setCountry}
            onShowTable={scrollToTable}
            onResetMap={resetMapView}
            onResetFilters={resetFilters}
          />
        </section>

        <div ref={mapSectionRef}>
          <MapView
            data={filteredMapData}
            center={center}
            zoom={zoom}
            bounds={bounds}
            resetMapTrigger={resetMapTrigger}
            focusEvent={focusEvent}
          />
        </div>

        <KPISection
          totalSightings={kpis.totalSightings}
          countryCount={kpis.countryCount}
          mostCommonShape={capitalizeFirst(kpis.mostCommonShape)}
          averageDuration={kpis.averageDuration}
        />

        <ChartSection
          sightingsByYear={sightingsByYear}
          sightingsByHour={sightingsByHour}
          sightingsByMonth={sightingsByMonth}
      /*     characteristicsFrequency={characteristicsFrequency}
          observerDistribution={observerDistribution} */
          shapeEvolution={shapeEvolution}
          topShapes={topShapes.map(item => ({
            ...item,
            shape: capitalizeFirst(item.shape)
          }))}
         topCountries={topCountries.map(item => ({
            ...item,
            country: capitalizeFirst(item.country || 'Unknown')
          }))}
        />

        <section
          ref={tableRef}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              {shapeLabel} in {countryLabel} {year ? `(${year})` : ''}
            </h2>

            <button
              onClick={exportToCSV}
              className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Export CSV
            </button>
          </div>

          <EventTable
            data={filtered}
            onSelectLocation={d => {
              if (!isNaN(d.lat) && !isNaN(d.lon)) {
                setCenter([d.lat, d.lon]);
                setZoom(8);
                setBounds(null);
                setFocusEvent(d.id ?? `${d.date}-${d.location}`);

                setTimeout(() => {
                  mapSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                  });
                }, 100);
              }
            }}
          />
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Data source:{' '}
              <a
                href="https://huggingface.co/datasets/kcimc/NUFORC"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline hover:text-slate-700 dark:text-slate-200 dark:hover:text-white"
              >
                Hugging Face
              </a>
            </div>

            <div>
              Built by{' '}
              <a
                href="https://parallel-perspectives.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline hover:text-slate-700 dark:text-slate-200 dark:hover:text-white"
              >
                parallel-perspectives.com
              </a>
            </div>
          </div>
        </footer>

        {isMethodologyOpen && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
            onClick={() => setIsMethodologyOpen(false)}
          >
            <div
              className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Methodology
                </h2>
                <button
                  onClick={() => setIsMethodologyOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
                <p>
                  This dashboard explores UFO sighting reports through
                  interactive filters, geospatial visualization, summary
                  indicators, charts, and a searchable event table.
                </p>

                <div>
                  <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    Data preparation
                  </h3>
                  <p>
                  Raw records are loaded from a <a href="https://huggingface.co/datasets/kcimc/NUFORC">JSON source</a>, 
normalized, and parsed into a structured format. The date of each sighting is extracted 
and geographic coordinates are geocoded from the reported location for map display. 
The data is sourced from <a href="https://nuforc.org/">NUFORC</a> (National UFO Reporting Center), 
a US-based organization that has been collecting UFO sighting testimonies from around the world since 1974.</p>
                </div>

                <div>
                  <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    Filtering logic
                  </h3>
                  <p>
                    The dashboard filters events by year, shape, and country.
                    Shape and country options are dynamically constrained so
                    users only see combinations that exist in the selected year
                    and current filter context.
                  </p>
                </div>

                <div>
                  <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    Map logic
                  </h3>
                  <p>
                    Only records with valid coordinates are displayed on the
                    map. Marker clustering is used to improve readability when
                    many sightings occur in the same region. Popups display
                    event details, and table selections can recenter the map on
                    a specific event.
                  </p>
                </div>

                <div>
                  <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    Dashboard indicators
                  </h3>
                  <p>
                    KPI cards and charts summarize the filtered dataset,
                    including time trends, shape frequency, country
                    distribution, and hourly activity patterns.
                  </p>
                </div>

                <div>
                  <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    Notes
                  </h3>
                  <p>
                    Historical reports may contain inconsistent formatting,
                    missing values, or variable location precision. Counts and
                    visual patterns should therefore be read as exploratory
                    signals rather than definitive evidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isShareOpen && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
            onClick={() => setIsShareOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Share dashboard
                </h2>
                <button
                  onClick={() => setIsShareOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={copyUrl}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Copy URL
                </button>

                <a
                  href={emailShareUrl}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Share by email
                </a>

                <a
                  href={twitterShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Share on X / Twitter
                </a>

                <a
                  href={facebookShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Share on Facebook
                </a>

                <a
                  href={linkedinShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Share on LinkedIn
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
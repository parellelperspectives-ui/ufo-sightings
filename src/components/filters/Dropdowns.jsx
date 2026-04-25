import React from 'react';

export default function Dropdowns({
  years,
  shapes,
  countries,
  year,
  shape,
  country,
  setYear,
  setShape,
  setCountry,
  onShowTable,
  onResetMap,
  onResetFilters
}) {
  const selectClass =
    "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500";

  return (
    <div className="flex flex-wrap items-center gap-3">

      {/* Year */}
      <div className="flex flex-col">
        <select
            aria-label="Year"
            className={selectClass}
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
      </div>

      {/* Shape */}
      <div className="flex flex-col">
        <select
          aria-label="Shape"
          className={selectClass}
          value={shape}
          onChange={e => setShape(e.target.value)}
        >
          {shapes.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? 'All shapes' : s}
            </option>
          ))}
        </select>
      </div>

      {/* Country */}
      <div className="flex flex-col">
        <select
          aria-label="Country"
          className={selectClass}
          value={country}
          onChange={e => setCountry(e.target.value)}
        >
          {countries.map(c => (
            <option key={c} value={c}>
              {c === 'all' ? 'All countries' : c}
            </option>
          ))}
        </select>
      </div>
      <div className="map-options">
        <button
          onClick={onResetMap}
          className="mr-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Reset map
        </button>

        <button
          onClick={onResetFilters}
          className="mr-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Reset filters
        </button>

        <button
          onClick={onShowTable}
          className="ml-auto rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Go to table
        </button>
      </div>  
    </div>
  );
}
import React from 'react';

function KPICard({ label, value }) {
  return (
    <div className="
  relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm
  dark:border-slate-800 dark:bg-slate-900
">
  <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl bg-indigo-500"></div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

export default function KPISection({ totalSightings, countryCount, mostCommonShape, averageDuration }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 text-slate-900 dark:text-slate-100">
      <KPICard label="Total sightings" value={totalSightings} />
      <KPICard label="Countries represented" value={countryCount} />
      <KPICard label="Most common shape" value={mostCommonShape} />
    </section>
  );
}
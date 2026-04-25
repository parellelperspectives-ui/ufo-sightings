import React from 'react';
import { capitalizeFirst, decodeHTMLEntities } from '../../utils/formatters';

export default function EventTable({ data, onSelectLocation }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="max-h-[600px] overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
            <tr className="text-left text-slate-700 dark:text-slate-100">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Shape</th>
              <th className="px-4 py-3 font-semibold">Duration</th>
              <th className="px-4 py-3 font-semibold">Observers</th>
              <th className="px-4 py-3 font-semibold">Summary</th>
              <th className="px-4 py-3 font-semibold">Map</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
            {safeData.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No events found for the current selection.
                </td>
              </tr>
            ) : (
              safeData.map((item, index) => (
                <tr
                  key={item.rowId ?? `${item.datetime}-${item.city}-${index}`}
                  className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800 even:bg-slate-50 dark:even:bg-slate-800/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-100">
                    {item.date || 'N/A'}
                  </td>

                  <td className="px-4 py-3 text-slate-700 dark:text-slate-100">
                    {capitalizeFirst(item.location || 'N/A')}
                  </td>

                  <td className="px-4 py-3 text-slate-700 dark:text-slate-100">
                    {capitalizeFirst(item.shape || 'N/A')}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-100">
                    {item.durationHM || item.duration || 'N/A'}
                  </td>
                   <td className="max-w-md px-4 py-3 text-slate-700 dark:text-slate-200">
                    <div className="max-h-16 overflow-hidden">
                      {decodeHTMLEntities(item.observers || 'N/A')}
                    </div>
                  </td>

                  <td className="max-w-md px-4 py-3 text-slate-700 dark:text-slate-200">
                    <div className="max-h-16 overflow-hidden">
                      {decodeHTMLEntities(item.summary || 'N/A')}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {!isNaN(item.lat) && !isNaN(item.lon) ? (
                      <button
                        onClick={() => onSelectLocation?.(item)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      >
                        View
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        N/A
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      {children}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '12px',
  color: '#f8fafc'
};

// One distinct color per shape in the evolution chart
const SHAPE_COLORS = [
  '#38bdf8', '#818cf8', '#f59e0b',
  '#22c55e', '#f43f5e', '#a78bfa'
];

export default function ChartSection({
  sightingsByYear,
  sightingsByHour,
  sightingsByMonth,
  characteristicsFrequency,
  observerDistribution,
  shapeEvolution,
  topShapes,
  topCountries
}) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">

      {/* Top countries */}
      <ChartCard title="Top countries">
        <ResponsiveContainer width="100%" height={topCountries.length * 36 + 40}>
          <BarChart
            data={topCountries}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} stroke="#94a3b8" />
            <YAxis type="category" dataKey="country" width={120} stroke="#94a3b8" />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#22c55e" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>


      {/* Top shapes */}
    <ChartCard title="Top shapes">
      <ResponsiveContainer width="100%" height={topShapes.length * 36 + 40}>
        <BarChart
          data={topShapes}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} stroke="#94a3b8" />
          <YAxis type="category" dataKey="shape" width={120} stroke="#94a3b8" />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="#818cf8" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>

      {/* Sightings by month */}
      <ChartCard title="Sightings by month">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={sightingsByMonth}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis allowDecimals={false} stroke="#94a3b8" />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Characteristics frequency 
      <ChartCard title="Most reported characteristics">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={characteristicsFrequency}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} stroke="#94a3b8" />
            <YAxis
              type="category"
              dataKey="characteristic"
              width={160}
              stroke="#94a3b8"
              tick={{ fontSize: 12 }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#f43f5e" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>*/}

      {/* Observer distribution 
      <ChartCard title="Number of observers">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={observerDistribution}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis
              dataKey="observers"
              stroke="#94a3b8"
              tickFormatter={v => `${v} observer${v === '1' ? '' : 's'}`}
            />
            <YAxis allowDecimals={false} stroke="#94a3b8" />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={v => `${v} observer${v === '1' ? '' : 's'}`}
            />
            <Bar dataKey="count" fill="#a78bfa" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>*/}

       {/* Sightings over time */}
      <ChartCard title="Sightings over time since 1905">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={sightingsByYear}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="year" stroke="#94a3b8" />
            <YAxis allowDecimals={false} stroke="#94a3b8" />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Shape evolution by decade — full width */}
      <div className="xl:col-span-2">
        <ChartCard title="Shape evolution by decade since 1950">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={shapeEvolution.data}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="decade" stroke="#94a3b8" />
              <YAxis allowDecimals={false} stroke="#94a3b8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {shapeEvolution.shapes?.map((shape, i) => (
                <Area
                  key={shape}
                  type="monotone"
                  dataKey={shape}
                  stackId="1"
                  stroke={SHAPE_COLORS[i % SHAPE_COLORS.length]}
                  fill={SHAPE_COLORS[i % SHAPE_COLORS.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

    </section>
  );
}
'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const winRateData = [
  { month: 'Oct', rate: 22 },
  { month: 'Nov', rate: 28 },
  { month: 'Dec', rate: 25 },
  { month: 'Jan', rate: 30 },
  { month: 'Feb', rate: 32 },
  { month: 'Mar', rate: 34 },
];

const revenueData = [
  { month: 'Oct', actual: 1200000, projected: 1500000 },
  { month: 'Nov', actual: 1800000, projected: 1700000 },
  { month: 'Dec', actual: 900000, projected: 1400000 },
  { month: 'Jan', actual: 2100000, projected: 2000000 },
  { month: 'Feb', actual: 2400000, projected: 2200000 },
  { month: 'Mar', actual: 3400000, projected: 2800000 },
];

const formatDollar = (value: number) => `$${(value / 1000000).toFixed(1)}M`;

export function AnalyticsCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Win Rate Trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Win Rate Trend</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={winRateData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" unit="%" />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              formatter={(value: number) => [`${value}%`, 'Win Rate']}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#2563eb' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue vs Projected */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue vs Projected</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={formatDollar} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              formatter={(value: number, name: string) => [
                formatDollar(value),
                name === 'actual' ? 'Actual' : 'Projected',
              ]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="actual" name="Actual" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="projected" name="Projected" fill="#93c5fd" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

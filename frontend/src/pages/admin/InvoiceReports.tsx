import { useState, useMemo } from 'react';
import { useAdminRevenue } from '../../hooks/useAdmin';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat('en-GB').format(n);

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: string;
}

function KpiCard({ label, value, sub, color, icon }: KpiCardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

export default function InvoiceReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const params = useMemo(
    () => ({ period: 'monthly', month: String(selectedMonth), year: String(selectedYear) }),
    [selectedMonth, selectedYear],
  );

  const { data, loading, error, refresh } = useAdminRevenue(params);

  const periodLabel = data?.period ?? `${MONTHS[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#041627]">Invoice Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue & financial summary by period</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={refresh}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Period Banner */}
      {!loading && data && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 flex items-center gap-2">
          <span className="text-indigo-500 text-lg">📅</span>
          <span className="text-indigo-800 font-medium text-sm">Showing data for: {periodLabel}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards — Period */}
      {!loading && data && (
        <>
          <div>
            <h2 className="text-base font-semibold text-[#44474C] mb-3">Period Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard
                label="Total Transaction Value"
                value={fmt(data.totalRevenue)}
                sub="Gross invoice value for the period"
                color="text-indigo-700"
                icon="💰"
              />
              <KpiCard
                label="Platform Commission (5%)"
                value={fmt(data.platformCommission)}
                sub={data.commissionRate ? `Rate: ${data.commissionRate}` : undefined}
                color="text-emerald-700"
                icon="📊"
              />
              <KpiCard
                label="Total Refunds"
                value={fmt(data.totalRefunds)}
                sub="Refunds issued this period"
                color="text-rose-600"
                icon="↩️"
              />
              <KpiCard
                label="Net Revenue"
                value={fmt(data.netRevenue)}
                sub="Commission minus refunds"
                color="text-sky-700"
                icon="✅"
              />
            </div>
          </div>

          {/* All-time stats */}
          <div>
            <h2 className="text-base font-semibold text-[#44474C] mb-3">All-Time Totals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <KpiCard
                label="All-Time Platform Revenue"
                value={fmt(data.allTimeRevenue)}
                sub="Cumulative commission earned"
                color="text-violet-700"
                icon="🏆"
              />
              <KpiCard
                label="All-Time Transactions"
                value={fmtNum(data.allTimeTransactions)}
                sub="Total completed jobs processed"
                color="text-amber-700"
                icon="🔄"
              />
            </div>
          </div>

          {/* Revenue breakdown table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-[#041627]">Breakdown — {periodLabel}</h2>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Metric</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { label: 'Gross Transaction Volume', value: fmt(data.totalRevenue), highlight: false },
                  { label: `Platform Commission (${data.commissionRate ?? '5%'})`, value: fmt(data.platformCommission), highlight: false },
                  { label: 'Refunds Issued', value: fmt(data.totalRefunds), highlight: false },
                  { label: 'Net Platform Revenue', value: fmt(data.netRevenue), highlight: true },
                ].map((row) => (
                  <tr key={row.label} className={row.highlight ? 'bg-emerald-50' : 'hover:bg-gray-50'}>
                    <td className={`px-6 py-4 ${row.highlight ? 'font-semibold text-emerald-800' : 'text-[#44474C]'}`}>
                      {row.label}
                    </td>
                    <td className={`px-6 py-4 text-right font-mono ${row.highlight ? 'font-bold text-emerald-700' : 'text-[#041627]'}`}>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !error && !data && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📄</div>
          <p className="text-lg font-medium text-gray-500">No revenue data available</p>
          <p className="text-sm mt-1">Select a different period or check back later.</p>
        </div>
      )}
    </div>
  );
}

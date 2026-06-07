import React, { useCallback, useEffect, useState } from 'react';
import adminService from '../../api/adminService';

type RatingEntry = {
  ratingId: string;
  jobReference?: string | null;
  rater: { userId: string; name: string; role: string };
  rated: { userId: string; name: string; role: string };
  starRating: number;
  review?: string | null;
  tags?: string[];
  submittedAt?: string | null;
};

type AllRatingsResponse = {
  items: RatingEntry[];
  total: number;
  page: number;
  limit: number;
};

type FilterType = 'all' | 'haulier_to_driver' | 'driver_to_haulier';

const FILTER_CONFIG: { key: FilterType; label: string; icon: string; raterRole?: string }[] = [
  { key: 'all', label: 'All Ratings', icon: 'star' },
  { key: 'haulier_to_driver', label: 'Haulier → Driver', icon: 'business_center', raterRole: 'HAULIER' },
  { key: 'driver_to_haulier', label: 'Driver → Haulier', icon: 'local_shipping', raterRole: 'DRIVER' },
];

const roleBadge = (role: string) => {
  switch (role.toLowerCase()) {
    case 'driver': return 'bg-blue-100 text-blue-700';
    case 'haulier': return 'bg-amber-100 text-amber-700';
    case 'firm': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const renderStars = (rating: number) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        className={`material-symbols-outlined text-sm ${i < rating ? 'text-amber-500' : 'text-slate-200'}`}
      >
        star
      </span>
    ))}
    <span className="ml-1 text-xs font-bold text-slate-600">{rating}.0</span>
  </div>
);

const PAGE_SIZE = 20;

const RatingsPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AllRatingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async (f: FilterType, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const cfg = FILTER_CONFIG.find((c) => c.key === f);
      const params: Record<string, unknown> = { page: p, limit: PAGE_SIZE };
      if (cfg?.raterRole) params.rater_role = cfg.raterRole;
      const result = (await adminService.getAllRatings(params as Parameters<typeof adminService.getAllRatings>[0])) as AllRatingsResponse;
      setData(result);
    } catch {
      setError('Failed to load ratings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter, page);
  }, [load, filter, page]);

  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    setPage(1);
  };

  const handleRemove = async (ratingId: string) => {
    const reason = window.prompt('Enter a reason for removing this review:');
    if (!reason) return;
    setRemovingId(ratingId);
    try {
      await adminService.removeRating(ratingId, { reason, notifyReporter: true, notifyReviewer: true });
      void load(filter, page);
    } catch {
      setError('Failed to remove review.');
    } finally {
      setRemovingId(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">
            Ratings &amp; Reviews
          </h2>
          <p className="text-on-surface-variant font-medium">
            All platform ratings between hauliers and drivers.
          </p>
        </div>
        {data && (
          <div className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 bg-slate-50 text-primary border border-slate-200">
            <span className="material-symbols-outlined text-sm">reviews</span>
            {data.total} total rating{data.total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_CONFIG.map((cfg) => (
          <button
            key={cfg.key}
            onClick={() => handleFilterChange(cfg.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              filter === cfg.key
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Rated By</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Rated User</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Stars</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Review</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Job Ref</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              )}

              {!loading && data?.items.map((entry) => (
                <tr key={entry.ratingId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="font-bold text-primary">{entry.rater.name}</p>
                    <span className={`mt-1 inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${roleBadge(entry.rater.role)}`}>
                      {entry.rater.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="font-bold text-primary">{entry.rated.name}</p>
                    <span className={`mt-1 inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${roleBadge(entry.rated.role)}`}>
                      {entry.rated.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {renderStars(entry.starRating)}
                  </td>
                  <td className="px-4 py-4 max-w-xs">
                    <p className="text-slate-600 leading-5 line-clamp-2">
                      {entry.review || <span className="text-slate-400 italic">No review</span>}
                    </p>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="text-[10px] font-black uppercase tracking-wide rounded-full bg-slate-100 text-slate-500 px-2 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-xs font-bold text-slate-500">
                      {entry.jobReference || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-xs text-slate-500">
                      {entry.submittedAt ? new Date(entry.submittedAt).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button
                      onClick={() => void handleRemove(entry.ratingId)}
                      disabled={removingId === entry.ratingId}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                    >
                      {removingId === entry.ratingId ? (
                        <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-xs">delete</span>
                      )}
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400 font-medium">
                    No ratings found for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} · {data.total} total
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Next
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatingsPage;

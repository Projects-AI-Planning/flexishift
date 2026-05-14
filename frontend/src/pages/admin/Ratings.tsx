import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import adminService from '../../api/adminService';

type RatingItem = {
  ratingId: string;
  jobReference?: string | null;
  ratedBy?: {
    name?: string | null;
    role?: string | null;
  };
  starRating: number;
  review?: string | null;
  tags?: string[];
  submittedAt?: string | null;
};

type UserRatingsResponse = {
  userId: string;
  name: string;
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: Record<string, number>;
  ratings: RatingItem[];
  page: number;
  limit: number;
  totalPages: number;
};

const roleTone = (role?: string | null) => {
  switch (role?.toLowerCase()) {
    case 'driver':
      return 'bg-blue-100 text-blue-700';
    case 'haulier':
      return 'bg-amber-100 text-amber-700';
    case 'firm':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-slate-100 text-[#44474C]';
  }
};

const starLabel = (value: number) => `${value.toFixed(1)} / 5`;

const renderStars = (rating: number) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={`material-symbols-outlined text-sm ${index < rating ? 'text-amber-500' : 'text-slate-200'}`}
        >
          star
        </span>
      ))}
    </div>
  );
};

const RatingsPage: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const moderationMode = location.pathname.includes('/reported');

  const [targetUserId, setTargetUserId] = useState(searchParams.get('userId') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserRatingsResponse | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const breakdown = useMemo(() => {
    if (!data) return [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 }));
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: data.ratingBreakdown?.[`${star}_star`] ?? 0,
    }));
  }, [data]);

  const loadRatings = useCallback(async (userId: string) => {
    const trimmed = userId.trim();
    if (!trimmed) {
      setError('Enter a user ID to load ratings.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = (await adminService.getUserRatings(trimmed, { page: 1, limit: 20 })) as UserRatingsResponse;
      setData(result);
      setSearchParams({ userId: trimmed });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data?.message
        ?? (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to load ratings from the backend.';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    const initial = searchParams.get('userId');
    if (initial) {
      setTargetUserId(initial);
      void loadRatings(initial);
    }
  }, [loadRatings, searchParams]);

  const handleRemove = async (ratingId: string) => {
    const reason = window.prompt('Enter a reason for removing this review:');
    if (!reason) return;

    setRemovingId(ratingId);
    try {
      await adminService.removeRating(ratingId, {
        reason,
        notifyReporter: true,
        notifyReviewer: true,
      });
      if (data?.userId) {
        await loadRatings(data.userId);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data?.message
        ?? (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to remove review.';
      setError(message);
    } finally {
      setRemovingId(null);
    }
  };

  const totalStars = data?.ratings.reduce((sum, rating) => sum + rating.starRating, 0) ?? 0;
  const average = data?.totalRatings ? totalStars / data.totalRatings : 0;

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">
            {moderationMode ? 'Ratings Moderation' : 'Ratings and Reviews'}
          </h2>
          <p className="text-on-surface-variant font-medium">
            {moderationMode
              ? 'Inspect user reviews and remove abusive content using the backend moderation endpoint.'
              : 'Review feedback for any user and monitor the live rating record.'}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${moderationMode ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-primary border border-slate-200'}`}>
          <span className="material-symbols-outlined text-sm">
            {moderationMode ? 'gavel' : 'star'}
          </span>
          {moderationMode ? 'Moderation Mode' : 'Review Mode'}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full min-w-[160px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void loadRatings(targetUserId);
              }
            }}
            placeholder="Enter a user ID to load ratings..."
            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <button
          onClick={() => void loadRatings(targetUserId)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-black hover:opacity-90 transition-colors shadow-md flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">travel_explore</span>
          Load Ratings
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">User</p>
              <h3 className="mt-2 text-2xl font-black text-primary">{data.name}</h3>
              <p className="text-xs text-slate-500 mt-2">User ID: {data.userId}</p>
            </div>
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-700/30">
              <p className="text-white/60 font-black uppercase tracking-wider text-[10px]">Average Rating</p>
              <h3 className="mt-2 text-4xl font-black">{starLabel(average)}</h3>
              <div className="mt-3">{renderStars(Math.round(average))}</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Reviews</p>
              <h3 className="mt-2 text-4xl font-black text-primary">{data.totalRatings}</h3>
              <p className="text-xs text-slate-500 mt-2">Live count from `/ratings/user/:userId`.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Page Size</p>
              <h3 className="mt-2 text-4xl font-black text-primary">{data.limit}</h3>
              <p className="text-xs text-slate-500 mt-2">Showing page {data.page} of {data.totalPages}.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-6">
            <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 p-6">
              <h3 className="text-xl font-black text-primary">Rating Breakdown</h3>
              <p className="text-sm text-slate-500 mt-1">Distribution returned by the backend summary endpoint.</p>
              <div className="mt-5 space-y-4">
                {breakdown.map((row) => {
                  const total = data.totalRatings || 1;
                  const percent = Math.round((row.count / total) * 100);
                  return (
                    <div key={row.star} className="space-y-1">
                      <div className="flex items-center justify-between text-sm font-bold text-[#44474C]">
                        <span>{row.star} star</span>
                        <span>{row.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-amber-500" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-primary">Recent Reviews</h3>
                  <p className="text-sm text-slate-500">
                    {moderationMode
                      ? 'Review content here and remove abusive entries when needed.'
                      : 'Latest feedback entries for the selected user.'}
                  </p>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {data.ratings.length} loaded
                </span>
              </div>

              <div className="divide-y divide-slate-50">
                {data.ratings.map((rating) => (
                  <div key={rating.ratingId} className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {rating.jobReference || 'Job N/A'}
                          </span>
                          {rating.ratedBy?.role && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${roleTone(rating.ratedBy.role)}`}>
                              {rating.ratedBy.role}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          {renderStars(rating.starRating)}
                          <span className="text-sm font-black text-primary">{rating.starRating}.0</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#44474C]">
                          {rating.review || 'No written review provided.'}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {rating.ratedBy?.name && (
                            <span className="text-xs text-slate-500 font-medium">By {rating.ratedBy.name}</span>
                          )}
                          {rating.submittedAt && (
                            <span className="text-xs text-slate-500 font-medium">
                              {new Date(rating.submittedAt).toLocaleDateString()}
                            </span>
                          )}
                          {rating.tags?.map((tag) => (
                            <span key={tag} className="text-[10px] font-black uppercase tracking-widest rounded-full bg-slate-100 text-[#44474C] px-2 py-1">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => void handleRemove(rating.ratingId)}
                          disabled={removingId === rating.ratingId}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          {removingId === rating.ratingId && <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>}
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!loading && data.ratings.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No ratings found for this user.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <p className="text-lg font-black text-primary">
            {moderationMode ? 'Load a user to review ratings' : 'Search for a user to inspect reviews'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Enter a user ID above. The screen will fetch live rating data from the backend and let you remove abusive reviews.
          </p>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}
    </div>
  );
};

export default RatingsPage;

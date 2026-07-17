import { useEffect, useMemo, useState, type FormEvent } from 'react';
import adminService from '../../../api/adminService';
import type { SupportTicket } from '../../../types';

type ViewMode = 'active' | 'resolved';

type SupportStats = {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
};

type SupportCreateForm = {
  requesterName: string;
  requesterEmail: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  userId: string;
};

const EMPTY_CREATE_FORM: SupportCreateForm = {
  requesterName: '',
  requesterEmail: '',
  category: 'general',
  priority: 'MEDIUM',
  subject: '',
  description: '',
  userId: '',
};

const priorityTone = (priority: string) => {
  const value = priority.toUpperCase();
  if (value === 'URGENT') return 'bg-rose-100 text-rose-700';
  if (value === 'HIGH') return 'bg-orange-100 text-orange-700';
  if (value === 'MEDIUM') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-[#44474C]';
};

const statusTone = (status: string) => {
  const value = status.toUpperCase();
  if (value === 'OPEN') return 'bg-blue-100 text-blue-700';
  if (value === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700';
  if (value === 'RESOLVED') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-[#44474C]';
};

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());

const SupportTicketsPage = ({ view }: { view: ViewMode }) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<{ items: SupportTicket[]; total: number; page: number; limit: number } | null>(null);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<SupportCreateForm>(EMPTY_CREATE_FORM);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const params = useMemo(() => ({ page, limit, search: search || undefined }), [limit, page, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tickets, ticketStats] = await Promise.all([
        view === 'active'
          ? adminService.getActiveSupportTickets(params)
          : adminService.getResolvedSupportTickets(params),
        adminService.getSupportTicketStats(),
      ]);
      setData(tickets);
      setStats(ticketStats);
      setError(null);
      if (selectedTicket) {
        const refreshed = tickets.items.find((ticket) => ticket.ticketId === selectedTicket.ticketId);
        setSelectedTicket(refreshed ?? tickets.items[0] ?? null);
      } else {
        setSelectedTicket(tickets.items[0] ?? null);
      }
    } catch {
      setError('Failed to load support tickets from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [params, view]);

  const updateStatus = async (ticketId: string, status: string) => {
    setSavingTicketId(ticketId);
    try {
      await adminService.updateSupportTicketStatus(ticketId, {
        status,
        resolutionNotes: status === 'RESOLVED' || status === 'CLOSED' ? 'Handled from admin dashboard.' : undefined,
      });
      await loadData();
    } catch {
      setError('Failed to update support ticket status.');
    } finally {
      setSavingTicketId(null);
    }
  };

  const createTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await adminService.createSupportTicket({
        requesterName: createForm.requesterName,
        requesterEmail: createForm.requesterEmail,
        category: createForm.category,
        priority: createForm.priority,
        subject: createForm.subject,
        description: createForm.description,
        userId: createForm.userId || undefined,
      });
      setCreateForm(EMPTY_CREATE_FORM);
      await loadData();
    } catch {
      setCreateError('Failed to create support ticket.');
    } finally {
      setCreating(false);
    }
  };

  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));

  const isActive = view === 'active';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Support Tickets</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">{isActive ? 'Active Tickets' : 'Resolved Tickets'}</h1>
          <p className="text-on-surface-variant font-medium">Tickets are loaded from the backend admin support endpoints.</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total Tickets</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{stats?.totalTickets ?? 0}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Open</p>
          <h3 className="mt-2 text-3xl font-black text-blue-700">{stats?.openTickets ?? 0}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">In Progress</p>
          <h3 className="mt-2 text-3xl font-black text-amber-700">{stats?.inProgressTickets ?? 0}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Resolved</p>
          <h3 className="mt-2 text-3xl font-black text-emerald-700">{stats?.resolvedTickets ?? 0}</h3>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-primary">Search</h2>
          <p className="text-sm text-slate-500">Filter tickets by subject, user, email, or category.</p>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search tickets..."
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />

          {isActive && (
            <form onSubmit={createTicket} className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-primary">Create Ticket</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin</span>
              </div>
              <input
                required
                value={createForm.requesterName}
                onChange={(e) => setCreateForm((current) => ({ ...current, requesterName: e.target.value }))}
                placeholder="Requester name"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                required
                type="email"
                value={createForm.requesterEmail}
                onChange={(e) => setCreateForm((current) => ({ ...current, requesterEmail: e.target.value }))}
                placeholder="Requester email"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                required
                value={createForm.category}
                onChange={(e) => setCreateForm((current) => ({ ...current, category: e.target.value }))}
                placeholder="Category"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm((current) => ({ ...current, priority: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              <input
                required
                value={createForm.subject}
                onChange={(e) => setCreateForm((current) => ({ ...current, subject: e.target.value }))}
                placeholder="Subject"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <textarea
                required
                rows={4}
                value={createForm.description}
                onChange={(e) => setCreateForm((current) => ({ ...current, description: e.target.value }))}
                placeholder="Describe the issue"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={createForm.userId}
                onChange={(e) => setCreateForm((current) => ({ ...current, userId: e.target.value }))}
                placeholder="Optional user ID"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              {createError && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{createError}</p>
              )}
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Ticket'}
              </button>
            </form>
          )}

          <div className="mt-6 space-y-3">
            {items.map((ticket) => (
              <button
                key={ticket.ticketId}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedTicket?.ticketId === ticket.ticketId
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-slate-100 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-primary">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-slate-500">{ticket.requesterName}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${priorityTone(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
                  <span className={`rounded-full px-2.5 py-1 ${statusTone(ticket.status)}`}>{titleCase(ticket.status)}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[#44474C]">{titleCase(ticket.category)}</span>
                </div>
              </button>
            ))}
            {!loading && items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No {isActive ? 'active' : 'resolved'} tickets found.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-primary">Ticket Details</h2>
              <p className="text-sm text-slate-500">Review and update the selected support ticket.</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              Showing {items.length} of {data?.total ?? 0}
            </div>
          </div>

          {selectedTicket ? (
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(selectedTicket.status)}`}>
                    {titleCase(selectedTicket.status)}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${priorityTone(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <h3 className="mt-4 text-2xl font-black text-primary">{selectedTicket.subject}</h3>
                <p className="mt-2 text-sm text-[#44474C]">{selectedTicket.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Requester</p>
                  <p className="mt-2 text-sm font-bold text-primary">{selectedTicket.requesterName}</p>
                  <p className="text-xs text-slate-500">{selectedTicket.requesterEmail}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Category</p>
                  <p className="mt-2 text-sm font-bold text-primary">{titleCase(selectedTicket.category)}</p>
                  <p className="text-xs text-slate-500">
                    Created {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Resolution Notes</p>
                <p className="mt-2 text-sm text-[#44474C]">{selectedTicket.resolutionNotes || 'No resolution notes yet.'}</p>
                {selectedTicket.resolvedAt && (
                  <p className="mt-2 text-xs text-slate-500">
                    Resolved {new Date(selectedTicket.resolvedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isActive ? (
                  <>
                    <button
                      onClick={() => void updateStatus(selectedTicket.ticketId, 'IN_PROGRESS')}
                      disabled={savingTicketId === selectedTicket.ticketId}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={() => void updateStatus(selectedTicket.ticketId, 'RESOLVED')}
                      disabled={savingTicketId === selectedTicket.ticketId}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-md shadow-emerald-200 transition hover:opacity-90 disabled:opacity-50"
                    >
                      Resolve Ticket
                    </button>
                    <button
                      onClick={() => void updateStatus(selectedTicket.ticketId, 'CLOSED')}
                      disabled={savingTicketId === selectedTicket.ticketId}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-md shadow-slate-200 transition hover:opacity-90 disabled:opacity-50"
                    >
                      Close Ticket
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => void updateStatus(selectedTicket.ticketId, 'IN_PROGRESS')}
                    disabled={savingTicketId === selectedTicket.ticketId}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                  >
                    Reopen for Review
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500">
              Select a ticket to view details.
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">
          Page {data?.page ?? page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-primary transition hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketsPage;

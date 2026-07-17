import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import haulierService from '../../api/haulierService';

type SupportTicket = {
  ticketId: string;
  requesterName: string;
  requesterEmail: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  createdAt?: string | null;
};

const EMPTY_FORM = {
  category: 'GENERAL',
  priority: 'MEDIUM',
  subject: '',
  description: '',
};

export default function HaulierSupportContactPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadTickets = async () => {
    setLoading(true);
    try {
      const result = await haulierService.listHaulierSupportTickets({ page: 1, limit: 10 });
      setTickets((result.items ?? []) as SupportTicket[]);
      setError('');
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(response.response?.data?.message || response.response?.data?.detail || 'Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const submitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      await haulierService.createHaulierSupportTicket(form);
      setMessage('Support ticket submitted successfully.');
      setForm(EMPTY_FORM);
      await loadTickets();
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(response.response?.data?.message || response.response?.data?.detail || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Haulier Support</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Contact Support</h1>
          <p className="text-on-surface-variant font-medium">Create a backend support ticket and track your recent requests.</p>
        </div>
        <button
          onClick={() => void loadTickets()}
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

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={submitTicket} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-primary">New Support Ticket</h2>
          <p className="text-sm text-slate-500">The backend fills in your identity automatically.</p>

          <label className="block space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Category</span>
            <select
              value={form.category}
              onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="GENERAL">General</option>
              <option value="PAYMENT">Payment</option>
              <option value="BOOKING">Booking</option>
              <option value="DOCUMENTS">Documents</option>
              <option value="TECHNICAL">Technical</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Priority</span>
            <select
              value={form.priority}
              onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Subject</span>
            <input
              value={form.subject}
              onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              placeholder="Short summary"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Description</span>
            <textarea
              rows={6}
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              placeholder="Explain the issue in detail"
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary px-6 py-3 text-xs font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-primary">Your Tickets</h2>
              <p className="text-sm text-slate-500">Recent tickets loaded from the backend.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
              {tickets.length} records
            </span>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[400px] text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Subject</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <tr key={ticket.ticketId}>
                    <td className="px-4 py-4">
                      <p className="font-black text-primary">{ticket.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">{ticket.requesterEmail}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-500">{ticket.category}</td>
                    <td className="px-4 py-4 text-slate-500">{ticket.status}</td>
                  </tr>
                ))}
                {!loading && tickets.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      No tickets found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}

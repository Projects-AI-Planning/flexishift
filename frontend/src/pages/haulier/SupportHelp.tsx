import { useEffect, useState } from 'react';
import haulierService from '../../api/haulierService';

type HelpCenterData = {
  userId: string;
  contactChannels: Array<{
    label: string;
    value: string;
    description: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  stats: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
  };
  recentTickets: Array<{
    ticketId: string;
    category: string;
    subject: string;
    status: string;
    createdAt?: string | null;
  }>;
};

export default function HaulierSupportHelpPage() {
  const [data, setData] = useState<HelpCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await haulierService.getHaulierHelpCenter();
      setData(result);
      setError('');
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(response.response?.data?.message || response.response?.data?.detail || 'Failed to load help center.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Haulier Support</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Help Center</h1>
          <p className="text-on-surface-variant font-medium">Backend-backed support resources, FAQs, and your recent ticket activity.</p>
        </div>
        <button
          onClick={() => void loadData()}
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

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total Tickets</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{data?.stats.totalTickets ?? 0}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Open</p>
          <h3 className="mt-2 text-3xl font-black text-[#0a4a8f]">{data?.stats.openTickets ?? 0}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Resolved</p>
          <h3 className="mt-2 text-3xl font-black text-emerald-700">{data?.stats.resolvedTickets ?? 0}</h3>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-primary">Contact Channels</h2>
          <p className="text-sm text-slate-500">Official backend-provided support details.</p>

          <div className="mt-5 space-y-3">
            {data?.contactChannels.map((channel) => (
              <div key={channel.label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{channel.label}</p>
                <p className="mt-2 text-sm font-black text-primary">{channel.value}</p>
                <p className="mt-1 text-xs text-slate-500">{channel.description}</p>
              </div>
            )) ?? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Loading contact channels...
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-primary">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-500">Answers returned from the backend help-center endpoint.</p>

          <div className="mt-5 space-y-4">
            {data?.faqs.map((faq) => (
              <details key={faq.question} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <summary className="cursor-pointer list-none text-sm font-black text-primary">{faq.question}</summary>
                <p className="mt-3 text-sm text-[#44474C]">{faq.answer}</p>
              </details>
            )) ?? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Loading FAQs...
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-base font-black text-primary">Recent Tickets</h3>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[400px] text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Subject</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.recentTickets ?? []).map((ticket) => (
                    <tr key={ticket.ticketId}>
                      <td className="px-4 py-4 font-black text-primary">{ticket.subject}</td>
                      <td className="px-4 py-4 text-slate-500">{ticket.category}</td>
                      <td className="px-4 py-4 text-slate-500">{ticket.status}</td>
                    </tr>
                  ))}
                  {!loading && (data?.recentTickets.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No support tickets yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

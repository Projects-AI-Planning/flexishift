import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  /** Extra detail rows shown in a highlight box — optional */
  details?: { label: string; value: string }[];
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClass?: string;
  icon?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmClass = 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
  icon = 'payments',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">{icon}</span>
          </div>
          <h3 className="text-base font-black text-[#041627]">{title}</h3>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 font-medium leading-relaxed">{message}</p>

          {details && details.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
              {details.map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                  <span className="text-sm font-black text-[#041627]">{value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <span className="material-symbols-outlined text-amber-500 text-[16px] mt-0.5 shrink-0">warning</span>
            <p className="text-xs font-semibold text-amber-800 leading-relaxed">
              This action is <strong>irreversible</strong>. Funds will be transferred immediately and cannot be recalled.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black text-[#44474C] hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${confirmClass}`}
          >
            {loading
              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <span className="material-symbols-outlined text-[16px]">{icon}</span>}
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

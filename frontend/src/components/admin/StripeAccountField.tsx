import React from 'react';

const StripeAccountField: React.FC<{
  accountId?: string | null;
  onboardingComplete?: boolean;
}> = ({ accountId, onboardingComplete }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stripe account ID</p>
    {accountId ? (
      <>
        <p className="text-sm font-bold text-primary font-mono break-all">{accountId}</p>
        <span className={`mt-1 inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
          onboardingComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {onboardingComplete ? 'Onboarding complete' : 'Onboarding incomplete'}
        </span>
      </>
    ) : (
      <p className="text-sm font-bold text-slate-400">Not connected</p>
    )}
  </div>
);

export default StripeAccountField;

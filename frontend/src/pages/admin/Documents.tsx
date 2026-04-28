import React from 'react';

const DocumentsPage: React.FC = () => {
  const pendingRequests = [
    {
      id: 1,
      user: 'Marcus Thorne',
      type: 'Driver Credentials',
      time: '2 hours ago',
      avatar: 'https://i.pravatar.cc/150?u=marcus',
      documents: [
        { name: 'Driving License', status: 'Pending', icon: 'badge', color: 'text-amber-600', bg: 'bg-amber-50' },
        { name: 'Vehicle Registration', status: 'Verified', icon: 'directions_car', color: 'text-green-600', bg: 'bg-green-50' },
        { name: 'Insurance Policy', status: 'Rejected', icon: 'shield', color: 'text-red-600', bg: 'bg-red-50', reason: 'Image blurry' }
      ]
    },
    {
      id: 2,
      user: 'Sarah Jenkins',
      type: 'Insurance Update',
      time: '5 hours ago',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
      documents: [
        { name: 'Insurance Policy', status: 'Pending', icon: 'shield', color: 'text-amber-600', bg: 'bg-amber-50' }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Compliance & Verifications</h2>
          <p className="text-on-surface-variant font-medium">Review and approve supplier credentials to maintain platform safety.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {pendingRequests.length} Pending Reviews
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Guidelines & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary text-white p-6 rounded-xl shadow-lg border border-slate-700/30">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-amber-500">verified_user</span>
              <h3 className="text-xl font-bold">Verification Protocol</h3>
            </div>
            <ul className="space-y-4 text-sm font-medium text-white/70">
              <li className="flex gap-3">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                Images must be clear, legible and in color.
              </li>
              <li className="flex gap-3">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                Format: JPG, PNG, or PDF (max 10MB).
              </li>
              <li className="flex gap-3">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                Names must exactly match the user profile.
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Verification Stats</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-primary">Avg. Approval Time</span>
                <span className="text-sm font-black text-primary">14.2 hrs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-primary">Rejection Rate</span>
                <span className="text-sm font-black text-red-600">8.4%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Pending Review List */}
        <div className="lg:col-span-8 space-y-6">
          {pendingRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-500 overflow-hidden">
                    <img src={request.avatar} alt={request.user} />
                  </div>
                  <div>
                    <h3 className="font-black text-primary">{request.user}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{request.type} • {request.time}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="bg-primary text-white px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:opacity-90 shadow-md">
                    Approve All
                  </button>
                  <button className="p-2 border border-slate-200 rounded-lg hover:bg-white text-primary">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {request.documents.map((doc, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${doc.bg} flex items-center justify-center ${doc.color}`}>
                        <span className="material-symbols-outlined text-2xl">{doc.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-primary text-sm">{doc.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-black uppercase ${doc.color}`}>
                            {doc.status}
                          </span>
                          {doc.reason && (
                            <span className="text-[10px] text-red-400 font-medium italic">
                              Reason: {doc.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="flex-1 md:flex-none px-4 py-2 border border-slate-200 text-primary font-bold rounded-lg text-xs hover:bg-slate-50 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        View Document
                      </button>
                      {doc.status === 'Pending' && (
                        <>
                          <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">check_circle</span>
                          </button>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">cancel</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
            <p className="text-sm font-bold text-slate-400">No more pending reviews</p>
            <p className="text-xs text-slate-400 mt-1">You've caught up with all compliance requests.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;

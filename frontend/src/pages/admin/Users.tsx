import React from 'react';

const UsersPage: React.FC = () => {
  const users = [
    { id: 1, name: 'Julian Reed', email: 'julian@freightflex.com', joined: '12 Oct 2023', role: 'Driver', status: 'Verified', statusColor: 'bg-green-100 text-green-700', avatar: 'https://i.pravatar.cc/150?u=julian' },
    { id: 2, name: 'Elena Vance', email: 'elena@vancetransport.com', joined: '14 Oct 2023', role: 'Haulier', status: 'Pending', statusColor: 'bg-amber-100 text-amber-700', avatar: 'https://i.pravatar.cc/150?u=elena' },
    { id: 3, name: 'Marcus Thorne', email: 'marcus.t@logistics.co', joined: '15 Oct 2023', role: 'Driver', status: 'Suspended', statusColor: 'bg-red-100 text-red-700', avatar: 'https://i.pravatar.cc/150?u=marcus' },
    { id: 4, name: 'Sarah Jenkins', email: 'sarah.j@fastmail.com', joined: '18 Oct 2023', role: 'Driver', status: 'Verified', statusColor: 'bg-green-100 text-green-700', avatar: 'https://i.pravatar.cc/150?u=sarah' },
    { id: 5, name: 'Alex Sterling', email: 'alex@sterlingfleet.com', joined: '20 Oct 2023', role: 'Haulier', status: 'Verified', statusColor: 'bg-green-100 text-green-700', avatar: 'https://i.pravatar.cc/150?u=alex' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">User Management</h2>
          <p className="text-on-surface-variant font-medium">Manage and verify platform participants.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-black hover:opacity-90 transition-colors shadow-md flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">person_add</span>
            Add New User
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input 
            type="text" 
            placeholder="Search by name, email, or ID..." 
            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary">
            <option>All Roles</option>
            <option>Driver</option>
            <option>Haulier</option>
            <option>Admin</option>
          </select>
          <select className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary">
            <option>All Status</option>
            <option>Verified</option>
            <option>Pending</option>
            <option>Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <img className="w-full h-full object-cover" src={user.avatar} alt={user.name} />
                      </div>
                      <div>
                        <p className="font-bold text-primary text-sm">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{user.joined}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${user.statusColor}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg">
                        <span className="material-symbols-outlined text-sm">block</span>
                      </button>
                      <button className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg">
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">Showing 1 to 5 of 1,482 users</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-xs font-black text-primary bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Previous</button>
            <button className="px-4 py-2 text-xs font-black text-white bg-primary rounded-lg shadow-md shadow-primary/20">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;

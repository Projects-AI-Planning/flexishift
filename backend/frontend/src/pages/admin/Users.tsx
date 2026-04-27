import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { User as UserIcon, Shield, CheckCircle, XCircle } from 'lucide-react';

type User = {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    client.get('/admin/users')
      .then(res => {
        setUsers(res.data.data.items);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const toggleUserStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    client.patch(`/admin/users/${userId}/status`, { status: newStatus })
      .then(() => {
        setUsers(users.map(u => u.userId === userId ? { ...u, status: newStatus } : u));
      });
  };

  if (isLoading) return <div>Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-navy">User Management</h1>
          <p className="text-gray-500">Manage system users and their access status.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 font-semibold text-navy text-sm uppercase tracking-wider">User</th>
              <th className="p-4 font-semibold text-navy text-sm uppercase tracking-wider">Role</th>
              <th className="p-4 font-semibold text-navy text-sm uppercase tracking-wider">Status</th>
              <th className="p-4 font-semibold text-navy text-sm uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.userId} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                      <UserIcon size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-navy">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                    user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {user.status === 'ACTIVE' ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <XCircle size={16} className="text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${user.status === 'ACTIVE' ? 'text-green-700' : 'text-red-700'}`}>
                      {user.status}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => toggleUserStatus(user.userId, user.status)}
                    className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors border ${
                      user.status === 'ACTIVE' 
                        ? 'text-red-600 border-red-100 hover:bg-red-50' 
                        : 'text-green-600 border-green-100 hover:bg-green-50'
                    }`}
                  >
                    {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;

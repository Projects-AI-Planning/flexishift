import React from 'react';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-[0_4px_12px_rgba(26,43,60,0.05)] flex items-center justify-between px-8">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-amber-500 transition-all outline-none" 
            placeholder="Search shipments, fleet, or drivers..." 
            type="text"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="relative hover:bg-slate-100 rounded-full p-2 transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined text-slate-600">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="relative hover:bg-slate-100 rounded-full p-2 transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined text-slate-600">chat_bubble</span>
          </button>
        </div>
        
        <div className="h-8 w-px bg-slate-200"></div>
        
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden lg:block">
            <p className="text-sm font-bold text-slate-900">{user?.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{user?.role === 'ADMIN' ? 'Platform Admin' : 'Operations Manager'}</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-amber-500 overflow-hidden bg-slate-100 flex items-center justify-center font-black text-primary">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

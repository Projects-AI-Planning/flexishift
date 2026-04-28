import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-surface w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
        <Header />
        <main className="flex-1 p-8 mt-16 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

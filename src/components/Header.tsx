import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bell, Search } from 'lucide-react';

const Header = () => {
  const { signOut, user } = useAuth();

  return (
    <header className="h-16 bg-black/40 backdrop-blur-xl border-b border-white/10 fixed top-0 right-0 left-0 md:left-64 z-10 flex items-center justify-between px-6 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-white/10 focus:border-transparent outline-none w-64 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-400 hover:bg-white/10 hover:text-white rounded-full transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-black"></span>
        </button>
        <div className="h-8 w-px bg-white/10 mx-2"></div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{user?.email}</p>
            <p className="text-xs text-gray-400">Owner</p>
          </div>
          <div className="w-8 h-8 bg-white/10 rounded-full overflow-hidden border border-white/10">
            <img 
              src={`https://ui-avatars.com/api/?name=${user?.email}&background=random`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <button 
            onClick={() => signOut()} 
            className="p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

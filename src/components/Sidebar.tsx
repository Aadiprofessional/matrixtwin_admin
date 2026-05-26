import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, Settings, Building2, Folder, BookOpen } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Companies', path: '/companies', icon: Building2 },
    { name: 'Projects', path: '/projects', icon: Folder },
    { name: 'User Management', path: '/users', icon: Users },
    { name: 'Admin Management', path: '/admins', icon: ShieldCheck },
    { name: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 h-screen fixed left-0 top-0 z-10 hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center text-sm font-bold">MT</span>
          MatrixTwin
        </h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/5'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <p className="text-xs text-gray-400">Logged in as Owner</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

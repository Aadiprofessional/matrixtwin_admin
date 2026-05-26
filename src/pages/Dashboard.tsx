import React from 'react';
import { Users, DollarSign, Activity, BarChart3 } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${color} bg-opacity-20 text-white group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'} px-2 py-1 rounded-full border border-white/5`}>
        {trend >= 0 ? '+' : ''}{trend}%
      </span>
    </div>
    <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
  </div>
);

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <div className="flex gap-2">
          <select className="bg-black/20 border border-white/10 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 backdrop-blur-md">
            <option className="bg-gray-900">Last 7 days</option>
            <option className="bg-gray-900">Last 30 days</option>
            <option className="bg-gray-900">This Year</option>
          </select>
          <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value="12,345"
          icon={Users}
          trend={12.5}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Projects"
          value="45"
          icon={Activity}
          trend={8.2}
          color="bg-purple-500"
        />
        <StatCard
          title="Revenue"
          value="$54,230"
          icon={DollarSign}
          trend={-2.4}
          color="bg-green-500"
        />
        <StatCard
          title="Construction Sites"
          value="89"
          icon={BarChart3}
          trend={5.7}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5">
                <div className="w-10 h-10 bg-white/10 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">New user registered</p>
                  <p className="text-xs text-gray-400">2 minutes ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Server Uptime</span>
              <span className="text-sm font-medium text-green-400">99.9%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full w-[99%] shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-400">Database Load</span>
              <span className="text-sm font-medium text-yellow-400">45%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full w-[45%] shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React from "react";
import { useAuth } from "../contexts/AuthContext";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  color: string;
}

function StatCard({ label, value, subtext, color }: StatCardProps) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
      <div className="h-1 rounded-full mb-3" style={{ background: color }} />
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
    </div>
  );
}

export default function TenantDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Welcome back, {user?.name || "User"}. Here's your tenant overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Monthly Spend"
          value="$0.00"
          subtext="of $100.00 budget"
          color="#00FFB2"
        />
        <StatCard
          label="Conversations"
          value="0"
          subtext="this month"
          color="#38BDF8"
        />
        <StatCard
          label="Active Providers"
          value="11"
          subtext="configured"
          color="#A78BFA"
        />
        <StatCard
          label="Total Tokens"
          value="0"
          subtext="used this month"
          color="#F472B6"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend Chart */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Spend Overview</h2>
          <div className="h-48 flex items-center justify-center text-gray-500">
            <p>No spending data yet. Start a chat to begin tracking.</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-[#00FFB2]" />
              <span className="text-gray-400">Account created</span>
              <span className="text-gray-600 ml-auto">just now</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-gray-400">11 providers configured</span>
              <span className="text-gray-600 ml-auto">default</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="/chat"
            className="block p-4 bg-[#0a0a0f] border border-gray-700 rounded-lg hover:border-[#00FFB2] transition-colors"
          >
            <p className="text-white font-medium">Start a Chat</p>
            <p className="text-gray-500 text-sm mt-1">Send messages to AI models</p>
          </a>
          <a
            href="/providers"
            className="block p-4 bg-[#0a0a0f] border border-gray-700 rounded-lg hover:border-[#00FFB2] transition-colors"
          >
            <p className="text-white font-medium">Manage Providers</p>
            <p className="text-gray-500 text-sm mt-1">Configure LLM providers</p>
          </a>
          <a
            href="/virtual-keys"
            className="block p-4 bg-[#0a0a0f] border border-gray-700 rounded-lg hover:border-[#00FFB2] transition-colors"
          >
            <p className="text-white font-medium">API Keys</p>
            <p className="text-gray-500 text-sm mt-1">Create and manage keys</p>
          </a>
        </div>
      </div>
    </div>
  );
}

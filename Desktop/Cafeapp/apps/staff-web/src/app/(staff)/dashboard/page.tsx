'use client';

import { useAuthStore } from '@/lib/auth-store';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Welcome back, {user?.name || user?.email}!</p>
        <p className="text-sm text-gray-500 mt-2">Role: {user?.role}</p>
      </div>
    </div>
  );
}

// Made with Bob

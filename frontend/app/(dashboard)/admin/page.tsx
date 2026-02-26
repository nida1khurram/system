'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';
import StatsCard from '@/components/admin/stats-card';

interface Stats {
  total_students: number;
  total_teachers: number;
  total_parents: number;
  pending_invoices: number;
  total_collected: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats]             = useState<Stats | null>(null);
  const [user, setUser]               = useState<{ name: string; role: string } | null>(null);
  const [isSuperAdmin, setIsSuperAdmin]       = useState(false);
  const [isGlobalSuperAdmin, setIsGlobalSuperAdmin] = useState(false);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    setIsSuperAdmin(!!u.is_super_admin);
    setIsGlobalSuperAdmin(!!u.is_super_admin && u.school_id == null);

    apiFetch('/api/students/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => setStats({ total_students: 0, total_teachers: 0, total_parents: 0, pending_invoices: 0, total_collected: 0 }))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name || 'Admin'} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isGlobalSuperAdmin ? 'Super Admin Dashboard' : isSuperAdmin ? 'Sub Admin Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isGlobalSuperAdmin ? 'Manage all schools from here' : 'Overview of your school'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard title="Total Students"       value={stats?.total_students ?? 0}   icon="🎓" color="bg-blue-500" />
          <StatsCard title="Teachers"             value={stats?.total_teachers ?? 0}   icon="👨‍🏫" color="bg-green-500" />
          <StatsCard title="Parents Registered"   value={stats?.total_parents ?? 0}    icon="👨‍👩‍👦" color="bg-purple-500" />
          <StatsCard title="Pending Fee Invoices" value={stats?.pending_invoices ?? 0} icon="⚠️" color="bg-orange-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isSuperAdmin && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Fee Collection Summary</h2>
              <div className="text-3xl font-bold text-green-600">
                Rs. {(stats?.total_collected ?? 0).toLocaleString('en-PK')}
              </div>
              <p className="text-gray-500 text-sm mt-1">Total collected this session</p>
              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending invoices</span>
                  <span className="font-medium text-orange-600">{stats?.pending_invoices ?? 0}</span>
                </div>
              </div>
            </div>
          )}

          <div className={`card ${!isSuperAdmin ? 'lg:col-span-2' : ''}`}>
            <h2 className="text-lg font-semibold mb-1">Quick Actions</h2>
            {isGlobalSuperAdmin && <p className="text-xs text-purple-600 mb-3 flex items-center gap-1">👑 Super Admin — Full System Access</p>}
            {!isGlobalSuperAdmin && isSuperAdmin && <p className="text-xs text-blue-600 mb-3 flex items-center gap-1">🏫 Sub Admin — Full School Access</p>}
            {!isSuperAdmin && <p className="text-xs text-orange-500 mb-3 flex items-center gap-1">🛡️ Admin — Limited Access</p>}
            <div className="grid grid-cols-2 gap-3">
              {/* Admin actions - always visible */}
              {[
                { label: 'Add Student',       href: '/admin/students',           icon: '🎓' },
                { label: 'Collect Fee',       href: '/admin/fees',               icon: '💰' },
                { label: 'Attendance Report', href: '/admin/reports/attendance', icon: '📋' },
                { label: 'Fee Report',        href: '/admin/reports/fees',       icon: '📊' },
              ].map((action) => (
                <a key={action.href} href={action.href}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                  <span className="text-xl">{action.icon}</span>
                  <span className="text-sm font-medium">{action.label}</span>
                </a>
              ))}
              {/* Global Super Admin only actions */}
              {isGlobalSuperAdmin && [
                { label: 'Manage Schools',   href: '/admin/schools',  icon: '🏫' },
                { label: 'Add Teacher',      href: '/admin/teachers', icon: '👨‍🏫' },
                { label: 'Manage Users',     href: '/admin/users',    icon: '👥' },
                { label: 'Settings',         href: '/admin/settings', icon: '⚙️' },
              ].map((action) => (
                <a key={action.label} href={action.href}
                  className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-100">
                  <span className="text-xl">{action.icon}</span>
                  <span className="text-sm font-medium text-purple-800">{action.label}</span>
                </a>
              ))}
              {/* Sub Admin actions */}
              {!isGlobalSuperAdmin && isSuperAdmin && [
                { label: 'Add Teacher',      href: '/admin/teachers', icon: '👨‍🏫' },
                { label: 'Generate Invoice', href: '/admin/fees',     icon: '🧾' },
                { label: 'Manage Users',     href: '/admin/users',    icon: '👥' },
                { label: 'Settings',         href: '/admin/settings', icon: '⚙️' },
              ].map((action) => (
                <a key={action.label} href={action.href}
                  className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100">
                  <span className="text-xl">{action.icon}</span>
                  <span className="text-sm font-medium text-blue-800">{action.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

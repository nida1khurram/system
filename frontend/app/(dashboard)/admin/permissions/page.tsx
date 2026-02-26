'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

const PERMISSION_ITEMS = [
  { key: 'show_users',          label: 'Users',           description: 'Add and manage user accounts',        icon: '👥' },
  { key: 'show_students',       label: 'Students',        description: 'View and manage student records',     icon: '🎓' },
  { key: 'show_teachers',       label: 'Teachers',        description: 'View and manage teacher records',     icon: '👨‍🏫' },
  { key: 'show_fee_management', label: 'Fee Management',  description: 'Collect fees, invoices & reports',    icon: '💰' },
  { key: 'show_settings',       label: 'Settings',        description: 'Edit school info and configuration',  icon: '⚙️' },
];

type Perms = Record<string, boolean>;

const DEFAULT_PERMS: Perms = {
  show_users: true,
  show_students: true,
  show_teachers: true,
  show_fee_management: true,
  show_settings: true,
};

export default function AdminPermissionsPage() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [perms, setPerms]     = useState<Perms>({ ...DEFAULT_PERMS });
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    if (!u.is_super_admin)  { router.push('/admin'); return; }
    setUser(u);

    apiFetch('/api/settings/admin-permissions')
      .then(r => r.json())
      .then(data => setPerms({ ...DEFAULT_PERMS, ...data }))
      .catch(() => {});
  }, [router]);

  const toggle = (key: string) =>
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res  = await apiFetch('/api/settings/admin-permissions', {
        method: 'PUT',
        body: JSON.stringify(perms),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Failed to save'); return; }
      setSuccess('Permissions saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Could not connect to the server');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name || 'Admin'} />
      <main className="max-w-2xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Permissions</h1>
          <p className="text-gray-500 text-sm mt-1">
            Control which navbar pages regular admins can access. Super Admins always see everything.
          </p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-4 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">👑</span>
            <h2 className="font-semibold text-gray-800">Navbar Access for Regular Admins</h2>
          </div>
          <p className="text-xs text-gray-400 mb-6">
            Toggle each section on or off. Changes take effect immediately after saving.
          </p>

          <div className="space-y-3">
            {PERMISSION_ITEMS.map(item => {
              const enabled = perms[item.key] !== false;
              return (
                <div
                  key={item.key}
                  onClick={() => toggle(item.key)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer select-none transition-all ${
                    enabled
                      ? 'border-purple-200 bg-purple-50 hover:border-purple-300'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium ${enabled ? 'text-purple-600' : 'text-gray-400'}`}>
                      {enabled ? 'Visible' : 'Hidden'}
                    </span>
                    {/* Toggle switch */}
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-purple-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dashboard note */}
          <div className="mt-4 flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-white opacity-60">
            <span className="text-2xl">🏠</span>
            <div>
              <p className="font-medium text-gray-600">Dashboard</p>
              <p className="text-xs text-gray-400">Always visible — cannot be hidden</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400">Always On</span>
              <div className="relative w-11 h-6 rounded-full bg-gray-300">
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {Object.values(perms).filter(Boolean).length} of {PERMISSION_ITEMS.length} sections enabled
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-6 py-2.5"
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}

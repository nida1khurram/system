'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

const ROLES = [
  { key: 'all',     label: 'All Users',  icon: '👥', color: 'bg-gray-600' },
  { key: 'student', label: 'Students',   icon: '🎓', color: 'bg-blue-600' },
  { key: 'teacher', label: 'Teachers',   icon: '👨‍🏫', color: 'bg-green-600' },
  { key: 'parent',  label: 'Parents',    icon: '👨‍👩‍👦', color: 'bg-purple-600' },
  { key: 'admin',   label: 'Admins',     icon: '🛡️', color: 'bg-red-600' },
];

const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-red-100 text-red-700',
  teacher: 'bg-green-100 text-green-700',
  parent:  'bg-purple-100 text-purple-700',
  student: 'bg-blue-100 text-blue-700',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'teacher', phone: '', is_super_admin: false };

export default function AdminUsers() {
  const router = useRouter();
  const [user, setUser]               = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers]             = useState<any[]>([]);
  const [activeTab, setActiveTab]     = useState('all');
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [formError, setFormError]     = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const loadUsers = (role: string) => {
    setLoading(true);
    const url = role === 'all' ? '/api/users/' : `/api/users/?role=${role}`;
    apiFetch(url)
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    setIsSuperAdmin(!!u.is_super_admin);
    loadUsers('all');
  }, [router]);

  const handleTabChange = (role: string) => {
    setActiveTab(role);
    setSearch('');
    loadUsers(role);
  };

  const handleToggle = async (userId: number) => {
    await apiFetch(`/api/users/${userId}/toggle`, { method: 'PATCH' });
    loadUsers(activeTab);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (form.password.length < 6) { setFormError('Password must be at least 6 characters'); return; }
    setFormLoading(true);
    try {
      const res  = await apiFetch('/api/users/create', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.detail || 'Could not create user'); return; }
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      loadUsers(activeTab);
    } catch {
      setFormError('Could not connect to the server');
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Count per role
  const counts = users.reduce((acc: any, u: any) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 text-sm mt-1">All registered users categorized by role</p>
          </div>
          <button
            onClick={() => { setForm({ ...EMPTY_FORM }); setFormError(''); setShowModal(true); }}
            className="btn-primary px-4 py-2 text-sm"
          >
            + Add User
          </button>
        </div>

        {/* Create User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900">Create New User</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {formError && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{formError}</div>
              )}

              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" value={form.name} required
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="input-field" placeholder="Muhammad Ali" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={form.email} required
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="input-field" placeholder="ali@gmail.com" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="input-field" placeholder="03001234567" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value, is_super_admin: false })}
                    className="input-field">
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                    <option value="student">Student</option>
                    {isSuperAdmin && <option value="admin">Admin</option>}
                  </select>
                </div>

                {form.role === 'admin' && isSuperAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.is_super_admin}
                      onChange={e => setForm({ ...form, is_super_admin: e.target.checked })}
                      className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Make Super Admin (can manage fees)</span>
                  </label>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input type="password" value={form.password} required minLength={6}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="input-field" placeholder="at least 6 characters" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={formLoading} className="flex-1 btn-primary py-2 text-sm">
                    {formLoading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Role Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ROLES.map(r => {
            const count = r.key === 'all' ? users.length : (counts[r.key] || 0);
            return (
              <button
                key={r.key}
                onClick={() => handleTabChange(r.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  activeTab === r.key
                    ? `${r.color} text-white shadow-md`
                    : 'bg-white border text-gray-600 hover:border-gray-400'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === r.key ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Summary Cards (only on All tab) */}
        {activeTab === 'all' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {ROLES.slice(1).map(r => (
              <div key={r.key} className="card text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleTabChange(r.key)}>
                <div className="text-3xl mb-1">{r.icon}</div>
                <div className="text-2xl font-bold text-gray-800">{counts[r.key] || 0}</div>
                <div className="text-gray-500 text-sm">{r.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="card">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field mb-4"
          />

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Phone</th>
                    <th className="pb-3 pr-4">Joined</th>
                    <th className="pb-3 pr-4">Status</th>
                    {isSuperAdmin && <th className="pb-3">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? 7 : 6} className="py-12 text-center text-gray-500">
                        No {activeTab === 'all' ? '' : activeTab + 's'} found
                      </td>
                    </tr>
                  ) : filtered.map(u => (
                    <tr key={u.id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white ${
                            u.role === 'admin' ? 'bg-red-500' :
                            u.role === 'teacher' ? 'bg-green-500' :
                            u.role === 'parent' ? 'bg-purple-500' : 'bg-blue-500'
                          }`}>
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{u.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[u.role]}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{u.phone || '—'}</td>
                      <td className="py-3 pr-4 text-gray-400 text-xs">{u.created_at?.slice(0, 10)}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3">
                          <button
                            onClick={() => handleToggle(u.id)}
                            className={`text-xs hover:underline ${u.is_active ? 'text-red-500' : 'text-green-500'}`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

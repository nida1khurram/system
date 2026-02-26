'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface School {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  student_count: number;
  teacher_count: number;
  admin_name: string | null;
  admin_email: string | null;
}

interface CreateForm {
  name: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

export default function SchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({ name: '', admin_name: '', admin_email: '', admin_password: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<{ name: string; email: string; password: string } | null>(null);

  useEffect(() => {
    // Verify super admin
    const stored = localStorage.getItem('user');
    if (!stored) { router.replace('/login'); return; }
    try {
      const user = JSON.parse(stored);
      // Only global super admin (school_id=null) can access schools management
      if (!user.is_super_admin || user.school_id != null) { router.replace('/admin'); return; }
    } catch { router.replace('/login'); return; }
    loadSchools();
  }, [router]);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/schools/');
      const data = await res.json();
      if (res.ok) setSchools(data.schools || []);
      else setError(data.detail || 'Failed to load schools');
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('School name is required'); return; }
    setFormLoading(true);
    try {
      const res = await apiFetch('/api/schools/', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          admin_name: form.admin_name.trim() || undefined,
          admin_email: form.admin_email.trim() || undefined,
          admin_password: form.admin_password || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.detail || 'Failed to create school'); return; }

      if (data.admin) setCreatedAdmin(data.admin);
      else setShowCreate(false);

      setForm({ name: '', admin_name: '', admin_email: '', admin_password: '' });
      loadSchools();
    } catch {
      setFormError('Could not connect to server');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleActive = async (school: School) => {
    try {
      const res = await apiFetch(`/api/schools/${school.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !school.is_active }),
      });
      if (res.ok) loadSchools();
    } catch {}
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading schools...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage schools — each school is isolated with its own data</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreatedAdmin(null); setFormError(''); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          + Create New School
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
      )}

      {/* Create School Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {createdAdmin ? (
              <>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">✅</div>
                  <h2 className="text-lg font-bold text-gray-900">School Created!</h2>
                  <p className="text-gray-500 text-sm mt-1">Save these admin credentials — they won&apos;t be shown again</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2 text-sm">
                  <div><span className="font-medium text-gray-700">Name:</span> {createdAdmin.name}</div>
                  <div><span className="font-medium text-gray-700">Email:</span> {createdAdmin.email}</div>
                  <div><span className="font-medium text-gray-700">Password:</span> <code className="bg-white px-1 py-0.5 rounded border">{createdAdmin.password}</code></div>
                </div>
                <button
                  onClick={() => { setShowCreate(false); setCreatedAdmin(null); }}
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Create New School</h2>
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{formError}</div>
                )}
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="input-field"
                      placeholder="e.g. Al-Noor Academy"
                      required
                    />
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">School Admin (optional)</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admin Name</label>
                        <input
                          type="text"
                          value={form.admin_name}
                          onChange={e => setForm({ ...form, admin_name: e.target.value })}
                          className="input-field"
                          placeholder="e.g. Mr. Ahmed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                        <input
                          type="email"
                          value={form.admin_email}
                          onChange={e => setForm({ ...form, admin_email: e.target.value })}
                          className="input-field"
                          placeholder="admin@school.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
                        <input
                          type="text"
                          value={form.admin_password}
                          onChange={e => setForm({ ...form, admin_password: e.target.value })}
                          className="input-field"
                          placeholder="min 8 characters"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-60"
                    >
                      {formLoading ? 'Creating...' : 'Create School'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Schools List */}
      {schools.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🏫</div>
          <p className="font-medium">No schools yet</p>
          <p className="text-sm mt-1">Create the first school to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map(school => (
            <div
              key={school.id}
              className={`bg-white rounded-xl border shadow-sm p-5 ${!school.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{school.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${school.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {school.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  onClick={() => toggleActive(school)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  {school.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>

              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Students</span>
                  <span className="font-medium text-gray-900">{school.student_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Teachers</span>
                  <span className="font-medium text-gray-900">{school.teacher_count}</span>
                </div>
              </div>

              {school.admin_name && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Admin</p>
                  <p className="text-sm font-medium text-gray-800">{school.admin_name}</p>
                  <p className="text-xs text-gray-500">{school.admin_email}</p>
                </div>
              )}

              {!school.admin_name && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-400 italic">No admin assigned</p>
                </div>
              )}

              <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                Created {new Date(school.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

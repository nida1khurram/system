'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

export default function AdminTeachers() {
  const router = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [teachers, setTeachers]   = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({ name: '', email: '', password: '', phone: '', subject: '', qualification: '', salary: '' });

  const load = () => apiFetch('/api/teachers/').then(r => r.json()).then(d => setTeachers(d.teachers || []));

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    setIsSuperAdmin(!!u.is_super_admin);
    load();
  }, [router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiFetch('/api/teachers/', { method: 'POST', body: JSON.stringify({ ...form, salary: form.salary ? parseFloat(form.salary) : null }) });
    const data = await res.json();
    if (!res.ok) { setError(data.detail || 'Failed'); setSaving(false); return; }
    setShowModal(false);
    setForm({ name: '', email: '', password: '', phone: '', subject: '', qualification: '', salary: '' });
    load();
    setSaving(false);
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Remove this teacher?')) return;
    await apiFetch(`/api/teachers/${id}`, { method: 'DELETE' });
    load();
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
            <p className="text-gray-500 text-sm">{teachers.length} total teachers</p>
          </div>
          {isSuperAdmin
            ? <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Teacher</button>
            : <span className="text-xs text-orange-500 flex items-center gap-1">🔒 Only Super Admin can add teachers</span>
          }
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.length === 0 ? (
            <div className="col-span-3 card text-center py-16 text-gray-500">
              <p className="text-5xl mb-3">👨‍🏫</p>
              <p className="font-medium text-lg">No teachers added yet</p>
              <p className="text-sm mt-1">Click "Add Teacher" to get started</p>
            </div>
          ) : teachers.map(t => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xl">{t.name?.[0]?.toUpperCase()}</div>
                  <div>
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="text-xs text-gray-500">{t.employee_id}</p>
                  </div>
                </div>
                <button onClick={() => handleRemove(t.id)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p>Subject: <span className="font-medium">{t.subject || '—'}</span></p>
                <p>Qualification: <span className="font-medium">{t.qualification || '—'}</span></p>
                <p>Phone: <span className="font-medium">{t.phone || '—'}</span></p>
                <p>Email: <span className="font-medium text-xs">{t.email}</span></p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">Add New Teacher</h2>
                <button onClick={() => { setShowModal(false); setError(''); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{error}</div>}
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" required /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Subject</label><input type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="input-field" /></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" required /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Password *</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone</label><input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Salary (Rs.)</label><input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} className="input-field" /></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Qualification</label><input type="text" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} className="input-field" placeholder="e.g. B.Ed, M.Sc" /></div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowModal(false); setError(''); }} className="flex-1 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Adding...' : 'Add Teacher'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

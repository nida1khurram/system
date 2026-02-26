'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

interface ClassItem { id: number; name: string; grade: string; section: string; }

export default function TeacherStudents() {
  const router = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [students, setStudents]   = useState<any[]>([]);
  const [classes, setClasses]     = useState<ClassItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [lastRoll, setLastRoll]   = useState('');
  const [lastLinkCode, setLastLinkCode] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    class_id: '', gender: 'male', blood_group: '',
  });

  const load = () =>
    apiFetch('/api/students/')
      .then(r => r.json())
      .then(data => setStudents(data.students || []));

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (!['teacher', 'admin'].includes(u.role)) { router.push(`/${u.role}`); return; }
    setUser(u);
    load().finally(() => setLoading(false));
    apiFetch('/api/classes/').then(r => r.json()).then(d => setClasses(d.classes || []));
  }, [router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res  = await apiFetch('/api/students/', {
        method: 'POST',
        body: JSON.stringify({ ...form, class_id: parseInt(form.class_id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) ? data.detail.map((e: any) => e.msg).join(', ') : 'Failed to add student';
        setError(msg); return;
      }
      setLastRoll(data.student?.roll_number || '');
      setLastLinkCode(data.student?.link_code || '');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', phone: '', class_id: '', gender: 'male', blood_group: '' });
      load();
      setTimeout(() => setLastRoll(''), 5000);
    } catch {
      setError('Could not connect to the server. Make sure the backend is running.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="teacher" userName={user?.name} />
      <main className="max-w-6xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-500 text-sm">{students.length} total students</p>
          </div>
          <button onClick={() => { setForm({ name: '', email: '', password: '', phone: '', class_id: '', gender: 'male', blood_group: '' }); setError(''); setShowModal(true); }} className="btn-primary">
            + Add Student
          </button>
        </div>

        {lastRoll && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Student added! Roll: <strong className="font-mono">{lastRoll}</strong></span>
            </div>
            {lastLinkCode && (
              <div className="mt-1 ml-5">
                Parent Link Code: <strong className="font-mono tracking-widest">{lastLinkCode}</strong>
                <span className="ml-2 text-xs text-green-600">(share with parent to link this student)</span>
              </div>
            )}
          </div>
        )}

        <div className="card">
          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field mb-4"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 ? (
              <p className="text-gray-500 col-span-3 text-center py-8">No students found</p>
            ) : filtered.map(s => (
              <div key={s.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-lg">
                    {s.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-gray-500">Roll: {s.roll_number}</p>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600 space-y-0.5">
                  <p>Class: <span className="font-medium">{s.class_name || '—'}</span></p>
                  <p>Email: <span className="font-medium text-xs">{s.email}</span></p>
                  <p>Gender: <span className="font-medium capitalize">{s.gender || '—'}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">Add New Student</h2>
                <button onClick={() => { setShowModal(false); setError(''); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{error}</div>
              )}

              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" required />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
                  <span>🎫</span> Roll number will be automatically assigned based on class
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" required />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Class *</label>
                    <select value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} className="input-field" required>
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade}-{c.section})</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                    <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="input-field">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Blood Group</label>
                    <select value={form.blood_group} onChange={e => setForm({...form, blood_group: e.target.value})} className="input-field">
                      <option value="">Select</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowModal(false); setError(''); }} className="flex-1 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Adding...' : 'Add Student'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

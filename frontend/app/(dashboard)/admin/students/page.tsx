'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

interface Student { id: number; name: string; roll_number: string; link_code: string; email: string; class_name: string | null; gender: string | null; is_active: boolean; }
interface ClassItem { id: number; name: string; grade: string; section: string; }

export default function AdminStudents() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses]   = useState<ClassItem[]>([]);
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({ name: '', father_name: '', email: '', password: '', phone: '', address: '', class_id: '', gender: 'male', blood_group: '' });
  const [lastRoll, setLastRoll] = useState('');
  const [lastLinkCode, setLastLinkCode] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const load = () => apiFetch('/api/students/').then(r => r.json()).then(d => setStudents(d.students || []));

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    load();
    apiFetch('/api/classes/').then(r => r.json()).then(d => setClasses(d.classes || []));
  }, [router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.class_id) { setError('Please select a class.'); return; }
    setSaving(true); setError('');
    try {
      const res  = await apiFetch('/api/students/', { method: 'POST', body: JSON.stringify({ ...form, class_id: parseInt(form.class_id) }) });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) ? data.detail.map((e: any) => e.msg).join(', ') : 'Failed to add student';
        setError(msg); setSaving(false); return;
      }
      setLastRoll(data.student?.roll_number || '');
      setLastLinkCode(data.student?.link_code || '');
      setShowModal(false);
      setForm({ name: '', father_name: '', email: '', password: '', phone: '', address: '', class_id: '', gender: 'male', blood_group: '' });
      load();
      setTimeout(() => setLastRoll(''), 5000);
    } catch {
      setError('Could not connect to the server. Make sure the backend is running.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    await apiFetch(`/api/students/${id}`, { method: 'DELETE' });
    load();
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-500 text-sm">{students.length} total students</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Student</button>
        </div>

        {lastRoll && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-bold text-base">✓</span>
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
          <input type="text" placeholder="Search by name or roll number..." value={search} onChange={e => setSearch(e.target.value)} className="input-field mb-4" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Roll No</th>
                  <th className="pb-3 pr-4">Link Code</th>
                  <th className="pb-3 pr-4">Class</th>
                  <th className="pb-3 pr-4">Gender</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-500">No students found. Click "Add Student" to add one.</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">{s.name?.[0]?.toUpperCase()}</div>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-sm">{s.roll_number}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg tracking-wider">
                          {s.link_code || '—'}
                        </span>
                        {s.link_code && (
                          <button
                            onClick={() => copyCode(s.id, s.link_code)}
                            title="Copy link code"
                            className="text-gray-400 hover:text-gray-600 text-xs"
                          >
                            {copiedId === s.id ? '✓' : '⎘'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">{s.class_name || <span className="text-gray-400">—</span>}</td>
                    <td className="py-3 pr-4 capitalize">{s.gender || '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <a href={`/admin/students/${s.id}`} className="text-blue-500 hover:underline text-xs">View</a>
                        {s.is_active && (
                          <button onClick={() => handleDeactivate(s.id)} className="text-red-500 hover:underline text-xs">Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{error}</div>}
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Student Name *</label>
                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Father Name</label>
                    <input type="text" value={form.father_name} onChange={e => setForm({...form, father_name: e.target.value})} className="input-field" placeholder="Father's full name" />
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
                  <span>🎫</span> Roll number will be automatically assigned based on class
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" placeholder="Leave blank for primary students" />
                  <p className="text-xs text-gray-400 mt-1">Agar student khud portal use kare to email zaroori hai</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" placeholder="Leave blank — auto-generated" />
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone</label><input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" /></div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Home Address</label>
                  <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field" placeholder="Street, City" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Class * {!form.class_id && <span className="text-red-400">(select one)</span>}
                  </label>
                  {classes.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-xs text-gray-400">
                      No classes found. Please run <code className="bg-gray-100 px-1 rounded">python seed.py</code> in backend to add classes.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {classes.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setForm({...form, class_id: String(c.id)})}
                          className={`px-2 py-2 rounded-lg border text-xs font-medium text-center transition-all ${
                            form.class_id === String(c.id)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                    <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="input-field">
                      <option value="male">Male</option><option value="female">Female</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Blood Group</label>
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

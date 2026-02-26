'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

export default function TeacherMarks() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks]       = useState<any[]>([]);
  const [form, setForm]         = useState({ student_id: '', subject: '', exam_type: 'midterm', total_marks: 100, obtained_marks: '', exam_date: new Date().toISOString().split('T')[0], remarks: '' });
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (!['teacher', 'admin'].includes(u.role)) { router.push(`/${u.role}`); return; }
    setUser(u);

    apiFetch('/api/students/').then(r => r.json()).then(d => setStudents(d.students || []));
    apiFetch('/api/marks/').then(r => r.json()).then(d => setMarks(d.marks || []));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await apiFetch('/api/marks/', { method: 'POST', body: JSON.stringify({ ...form, student_id: parseInt(form.student_id), class_id: 1 }) });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Marks saved! Grade: ${data.mark?.grade}`);
      apiFetch('/api/marks/').then(r => r.json()).then(d => setMarks(d.marks || []));
      setForm(f => ({ ...f, obtained_marks: '', remarks: '' }));
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="teacher" userName={user?.name} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Enter Marks</h1>

        {msg && <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 mb-4 text-sm">{msg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold mb-4">Add Marks</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <select value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} className="input-field" required>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>)}
              </select>
              <input type="text" placeholder="Subject" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="input-field" required />
              <select value={form.exam_type} onChange={e => setForm({...form, exam_type: e.target.value})} className="input-field">
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Total Marks" value={form.total_marks} onChange={e => setForm({...form, total_marks: parseInt(e.target.value)})} className="input-field" required />
                <input type="number" placeholder="Obtained Marks" value={form.obtained_marks} onChange={e => setForm({...form, obtained_marks: e.target.value})} className="input-field" required />
              </div>
              <input type="date" value={form.exam_date} onChange={e => setForm({...form, exam_date: e.target.value})} className="input-field" />
              <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Saving...' : 'Save Marks'}</button>
            </form>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Recent Marks</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {marks.length === 0 ? <p className="text-gray-500 text-sm">No marks recorded</p> :
                marks.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                    <div><p className="font-medium">{m.student_name}</p><p className="text-xs text-gray-500">{m.subject} - {m.exam_type}</p></div>
                    <div className="text-right"><p className="font-bold">{m.obtained_marks}/{m.total_marks}</p>
                      <span className={`text-xs font-bold ${['A+','A'].includes(m.grade) ? 'text-green-600' : m.grade === 'B' ? 'text-blue-600' : 'text-orange-600'}`}>{m.grade}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

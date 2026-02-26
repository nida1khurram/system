'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

export default function TeacherAttendance() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (!['teacher', 'admin'].includes(u.role)) { router.push(`/${u.role}`); return; }
    setUser(u);

    apiFetch('/api/students/')
      .then(r => r.json())
      .then(data => {
        const list = data.students || [];
        setStudents(list);
        const init: Record<number, string> = {};
        list.forEach((s: any) => init[s.id] = 'present');
        setAttendance(init);
      });
  }, [router]);

  const handleSubmit = async () => {
    setSaving(true);
    const records = students.map(s => ({
      student_id: s.id, class_id: 1, date, status: attendance[s.id] || 'present', marked_by: user?.id, remarks: ''
    }));
    await apiFetch('/api/attendance/', { method: 'POST', body: JSON.stringify({ records }) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="teacher" userName={user?.name} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-auto" />
        </div>

        {saved && <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 mb-4 text-sm">Attendance saved successfully!</div>}

        <div className="card">
          <div className="space-y-2">
            {students.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No students found</p>
            ) : students.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-gray-500">Roll: {s.roll_number}</p>
                </div>
                <div className="flex gap-2">
                  {['present', 'absent', 'late'].map(status => (
                    <button key={status} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: status }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                        attendance[s.id] === status
                          ? status === 'present' ? 'bg-green-500 text-white'
                          : status === 'absent' ? 'bg-red-500 text-white'
                          : 'bg-yellow-500 text-white'
                          : 'bg-white border text-gray-600 hover:bg-gray-100'
                      }`}>{status}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {students.length > 0 && (
            <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full mt-4">
              {saving ? 'Saving...' : 'Submit Attendance'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

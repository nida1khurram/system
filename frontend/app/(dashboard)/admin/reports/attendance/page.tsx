'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

export default function AttendanceReport() {
  const router = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    fetchData(new Date().toISOString().split('T')[0]);
  }, [router]);

  const fetchData = (date: string) => {
    setLoading(true);
    apiFetch(`/api/attendance/?date_filter=${date}`)
      .then(r => r.json())
      .then(d => setAttendance(d.attendance || []))
      .finally(() => setLoading(false));
  };

  const present = attendance.filter(a => a.status === 'present').length;
  const absent  = attendance.filter(a => a.status === 'absent').length;
  const late    = attendance.filter(a => a.status === 'late').length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
          <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); fetchData(e.target.value); }} className="input-field w-auto" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card text-center border-l-4 border-l-green-500"><div className="text-3xl font-bold text-green-600">{present}</div><div className="text-gray-500 text-sm mt-1">Present</div></div>
          <div className="card text-center border-l-4 border-l-red-500"><div className="text-3xl font-bold text-red-600">{absent}</div><div className="text-gray-500 text-sm mt-1">Absent</div></div>
          <div className="card text-center border-l-4 border-l-yellow-500"><div className="text-3xl font-bold text-yellow-600">{late}</div><div className="text-gray-500 text-sm mt-1">Late</div></div>
        </div>

        <div className="card overflow-x-auto">
          {loading ? <p className="text-center py-8 text-gray-500">Loading...</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                  <th className="pb-3 pr-4">Student</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendance.length === 0 ? (
                  <tr><td colSpan={3} className="py-12 text-center text-gray-500">No attendance records for this date</td></tr>
                ) : attendance.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium">{a.student_name}</td>
                    <td className="py-3 pr-4 text-gray-500">{a.date}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        a.status === 'present' ? 'bg-green-100 text-green-700' :
                        a.status === 'absent'  ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

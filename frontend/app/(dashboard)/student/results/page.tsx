'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

export default function StudentResults() {
  const router = useRouter();
  const [user, setUser]   = useState<any>(null);
  const [marks, setMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (!['student', 'admin'].includes(u.role)) { router.push(`/${u.role}`); return; }
    setUser(u);

    apiFetch('/api/marks/')
      .then(r => r.json())
      .then(data => setMarks(data.marks || []))
      .catch(() => setMarks([]))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="student" userName={user?.name} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Results</h1>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                <th className="pb-3 pr-4">Subject</th>
                <th className="pb-3 pr-4">Exam Type</th>
                <th className="pb-3 pr-4">Marks</th>
                <th className="pb-3">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {marks.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">No results recorded yet</td></tr>
              ) : marks.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium">{m.subject}</td>
                  <td className="py-3 pr-4 capitalize text-gray-600">{m.exam_type}</td>
                  <td className="py-3 pr-4">{m.obtained_marks}/{m.total_marks}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      ['A+','A'].includes(m.grade) ? 'bg-green-100 text-green-700' :
                      m.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                      m.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'}`}>
                      {m.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

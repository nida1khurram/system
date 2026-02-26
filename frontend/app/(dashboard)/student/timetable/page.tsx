'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/navbar';

const TIMETABLE = [
  { day: 'Monday',    periods: ['Math', 'English', 'Science', 'Urdu', 'Computer', 'Islamic'] },
  { day: 'Tuesday',   periods: ['English', 'Math', 'Urdu', 'Science', 'Art', 'P.E'] },
  { day: 'Wednesday', periods: ['Science', 'Urdu', 'Math', 'English', 'Islamic', 'Computer'] },
  { day: 'Thursday',  periods: ['Urdu', 'Science', 'English', 'Math', 'P.E', 'Art'] },
  { day: 'Friday',    periods: ['Math', 'Islamic', 'Science', 'English', 'Urdu', 'Computer'] },
];

export default function StudentTimetable() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (!['student', 'admin'].includes(u.role)) { router.push(`/${u.role}`); return; }
    setUser(u);
  }, [router]);

  if (!user) return null;

  const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-yellow-100 text-yellow-700'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="student" userName={user?.name} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Class Timetable</h1>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3 pr-4 text-gray-500 uppercase text-xs font-medium">Day</th>
                {['1st', '2nd', '3rd', '4th', '5th', '6th'].map(p => (
                  <th key={p} className="pb-3 pr-4 text-gray-500 uppercase text-xs font-medium">{p} Period</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {TIMETABLE.map(row => (
                <tr key={row.day}>
                  <td className="py-3 pr-4 font-semibold text-gray-700">{row.day}</td>
                  {row.periods.map((subject, i) => (
                    <td key={i} className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[i]}`}>{subject}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

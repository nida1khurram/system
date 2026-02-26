'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';
import Link from 'next/link';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser]       = useState<{ id: number; name: string; role: string } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [marks, setMarks]     = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [homeworks, setHomeworks]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (!['student', 'admin'].includes(u.role)) { router.push(`/${u.role}`); return; }
    setUser(u);

    Promise.all([
      apiFetch('/api/marks/').then(r => r.json()),
      apiFetch('/api/attendance/').then(r => r.json()),
      apiFetch('/api/students/profile').then(r => r.json()),
      apiFetch('/api/homework/').then(r => r.json()),
    ]).then(([marksData, attData, profileData, hwData]) => {
      setMarks(marksData.marks?.slice(0, 5) || []);
      setAttendance(attData.attendance || []);
      if (profileData.success) setProfile(profileData.student);
      setHomeworks(hwData.homeworks?.slice(0, 5) || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  const present = attendance.filter(a => a.status === 'present').length;
  const attPct  = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="student" userName={user?.name || 'Student'} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome, {user?.name}</p>
          {profile && (
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {profile.class_name && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  🏫 {profile.class_name}
                </span>
              )}
              {profile.roll_number && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                  🎓 Roll No: {profile.roll_number}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Link Code Card */}
        {profile?.link_code && (
          <div className="card mb-6 bg-amber-50 border border-amber-200">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Your Parent Link Code</p>
                <p className="text-2xl font-mono font-bold tracking-widest text-amber-900">{profile.link_code}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-700">Share this code with your parent so they can link your profile to their account.</p>
              </div>
              <button
                onClick={() => copyCode(profile.link_code)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors flex-shrink-0"
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-4xl font-bold text-blue-600">{attPct}%</div>
            <div className="text-gray-500 text-sm mt-1">Attendance Rate</div>
            <div className="text-xs text-gray-400 mt-0.5">{present}/{attendance.length} days</div>
          </div>
          <div className="card text-center">
            <div className="text-4xl font-bold text-green-600">{marks.length}</div>
            <div className="text-gray-500 text-sm mt-1">Exams Recorded</div>
          </div>
          <div className="card text-center">
            <div className="text-4xl font-bold text-purple-600">
              {marks.length > 0 ? marks[0].grade : '-'}
            </div>
            <div className="text-gray-500 text-sm mt-1">Latest Grade</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Homework Card */}
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">
              Homework
              {profile?.class_name && (
                <span className="ml-2 text-sm font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {profile.class_name}
                </span>
              )}
            </h2>
            {homeworks.length === 0 ? (
              <p className="text-gray-500 text-sm">No homework assigned yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {homeworks.map((hw) => {
                  const isOverdue = new Date(hw.due_date) < new Date() ;
                  return (
                    <div key={hw.id} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{hw.title}</p>
                          <p className="text-xs text-gray-500">{hw.subject}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {isOverdue ? 'Overdue' : 'Pending'}
                        </span>
                      </div>
                      {hw.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">{hw.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Due: {new Date(hw.due_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Recent Results</h2>
            {marks.length === 0 ? (
              <p className="text-gray-500 text-sm">No results recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {marks.map((mark) => (
                  <div key={mark.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{mark.subject}</p>
                      <p className="text-xs text-gray-500">{mark.exam_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{mark.obtained_marks}/{mark.total_marks}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        ['A+','A'].includes(mark.grade) ? 'bg-green-100 text-green-700' :
                        mark.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                        mark.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'}`}>
                        {mark.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
            <div className="space-y-2">
              {[
                { href: '/student/results',   label: 'View All Results', icon: '📊' },
                { href: '/student/timetable', label: 'Class Timetable',  icon: '🕐' },
              ].map((link) => (
                <Link key={link.href} href={link.href}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                  <span className="text-xl">{link.icon}</span>
                  <span className="font-medium text-sm">{link.label}</span>
                  <span className="ml-auto text-gray-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/navbar';
import Link from 'next/link';

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (!['teacher', 'admin'].includes(u.role)) { router.push(`/${u.role}`); return; }
    setUser(u);
  }, [router]);

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="teacher" userName={user.name} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user.name}! Manage your class activities.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Mark Attendance', desc: 'Record daily student attendance', href: '/teacher/attendance', icon: '📋', color: 'bg-green-500' },
            { title: 'Enter Marks',     desc: 'Add exam and test marks',         href: '/teacher/marks',      icon: '📝', color: 'bg-blue-500' },
            { title: 'View Students',   desc: 'See your class students',         href: '/teacher/students',   icon: '🎓', color: 'bg-orange-500' },
          ].map((card) => (
            <Link key={card.href} href={card.href} className="card hover:shadow-md transition-shadow group">
              <div className={`${card.color} text-white w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                {card.icon}
              </div>
              <h3 className="font-semibold text-lg">{card.title}</h3>
              <p className="text-gray-500 text-sm mt-1">{card.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 card">
          <h2 className="text-lg font-semibold mb-4">Today&apos;s Overview</h2>
          <p className="text-gray-500">Select a class to view today&apos;s attendance and activities.</p>
          <Link href="/teacher/attendance" className="btn-primary mt-4 inline-block">
            Start Attendance
          </Link>
        </div>
      </main>
    </div>
  );
}

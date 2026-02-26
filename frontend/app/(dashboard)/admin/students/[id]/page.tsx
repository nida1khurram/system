'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

interface Student {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  roll_number: string;
  admission_number: string;
  link_code: string;
  class_name: string | null;
  gender: string | null;
  blood_group: string | null;
  father_name: string | null;
  address: string | null;
  date_of_birth: string | null;
  admission_date: string | null;
  is_active: boolean;
  created_at: string | null;
}

export default function StudentDetailPage() {
  const router   = useRouter();
  const params   = useParams();
  const id       = params?.id as string;

  const [user, setUser]       = useState<any>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);

    apiFetch(`/api/students/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setStudent(d.student);
        else setError('Student not found');
      })
      .catch(() => setError('Could not load student data'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  if (error || !student) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 font-medium">{error || 'Student not found'}</p>
        <Link href="/admin/students" className="text-blue-500 text-sm mt-2 inline-block hover:underline">← Back to Students</Link>
      </div>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide w-36 flex-shrink-0 mb-1 sm:mb-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value || <span className="text-gray-400 font-normal">—</span>}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back */}
        <Link href="/admin/students" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Back to Students
        </Link>

        {/* Header */}
        <div className="card mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {student.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${student.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {student.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {student.father_name && (
              <p className="text-sm text-gray-500 mt-0.5">S/O {student.father_name}</p>
            )}
            <p className="text-sm text-gray-400 mt-0.5">{student.class_name || 'No class assigned'}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400">Roll No</p>
            <p className="font-mono font-bold text-gray-800 text-lg">{student.roll_number || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-1">Personal Information</h2>
            <p className="text-xs text-gray-400 mb-4">Student ki personal details</p>
            <InfoRow label="Full Name"    value={student.name} />
            <InfoRow label="Father Name"  value={student.father_name} />
            <InfoRow label="Gender"       value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : null} />
            <InfoRow label="Date of Birth" value={student.date_of_birth} />
            <InfoRow label="Blood Group"  value={student.blood_group} />
            <InfoRow label="Home Address" value={student.address} />
          </div>

          {/* Academic Info */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-1">Academic Information</h2>
            <p className="text-xs text-gray-400 mb-4">School record aur login details</p>
            <InfoRow label="Class"         value={student.class_name} />
            <InfoRow label="Roll Number"   value={student.roll_number} />
            <InfoRow label="Adm. Number"   value={student.admission_number} />
            <InfoRow label="Adm. Date"     value={student.admission_date} />
            <InfoRow label="Email"         value={student.email?.includes('@school.local') ? '(No email)' : student.email} />
            <InfoRow label="Phone"         value={student.phone} />
          </div>

          {/* Link Code */}
          <div className="card md:col-span-2">
            <h2 className="text-base font-semibold text-gray-800 mb-1">Parent Link Code</h2>
            <p className="text-xs text-gray-400 mb-4">Yeh code parent ko de kar unhe student se link karein</p>
            <div className="flex items-center gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-3">
                <p className="font-mono text-2xl font-bold tracking-[0.3em] text-amber-800">
                  {student.link_code || '—'}
                </p>
              </div>
              {student.link_code && (
                <button
                  onClick={() => navigator.clipboard.writeText(student.link_code)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Copy Code
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

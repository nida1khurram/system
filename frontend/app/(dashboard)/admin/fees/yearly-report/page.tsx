'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAcademicYear } from '@/lib/useAcademicYear';
import Navbar from '@/components/ui/navbar';

export default function YearlyReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const [classes, setClasses]   = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const defaultYear             = useAcademicYear();

  const [classFilter, setClassFilter]         = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [academicYear, setAcademicYear]       = useState('');

  const [loading, setLoading] = useState(false);
  const [report, setReport]   = useState<any>(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    apiFetch('/api/classes/').then(r => r.json()).then(d => setClasses(d.classes || []));
    apiFetch('/api/students/').then(r => r.json()).then(d => setStudents(d.students || []));
  }, [router]);

  useEffect(() => {
    if (defaultYear && !academicYear) setAcademicYear(defaultYear);
  }, [defaultYear]);

  // When class filter changes, reset selected student + report
  const handleClassFilter = (classId: string) => {
    setClassFilter(classId);
    setSelectedStudent('');
    setReport(null);
    setError('');
  };

  // Filter by class_name (more reliable — class_id can be null on Student model)
  const selectedClassName = classFilter ? classes.find(c => String(c.id) === classFilter)?.name : '';
  const filteredStudents = selectedClassName
    ? students.filter(s => s.class_name === selectedClassName)
    : students;

  const fetchReport = async (studentId: string, year: string) => {
    if (!studentId) { setReport(null); return; }
    setLoading(true); setError(''); setReport(null);
    const params = year ? `?academic_year=${year}` : '';
    const res  = await apiFetch(`/api/fees/yearly-report/${studentId}${params}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.detail || 'Failed to load report'); return; }
    setReport(data);
  };

  const handleStudentChange = (id: string) => {
    setSelectedStudent(id);
    fetchReport(id, academicYear);
  };

  const handleYearChange = (year: string) => {
    setAcademicYear(year);
    if (selectedStudent) fetchReport(selectedStudent, year);
  };

  const statusBadge = (status: string) => {
    if (status === 'paid')
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Paid</span>;
    if (status === 'unpaid')
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Unpaid</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">No Invoice</span>;
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Yearly Fee Report</h1>
          <p className="text-sm text-gray-500 mt-1">Per-student 12-month fee summary</p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Class Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Class</label>
              <select
                value={classFilter}
                onChange={e => handleClassFilter(e.target.value)}
                className="input-field"
              >
                <option value="">— All Classes —</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Student Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Student *
                {classFilter && (
                  <span className="ml-1 text-purple-600 font-normal">({filteredStudents.length} in class)</span>
                )}
              </label>
              <select
                value={selectedStudent}
                onChange={e => handleStudentChange(e.target.value)}
                className="input-field"
              >
                <option value="">— Select Student —</option>
                {filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.class_name || 'No Class'} ({s.roll_number || 'No Roll'})
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={e => handleYearChange(e.target.value)}
                className="input-field"
                placeholder="2024-25"
              />
            </div>
          </div>

          {/* Active filters badge */}
          {(classFilter || selectedStudent) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {classFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Class: {selectedClassName}
                  <button onClick={() => handleClassFilter('')} className="ml-0.5 hover:text-purple-900">×</button>
                </span>
              )}
              {selectedStudent && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {students.find(s => String(s.id) === selectedStudent)?.name}
                  <button onClick={() => { setSelectedStudent(''); setReport(null); }} className="ml-0.5 hover:text-blue-900">×</button>
                </span>
              )}
            </div>
          )}
        </div>

        {!selectedStudent && (
          <div className="card text-center py-16 text-gray-500">
            <p className="text-5xl mb-3">📋</p>
            {classFilter
              ? <p className="font-medium text-lg">Select a student from <strong>{selectedClassName}</strong></p>
              : <p className="font-medium text-lg">Select a class and student to view yearly report</p>
            }
          </div>
        )}

        {loading && <div className="card text-center py-12 text-gray-400">Loading report...</div>}
        {error && <div className="card bg-red-50 text-red-700 border border-red-200 py-4 text-center">{error}</div>}

        {report && !loading && (
          <>
            {/* Student Info Card */}
            <div className="card mb-5 bg-purple-50 border border-purple-100">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-purple-500 font-medium uppercase">Student</p>
                  <p className="font-bold text-gray-900 text-lg">{report.student_name}</p>
                </div>
                <div>
                  <p className="text-xs text-purple-500 font-medium uppercase">Class</p>
                  <p className="font-semibold text-gray-800">{report.class_name}</p>
                </div>
                <div>
                  <p className="text-xs text-purple-500 font-medium uppercase">Roll Number</p>
                  <p className="font-semibold text-gray-800">{report.roll_number}</p>
                </div>
                <div>
                  <p className="text-xs text-purple-500 font-medium uppercase">Academic Year</p>
                  <p className="font-semibold text-gray-800">{report.academic_year || '—'}</p>
                </div>
              </div>
            </div>

            {/* Monthly Table */}
            <div className="card mb-5">
              <h3 className="font-semibold text-gray-800 mb-4">Monthly Fee Details</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Month</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.monthly_details.map((row: any, idx: number) => (
                    <tr key={row.month} className={`hover:bg-gray-50 ${row.status === 'paid' ? 'bg-green-50/30' : row.status === 'unpaid' ? 'bg-red-50/30' : ''}`}>
                      <td className="py-3 pr-4 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-3 pr-4 font-medium">{row.month}</td>
                      <td className="py-3 pr-4">{statusBadge(row.status)}</td>
                      <td className="py-3 font-semibold">
                        {row.status === 'paid' ? (
                          <span className="text-green-700">Rs. {row.amount.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Fee Summary</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Monthly Fees Paid',  value: report.totals.monthly_paid,   color: 'text-green-700' },
                  { label: 'Monthly Fees Due',   value: report.totals.monthly_due,    color: 'text-red-600' },
                  { label: 'Annual Charges',     value: report.totals.annual_paid,    color: 'text-green-700' },
                  { label: 'Admission Fee',      value: report.totals.admission_paid, color: 'text-green-700' },
                  { label: 'Exam Fee',           value: report.totals.exam_paid,      color: 'text-green-700' },
                  { label: 'Transport Fee',      value: report.totals.transport_paid, color: 'text-green-700' },
                  { label: 'Other Charges',      value: report.totals.other_paid,     color: 'text-green-700' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">{row.label}</span>
                    <span className={`font-semibold ${row.value > 0 ? row.color : 'text-gray-400'}`}>
                      {row.value > 0 ? `Rs. ${row.value.toLocaleString()}` : '—'}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 mt-2 border-t-2 border-gray-200">
                  <span className="font-bold text-gray-800">Grand Total Collected</span>
                  <span className="font-bold text-green-700 text-lg">Rs. {report.totals.grand_total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

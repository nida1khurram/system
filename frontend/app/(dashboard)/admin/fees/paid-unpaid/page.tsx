'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAcademicYear } from '@/lib/useAcademicYear';
import Navbar from '@/components/ui/navbar';

const ACADEMIC_MONTHS = ['APRIL','MAY','JUNE','JULY','AUG','SEP','OCT','NOV','DEC','JAN','FEB','MARCH'];

export default function PaidUnpaidPage() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const defaultYear = useAcademicYear();
  const [classes, setClasses]         = useState<any[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter]   = useState('');
  const [yearInput, setYearInput]     = useState('');   // local input, not triggers API on every keystroke

  const [nameSearch, setNameSearch]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [students, setStudents]       = useState<any[]>([]);
  const [summary, setSummary]         = useState<any>(null);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);

  const fetchedRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    setIsSuperAdmin(!!u.is_super_admin);
    apiFetch('/api/classes/').then(r => r.json()).then(d => setClasses(d.classes || []));
    // Fetch data immediately with whatever year is cached (may be empty)
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchData('', '', '');
    }
  }, [router]);

  // Once defaultYear loads from settings, apply it (only if not already overridden)
  useEffect(() => {
    if (defaultYear && yearFilter === '') {
      setYearFilter(defaultYear);
      setYearInput(defaultYear);
      fetchData('', '', defaultYear);
    }
  }, [defaultYear]);

  const fetchData = async (month: string, classId: string, year: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (month)   params.set('month', month);
    if (classId) params.set('class_id', classId);
    if (year)    params.set('academic_year', year);
    const res  = await apiFetch(`/api/fees/paid-unpaid?${params.toString()}`);
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setStudents(data.students || []);
      setSummary(data.summary);
    }
  };

  // Apply year filter only on Enter or Blur (not every keystroke)
  const applyYearFilter = (year: string) => {
    const trimmed = year.trim();
    setYearFilter(trimmed);
    fetchData(monthFilter, classFilter, trimmed);
  };

  const handleMonthFilter = (month: string) => {
    setMonthFilter(month);
    fetchData(month, classFilter, yearFilter);
  };

  const handleClassFilter = (classId: string) => {
    setClassFilter(classId);
    fetchData(monthFilter, classId, yearFilter);
  };

  // Mark invoice as paid directly from this page
  const handleMarkPaid = async (invoiceId: number) => {
    setMarkingPaid(invoiceId);
    const res = await apiFetch(`/api/fees/invoices/${invoiceId}/mark-paid`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_method: 'cash' }),
    });
    setMarkingPaid(null);
    if (res.ok) {
      // Update status locally without full refetch
      setStudents(prev => prev.map(s => ({
        ...s,
        months: s.months.map((m: any) =>
          m.invoice_id === invoiceId
            ? { ...m, status: 'paid' }
            : m
        ),
        total_paid: s.months.reduce((sum: number, m: any) => {
          if (m.invoice_id === invoiceId) return sum + (m.amount || 0);
          return sum + (m.status === 'paid' ? m.amount : 0);
        }, 0),
        outstanding: s.months.reduce((sum: number, m: any) => {
          if (m.invoice_id === invoiceId) return sum;
          return sum + (m.status === 'unpaid' ? m.amount : 0);
        }, 0),
      })));
      // Also refresh summary
      fetchData(monthFilter, classFilter, yearFilter);
    }
  };

  const statusCell = (md: any) => {
    if (md.status === 'paid') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          Paid
        </span>
      );
    }
    if (md.status === 'unpaid') {
      return (
        <div className="flex flex-col items-center gap-1">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Unpaid
          </span>
          {isSuperAdmin && (
            <button
              onClick={() => handleMarkPaid(md.invoice_id)}
              disabled={markingPaid === md.invoice_id}
              className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
            >
              {markingPaid === md.invoice_id ? '...' : 'Mark Paid'}
            </button>
          )}
        </div>
      );
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">—</span>;
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  const visibleMonths = monthFilter ? [monthFilter] : ACADEMIC_MONTHS;

  const filteredStudents = nameSearch.trim()
    ? students.filter(s =>
        s.student_name?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        s.class_name?.toLowerCase().includes(nameSearch.toLowerCase())
      )
    : students;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Paid / Unpaid Status</h1>
          <p className="text-sm text-gray-500 mt-1">Monthly fee payment status per student</p>
        </div>

        {/* Filters */}
        <div className="card mb-5">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Student Name Search */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Search Student / Class</label>
              <input
                type="text"
                value={nameSearch}
                onChange={e => setNameSearch(e.target.value)}
                className="input-field w-56"
                placeholder="Name ya class likhein..."
              />
            </div>
            {/* Academic Year — only fires on Enter or blur */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
              <input
                type="text"
                value={yearInput}
                onChange={e => setYearInput(e.target.value)}
                onBlur={e => applyYearFilter(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyYearFilter(yearInput); }}
                className="input-field w-32"
                placeholder="2024-25"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Class</label>
              <select
                value={classFilter}
                onChange={e => handleClassFilter(e.target.value)}
                className="input-field w-48"
              >
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Month tabs */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            <button
              onClick={() => handleMonthFilter('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${monthFilter === '' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All Months
            </button>
            {ACADEMIC_MONTHS.map(m => (
              <button
                key={m}
                onClick={() => handleMonthFilter(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${monthFilter === m ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="card text-center">
              <div className="text-2xl font-bold text-gray-800">{summary.total_students}</div>
              <div className="text-gray-500 text-sm">Total Students</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-600">{summary.total_paid_count}</div>
              <div className="text-gray-500 text-sm">Paid Entries</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-red-500">{summary.total_unpaid_count}</div>
              <div className="text-gray-500 text-sm">Unpaid Entries</div>
            </div>
            <div className="card text-center">
              <div className="text-lg font-bold text-red-600">Rs. {(summary.total_outstanding || 0).toLocaleString()}</div>
              <div className="text-gray-500 text-sm">Outstanding</div>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="card text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                  <th className="pb-3 pr-4">Student</th>
                  <th className="pb-3 pr-4">Class</th>
                  {visibleMonths.map(m => (
                    <th key={m} className="pb-3 pr-2 text-center">{m}</th>
                  ))}
                  <th className="pb-3 pr-4 text-right">Total Paid</th>
                  <th className="pb-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4 + visibleMonths.length} className="py-12 text-center text-gray-500">
                      <p className="text-4xl mb-2">📋</p>
                      <p>{nameSearch ? `"${nameSearch}" ke liye koi student nahi mila` : `No students found for ${yearFilter || 'this year'}`}</p>
                      <p className="text-xs mt-1 text-gray-400">{nameSearch ? 'Naam ya class check karein' : 'Collect fees first to see status here'}</p>
                    </td>
                  </tr>
                ) : filteredStudents.map(s => (
                  <tr key={s.student_id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium">
                      <div>{s.student_name}</div>
                      <div className="text-xs text-gray-400">{s.roll_number}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{s.class_name}</td>
                    {s.months.map((md: any) => (
                      <td key={md.month} className="py-3 pr-2 text-center">
                        {statusCell(md)}
                      </td>
                    ))}
                    <td className="py-3 pr-4 text-right font-semibold text-green-700">
                      {s.total_paid > 0 ? `Rs. ${s.total_paid.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 text-right font-semibold text-red-600">
                      {s.outstanding > 0 ? `Rs. ${s.outstanding.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAcademicYear } from '@/lib/useAcademicYear';
import Navbar from '@/components/ui/navbar';

const FEE_TYPES = [
  { value: 'monthly',   label: 'Monthly Fee' },
  { value: 'admission', label: 'Admission Fee' },
  { value: 'annual',    label: 'Annual Fee' },
  { value: 'exam',      label: 'Exam Fee' },
  { value: 'transport', label: 'Transport Fee' },
  { value: 'other',     label: 'Other Charges' },
];

const ACADEMIC_MONTHS = ['APRIL','MAY','JUNE','JULY','AUG','SEP','OCT','NOV','DEC','JAN','FEB','MARCH'];

function extractError(detail: any, fallback = 'Failed'): string {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e: any) => {
    const field = Array.isArray(e.loc) ? e.loc.slice(1).join('.') : '';
    return field ? `${field}: ${e.msg}` : (e.msg || JSON.stringify(e));
  }).join('; ');
  return fallback;
}

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'jazzcash',      label: 'JazzCash' },
  { value: 'easypaisa',     label: 'Easypaisa' },
];

export default function CollectFeePage() {
  const router       = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Academic year: from settings (cached), user can override
  const academicYear              = useAcademicYear();
  const [yearOverride, setYearOverride] = useState('');
  const effectiveYear             = yearOverride || academicYear;

  const [students, setStudents]               = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentClass, setStudentClass]       = useState('');

  const [feeType, setFeeType]         = useState('monthly');
  const [month, setMonth]             = useState('');
  const [amount, setAmount]           = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [resolvingFee, setResolvingFee] = useState(false);
  const [feeSource, setFeeSource]       = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [receipt, setReceipt]           = useState<{ invoice_number: string; receipt_number: string; student_name: string } | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [paidMonths, setPaidMonths]     = useState<string[]>([]);
  const [deletingId, setDeletingId]     = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    setIsSuperAdmin(!!u.is_super_admin);
    apiFetch('/api/students/').then(r => r.json()).then(d => setStudents(d.students || []));
  }, [router]);

  const loadStudentInvoices = (id: string) => {
    apiFetch(`/api/fees/invoices?student_id=${id}`)
      .then(r => r.json())
      .then(d => {
        const invoices = d.invoices || [];
        setRecentInvoices(invoices.slice(0, 5));
        // Track months that already have a paid invoice
        const paid = invoices
          .filter((inv: any) => inv.fee_type === 'monthly' && inv.is_paid && inv.month)
          .map((inv: any) => inv.month as string);
        setPaidMonths(paid);
      });
  };

  const handleStudentSelect = async (id: string) => {
    setSelectedStudent(id);
    setFeeType('monthly');
    setMonth('');
    setAmount('');
    setFeeSource(null);
    setReceipt(null);
    if (!id) { setStudentClass(''); setRecentInvoices([]); setPaidMonths([]); return; }
    const s = students.find(s => s.id === parseInt(id));
    setStudentClass(s?.class_name || '');
    loadStudentInvoices(id);
    // Auto-resolve monthly fee when student is selected
    setResolvingFee(true);
    const r = await apiFetch(`/api/fees/resolve?student_id=${id}&fee_type=monthly`);
    const d = await r.json();
    setResolvingFee(false);
    if (d.success && d.amount !== null) {
      setAmount(String(d.amount));
      setFeeSource(d.source);
    } else {
      setFeeSource('none');
    }
  };

  const handleFeeTypeSelect = async (ft: string) => {
    setFeeType(ft);
    setAmount('');
    setFeeSource(null);
    if (!ft || !selectedStudent) return;
    setResolvingFee(true);
    const r = await apiFetch(`/api/fees/resolve?student_id=${selectedStudent}&fee_type=${ft}`);
    const d = await r.json();
    setResolvingFee(false);
    if (d.success && d.amount !== null) {
      setAmount(String(d.amount));
      setFeeSource(d.source);
    } else {
      setFeeSource('none');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) { setError('Select a student'); return; }
    setSaving(true); setError(''); setReceipt(null);
    const res = await apiFetch('/api/fees/collect', {
      method: 'POST',
      body: JSON.stringify({
        student_id:    parseInt(selectedStudent),
        fee_type:      feeType,
        amount:        parseFloat(amount),
        month:         feeType === 'monthly' ? month || null : null,
        academic_year: effectiveYear || null,
        payment_method: paymentMethod,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(extractError(data.detail, 'Failed to collect fee')); return; }
    setReceipt(data);
    loadStudentInvoices(selectedStudent);
    // reset form fields but keep year, student, payment method
    setAmount('');
    setMonth('');
    setFeeType('monthly');
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    setDeletingId(invoiceId);
    setError('');
    const res = await apiFetch(`/api/fees/invoices/${invoiceId}`, { method: 'DELETE' });
    setDeletingId(null);
    if (res.ok) {
      loadStudentInvoices(selectedStudent);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(extractError(data.detail, 'Failed to delete invoice'));
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Collect Fee</h1>
          <p className="text-sm text-gray-500 mt-1">Create an invoice and mark it paid in one step</p>
        </div>

        {/* Success Receipt */}
        {receipt && (
          <div className="card mb-6 bg-green-50 border border-green-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-800">Fee Collected Successfully!</p>
                <p className="text-sm text-green-700 mt-1">Student: <strong>{receipt.student_name}</strong></p>
                <p className="text-sm text-green-700">Invoice: <span className="font-mono">{receipt.invoice_number}</span></p>
                <p className="text-sm text-green-700">Receipt: <span className="font-mono font-semibold">{receipt.receipt_number}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Collect Fee Form */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Fee Details</h2>
          {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Student */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Student *</label>
              <select value={selectedStudent} onChange={e => handleStudentSelect(e.target.value)} className="input-field" required>
                <option value="">— Select Student —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.class_name || 'No Class'} ({s.roll_number || 'No Roll'})</option>
                ))}
              </select>
            </div>

            {/* Class info */}
            {studentClass && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-sm text-purple-700">
                Class: <strong>{studentClass}</strong>
              </div>
            )}

            {/* Fee Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fee Type *</label>
              <select value={feeType} onChange={e => handleFeeTypeSelect(e.target.value)} className="input-field" required disabled={!selectedStudent}>
                {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
              </select>
            </div>

            {/* Month (only for monthly) */}
            {feeType === 'monthly' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Month
                  {paidMonths.length > 0 && (
                    <span className="ml-1 text-xs font-normal text-green-600">
                      ({paidMonths.length} month{paidMonths.length > 1 ? 's' : ''} already paid)
                    </span>
                  )}
                </label>
                <select value={month} onChange={e => setMonth(e.target.value)} className="input-field">
                  <option value="">— Select Month —</option>
                  {ACADEMIC_MONTHS.filter(m => !paidMonths.includes(m)).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {ACADEMIC_MONTHS.filter(m => !paidMonths.includes(m)).length === 0 && (
                  <p className="mt-1 text-xs text-green-600 font-medium">All months are paid for this student!</p>
                )}
              </div>
            )}

            {/* Fee source badge */}
            {resolvingFee && <div className="text-xs text-gray-400 px-3 py-2 bg-gray-50 rounded-lg">Fetching fee amount...</div>}
            {!resolvingFee && feeSource && (
              <div className={`text-xs px-3 py-2 rounded-lg border ${
                feeSource === 'student_override' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                feeSource === 'class_default'    ? 'bg-green-50 text-green-700 border-green-100' :
                feeSource === 'school_default'   ? 'bg-purple-50 text-purple-700 border-purple-100' :
                'bg-orange-50 text-orange-700 border-orange-100'
              }`}>
                {feeSource === 'student_override' && '👤 Student custom fee applied'}
                {feeSource === 'class_default'    && '🏫 Class default fee applied'}
                {feeSource === 'school_default'   && '🏫 School default fee applied'}
                {feeSource === 'none'             && '⚠️ No fee structure found — enter amount manually'}
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                className="input-field" required placeholder="Auto-filled from fee structure" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Payment Method */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-field">
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {/* Academic Year — shows settings year, user can change */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Academic Year
                  {academicYear && !yearOverride && (
                    <span className="ml-1 text-green-600 font-normal">(from settings)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={effectiveYear}
                  onChange={e => setYearOverride(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 2024-25"
                />
              </div>
            </div>

            <button type="submit" disabled={saving || !selectedStudent} className="btn-primary w-full">
              {saving ? 'Collecting...' : 'Collect Fee'}
            </button>
          </form>
        </div>

        {/* Recent invoices for selected student */}
        {recentInvoices.length > 0 && (
          <div className="card">
            {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-3 text-sm">{error}</div>}
            <h3 className="font-semibold text-gray-800 mb-3">Recent Invoices</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                  <th className="pb-2 pr-4">Invoice #</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Month</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Status</th>
                  {isSuperAdmin && <th className="pb-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-500">{inv.invoice_number}</td>
                    <td className="py-2 pr-4 text-gray-600">{inv.fee_type_label}</td>
                    <td className="py-2 pr-4 text-gray-600">{inv.month || '—'}</td>
                    <td className="py-2 pr-4 font-semibold">Rs. {parseFloat(inv.total_amount || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.is_paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {inv.is_paid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          disabled={deletingId === inv.id}
                          className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                        >
                          {deletingId === inv.id ? '...' : 'Delete'}
                        </button>
                      </td>
                    )}
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

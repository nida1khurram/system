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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ACADEMIC_MONTHS = ['APRIL','MAY','JUNE','JULY','AUG','SEP','OCT','NOV','DEC','JAN','FEB','MARCH'];

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'jazzcash',      label: 'JazzCash' },
  { value: 'easypaisa',     label: 'Easypaisa' },
];

// Normalize FastAPI error detail (may be string or Pydantic v2 array of objects)
function extractError(detail: any, fallback = 'Failed'): string {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e: any) => {
    const field = Array.isArray(e.loc) ? e.loc.slice(1).join('.') : '';
    return field ? `${field}: ${e.msg}` : (e.msg || JSON.stringify(e));
  }).join('; ');
  return fallback;
}

export default function AdminFees() {
  const router = useRouter();
  const [user, setUser]                 = useState<any>(null);
  const defaultYear                     = useAcademicYear();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tab, setTab]                   = useState<'invoices' | 'structures' | 'student_fees'>('invoices');

  // ── Shared data ──────────────────────────────────────────────
  const [classes, setClasses]   = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // ── Fee Structures tab ───────────────────────────────────────
  const [selectedClass, setSelectedClass]           = useState('');
  const [defaultStructures, setDefaultStructures]   = useState<any[]>([]);
  const [classStructures, setClassStructures]       = useState<any[]>([]);

  // School-wide default modal
  const [showDefaultModal, setShowDefaultModal]   = useState(false);
  const [defaultForm, setDefaultForm]             = useState({ fee_type: 'monthly', amount: '', due_date: '10', late_fee_per_day: '0', academic_year: '' });
  const [savingDefault, setSavingDefault]         = useState(false);
  const [defaultError, setDefaultError]           = useState('');

  // Class fee override modal
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [structureClass, setStructureClass]         = useState('');
  const [structureForm, setStructureForm]           = useState({ fee_type: 'monthly', amount: '', due_date: '10', late_fee_per_day: '0', academic_year: '' });
  const [savingStructure, setSavingStructure]       = useState(false);
  const [structureError, setStructureError]         = useState('');

  // ── Student Discounts tab ────────────────────────────────────
  const [allOverrides, setAllOverrides]         = useState<any[]>([]);
  const [overrideFilter, setOverrideFilter]     = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm]         = useState({ student_id: '', fee_type: 'monthly', amount: '', academic_year: '', reason: '' });
  const [savingOverride, setSavingOverride]     = useState(false);
  const [overrideError, setOverrideError]       = useState('');

  // ── Invoices tab ─────────────────────────────────────────────
  const [invoices, setInvoices]           = useState<any[]>([]);
  const [filterStatus, setFilterStatus]   = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceError, setInvoiceError]   = useState('');
  const [collectReceipt, setCollectReceipt] = useState<{ invoice_number: string; receipt_number: string; student_name: string } | null>(null);
  const [invoiceForm, setInvoiceForm]     = useState({
    student_id: '', fee_type: '', amount: '',
    month: '', academic_year: '', payment_method: 'cash',
  });
  const [invoiceStudentClass, setInvoiceStudentClass] = useState<any>(null);
  const [paidMonths, setPaidMonths]       = useState<string[]>([]);
  const [feeSource, setFeeSource]         = useState<'student_override' | 'class_default' | 'school_default' | 'none' | null>(null);
  const [resolvingFee, setResolvingFee]   = useState(false);
  const [markingPaid, setMarkingPaid]     = useState<number | null>(null);

  // ── Pending JazzCash verifications ───────────────────────────
  const [pendingVerifs, setPendingVerifs]     = useState<any[]>([]);
  const [verifyingId, setVerifyingId]         = useState<number | null>(null);

  // ── Loaders ──────────────────────────────────────────────────
  const loadStructures = () => {
    apiFetch('/api/fees/structures').then(r => r.json()).then(d => {
      const all = d.fee_structures || [];
      setDefaultStructures(all.filter((s: any) => s.class_id === null));
      setClassStructures(all.filter((s: any) => s.class_id !== null));
    });
  };

  const loadInvoices = () =>
    apiFetch('/api/fees/invoices').then(r => r.json()).then(d => setInvoices(d.invoices || []));

  const loadAllOverrides = () =>
    apiFetch('/api/fees/student-overrides').then(r => r.json()).then(d => setAllOverrides(d.overrides || []));

  const loadPendingVerifs = () =>
    apiFetch('/api/payments/pending-verifications').then(r => r.json()).then(d => setPendingVerifs(d.verifications || [])).catch(() => {});

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    setIsSuperAdmin(!!u.is_super_admin);
    loadInvoices();
    loadPendingVerifs();
    apiFetch('/api/classes/').then(r => r.json()).then(d => setClasses(d.classes || []));
    apiFetch('/api/students/').then(r => r.json()).then(d => setStudents(d.students || []));
  }, [router]);

  useEffect(() => {
    if (tab === 'structures') loadStructures();
    if (tab === 'student_fees') { loadAllOverrides(); loadStructures(); }
  }, [tab]);

  // Apply default academic year from settings to all forms
  useEffect(() => {
    if (!defaultYear) return;
    setDefaultForm(f   => ({ ...f, academic_year: f.academic_year || defaultYear }));
    setStructureForm(f => ({ ...f, academic_year: f.academic_year || defaultYear }));
    setOverrideForm(f  => ({ ...f, academic_year: f.academic_year || defaultYear }));
    setInvoiceForm(f   => ({ ...f, academic_year: f.academic_year || defaultYear }));
  }, [defaultYear]);

  // ── Invoice: student selected ──────────────────────────────
  const handleInvoiceStudentSelect = async (studentId: string) => {
    setInvoiceForm(f => ({ ...f, student_id: studentId, fee_type: 'monthly', amount: '', month: '' }));
    setInvoiceStudentClass(null);
    setFeeSource(null);
    setPaidMonths([]);
    setCollectReceipt(null);
    if (!studentId) return;
    const s = students.find(s => s.id === parseInt(studentId));
    if (s) setInvoiceStudentClass({ name: s.class_name, id: s.class_id });
    // Load paid months
    const r = await apiFetch(`/api/fees/invoices?student_id=${studentId}`);
    const d = await r.json();
    const paid = (d.invoices || [])
      .filter((inv: any) => inv.fee_type === 'monthly' && inv.is_paid && inv.month)
      .map((inv: any) => inv.month.toUpperCase());
    setPaidMonths(paid);
    // Auto-resolve monthly fee
    setResolvingFee(true);
    const fr = await apiFetch(`/api/fees/resolve?student_id=${studentId}&fee_type=monthly`);
    const fd = await fr.json();
    setResolvingFee(false);
    if (fd.success && fd.amount !== null) {
      setInvoiceForm(f => ({ ...f, amount: String(fd.amount) }));
      setFeeSource(fd.source);
    } else {
      setFeeSource('none');
    }
  };

  // ── Invoice: fee type selected → auto-resolve amount ──────
  const handleInvoiceFeeTypeSelect = async (feeType: string) => {
    setInvoiceForm(f => ({ ...f, fee_type: feeType, amount: '', month: '' }));
    setFeeSource(null);
    if (!feeType || !invoiceForm.student_id) return;
    setResolvingFee(true);
    const r = await apiFetch(`/api/fees/resolve?student_id=${invoiceForm.student_id}&fee_type=${feeType}`);
    const d = await r.json();
    setResolvingFee(false);
    if (d.success && d.amount !== null) {
      setInvoiceForm(f => ({ ...f, amount: String(d.amount) }));
      setFeeSource(d.source);
    } else {
      setFeeSource('none');
    }
  };

  // ── Verify manual JazzCash payment ───────────────────────────
  const handleVerify = async (paymentId: number, approved: boolean) => {
    setVerifyingId(paymentId);
    try {
      const res  = await apiFetch(`/api/payments/verify/${paymentId}`, {
        method: 'POST',
        body: JSON.stringify({ approved }),
      });
      if (res.ok) {
        loadPendingVerifs();
        loadInvoices();
      }
    } catch { /* ignore */ } finally { setVerifyingId(null); }
  };

  // ── Mark invoice paid ──────────────────────────────────────
  const handleMarkPaid = async (invoiceId: number) => {
    setMarkingPaid(invoiceId);
    const res = await apiFetch(`/api/fees/invoices/${invoiceId}/mark-paid`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_method: 'cash' }),
    });
    setMarkingPaid(null);
    if (res.ok) loadInvoices();
    else {
      const d = await res.json();
      alert(d.detail || 'Failed to mark paid');
    }
  };

  // ── Save school-wide default fee ───────────────────────────
  const handleSaveDefault = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDefault(true); setDefaultError('');
    const res = await apiFetch('/api/fees/school-default', {
      method: 'POST',
      body: JSON.stringify({
        fee_type: defaultForm.fee_type,
        amount: parseFloat(defaultForm.amount),
        due_date: parseInt(defaultForm.due_date) || 10,
        late_fee_per_day: parseFloat(defaultForm.late_fee_per_day || '0'),
        academic_year: defaultForm.academic_year,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setDefaultError(extractError(data.detail)); setSavingDefault(false); return; }
    setShowDefaultModal(false);
    setDefaultForm({ fee_type: 'monthly', amount: '', due_date: '10', late_fee_per_day: '0', academic_year: defaultYear || '' });
    loadStructures();
    setSavingDefault(false);
  };

  // ── Save class fee structure ───────────────────────────────
  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureClass) { setStructureError('Please select a class first'); return; }
    setSavingStructure(true); setStructureError('');
    const res = await apiFetch('/api/fees/structures', {
      method: 'POST',
      body: JSON.stringify({
        class_id: parseInt(structureClass),
        fee_type: structureForm.fee_type,
        amount: parseFloat(structureForm.amount),
        due_date: parseInt(structureForm.due_date),
        late_fee_per_day: parseFloat(structureForm.late_fee_per_day || '0'),
        academic_year: structureForm.academic_year,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setStructureError(extractError(data.detail)); setSavingStructure(false); return; }
    setShowStructureModal(false);
    setStructureClass('');
    setStructureForm({ fee_type: 'monthly', amount: '', due_date: '10', late_fee_per_day: '0', academic_year: defaultYear || '' });
    loadStructures();
    setSavingStructure(false);
  };

  const handleDeleteStructure = async (id: number) => {
    if (!confirm('Remove this fee structure?')) return;
    await apiFetch(`/api/fees/structures/${id}`, { method: 'DELETE' });
    loadStructures();
  };

  // ── Save student discount ──────────────────────────────────
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.student_id) { setOverrideError('Please select a student'); return; }
    setSavingOverride(true); setOverrideError('');
    const res = await apiFetch('/api/fees/student-overrides', {
      method: 'POST',
      body: JSON.stringify({
        student_id: parseInt(overrideForm.student_id),
        fee_type: overrideForm.fee_type,
        amount: parseFloat(overrideForm.amount),
        academic_year: overrideForm.academic_year,
        reason: overrideForm.reason || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setOverrideError(extractError(data.detail)); setSavingOverride(false); return; }
    setShowOverrideModal(false);
    setOverrideForm({ student_id: '', fee_type: 'monthly', amount: '', academic_year: defaultYear || '', reason: '' });
    loadAllOverrides();
    setSavingOverride(false);
  };

  const handleDeleteOverride = async (id: number) => {
    if (!confirm('Remove this student discount?')) return;
    await apiFetch(`/api/fees/student-overrides/${id}`, { method: 'DELETE' });
    loadAllOverrides();
  };

  // ── Collect fee (invoice + paid in one step) ──────────────
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInvoice(true); setInvoiceError(''); setCollectReceipt(null);
    const res = await apiFetch('/api/fees/collect', {
      method: 'POST',
      body: JSON.stringify({
        student_id:     parseInt(invoiceForm.student_id),
        fee_type:       invoiceForm.fee_type,
        amount:         parseFloat(invoiceForm.amount),
        month:          invoiceForm.fee_type === 'monthly' ? (invoiceForm.month || null) : null,
        academic_year:  invoiceForm.academic_year || null,
        payment_method: invoiceForm.payment_method,
      }),
    });
    const data = await res.json();
    setSavingInvoice(false);
    if (!res.ok) { setInvoiceError(extractError(data.detail)); return; }
    setCollectReceipt(data);
    setInvoiceForm(f => ({ ...f, fee_type: 'monthly', amount: '', month: '' }));
    setFeeSource(null);
    loadInvoices();
    // Refresh paid months
    const pr = await apiFetch(`/api/fees/invoices?student_id=${invoiceForm.student_id}`);
    const pd = await pr.json();
    const paid = (pd.invoices || [])
      .filter((inv: any) => inv.fee_type === 'monthly' && inv.is_paid && inv.month)
      .map((inv: any) => inv.month.toUpperCase());
    setPaidMonths(paid);
  };

  // ── Helper: resolve default fee for an override row ────────
  const getDefaultFeeForOverride = (o: any) => {
    const student = students.find(s => s.id === o.student_id);
    if (!student) return null;
    const ft = o.fee_type;
    const classFee = classStructures.find(s => s.class_id === student.class_id && s.fee_type === ft);
    if (classFee) return { amount: classFee.amount, source: 'class' };
    const schoolFee = defaultStructures.find(s => s.fee_type === ft);
    if (schoolFee) return { amount: schoolFee.amount, source: 'school' };
    return null;
  };

  const filteredClassStructures = classStructures.filter(s =>
    !selectedClass || s.class_id === parseInt(selectedClass)
  );
  const filteredOverrides = allOverrides.filter(o =>
    !overrideFilter || o.student_id === parseInt(overrideFilter)
  );
  const filteredInvoices = invoices.filter(i =>
    filterStatus === 'all' ? true : filterStatus === 'paid' ? i.is_paid : !i.is_paid
  );
  const totalCollected = invoices.filter(i => i.is_paid).reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
            {isSuperAdmin
              ? <p className="text-xs text-purple-600 mt-0.5">👑 Super Admin — Full access</p>
              : <p className="text-xs text-orange-500 mt-0.5">🔒 Admin — View only mode</p>
            }
          </div>
          {tab === 'invoices' && isSuperAdmin && (
            <button onClick={() => { setShowInvoiceModal(true); setInvoiceError(''); }} className="btn-primary">
              + Collect Fee
            </button>
          )}
          {tab === 'student_fees' && isSuperAdmin && (
            <button onClick={() => { setShowOverrideModal(true); setOverrideError(''); }} className="btn-primary">
              + Add Discount
            </button>
          )}
        </div>

        {/* Pending JazzCash Verifications */}
        {pendingVerifs.length > 0 && (
          <div className="mb-6 card p-0 overflow-hidden border-l-4 border-orange-400">
            <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border-b border-orange-100">
              <span className="text-lg">💸</span>
              <h2 className="font-semibold text-orange-800">Pending JazzCash Verifications</h2>
              <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingVerifs.length}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingVerifs.map(v => (
                <div key={v.payment_id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{v.student_name}</span>
                      <span className="text-xs text-gray-400">{v.month}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500">Txn: <span className="font-mono text-gray-700">{v.transaction_id}</span></span>
                      <span className="text-xs text-gray-400">{v.submitted_at}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">Rs. {v.amount.toLocaleString()}</span>
                    <button
                      onClick={() => handleVerify(v.payment_id, true)}
                      disabled={verifyingId === v.payment_id}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {verifyingId === v.payment_id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleVerify(v.payment_id, false)}
                      disabled={verifyingId === v.payment_id}
                      className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-medium rounded-lg hover:bg-red-200 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border rounded-xl p-1 w-fit">
          {(['invoices', 'structures', 'student_fees'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t === 'invoices' ? 'Invoices' : t === 'structures' ? 'Fee Structures' : 'Student Discounts'}
            </button>
          ))}
        </div>

        {/* ── FEE STRUCTURES TAB ── */}
        {tab === 'structures' && (
          <div className="space-y-8">

            {/* Section A: School-wide Default Fees */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Default Fees — All Students</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Applied to every student unless overridden by a class or student-specific fee</p>
                </div>
                {isSuperAdmin && (
                  <button onClick={() => { setShowDefaultModal(true); setDefaultError(''); }} className="btn-primary">
                    + Set Default
                  </button>
                )}
              </div>

              {defaultStructures.length === 0 ? (
                <div className="card text-center py-10 border-2 border-dashed border-gray-200 text-gray-400">
                  <p className="text-3xl mb-2">🏫</p>
                  <p className="font-medium">No school-wide defaults set</p>
                  {isSuperAdmin && <p className="text-sm mt-1">Click "+ Set Default" to add one — it will apply to all students automatically</p>}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {defaultStructures.map(s => (
                    <div key={s.id} className="card border border-purple-100 bg-purple-50/30">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {s.fee_type_label}
                        </span>
                        {isSuperAdmin && (
                          <button onClick={() => handleDeleteStructure(s.id)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-gray-800">Rs. {parseFloat(s.amount).toLocaleString()}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.academic_year}</p>
                      <div className="mt-3">
                        <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                          Applies to all students
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section B: Class-specific Fee Overrides */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Class-specific Fee Overrides</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Override the school default for a specific class</p>
                </div>
                {isSuperAdmin && (
                  <button onClick={() => { setShowStructureModal(true); setStructureError(''); setStructureClass(''); }} className="btn-primary">
                    + Add Class Fee
                  </button>
                )}
              </div>

              <div className="card mb-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-medium text-gray-700">Filter by Class:</label>
                  <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                    className="input-field w-auto min-w-[200px]">
                    <option value="">— All Classes —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <span className="text-xs text-gray-400">{filteredClassStructures.length} structure(s)</span>
                </div>
              </div>

              {filteredClassStructures.length === 0 ? (
                <div className="card text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="text-sm">No class-specific fee overrides set</p>
                  {isSuperAdmin && <p className="text-xs mt-1">Use "+ Add Class Fee" to override the school default for a class</p>}
                </div>
              ) : (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                        <th className="pb-3 pr-4">Class</th>
                        <th className="pb-3 pr-4">Fee Type</th>
                        <th className="pb-3 pr-4">Amount</th>
                        <th className="pb-3 pr-4">Due Day</th>
                        <th className="pb-3 pr-4">Late Fee/Day</th>
                        <th className="pb-3 pr-4">Year</th>
                        {isSuperAdmin && <th className="pb-3">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredClassStructures.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 font-medium">{s.class_name}</td>
                          <td className="py-3 pr-4">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              {s.fee_type_label}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-semibold text-green-700">Rs. {parseFloat(s.amount).toLocaleString()}</td>
                          <td className="py-3 pr-4 text-gray-500">{s.due_date}th</td>
                          <td className="py-3 pr-4 text-gray-500">Rs. {s.late_fee_per_day}</td>
                          <td className="py-3 pr-4 text-gray-500">{s.academic_year}</td>
                          {isSuperAdmin && (
                            <td className="py-3">
                              <button onClick={() => handleDeleteStructure(s.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STUDENT DISCOUNTS TAB ── */}
        {tab === 'student_fees' && (
          <>
            <div className="card mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="text-sm font-medium text-gray-700">Filter by Student:</label>
                <select value={overrideFilter} onChange={e => setOverrideFilter(e.target.value)}
                  className="input-field w-auto min-w-[260px]">
                  <option value="">— All Students —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.class_name || 'No Class'}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-400">{filteredOverrides.length} discount(s)</span>
              </div>
            </div>

            {filteredOverrides.length === 0 ? (
              <div className="card text-center py-16 text-gray-500">
                <p className="text-5xl mb-3">🎓</p>
                <p className="font-medium text-lg">No student discounts set</p>
                <p className="text-sm mt-1">Student-specific fees override class and school defaults</p>
                {isSuperAdmin && (
                  <button
                    onClick={() => { setShowOverrideModal(true); setOverrideError(''); }}
                    className="btn-primary mt-4 inline-block">
                    + Add Discount
                  </button>
                )}
              </div>
            ) : (
              <div className="card overflow-x-auto">
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-800">Student Discounts</h3>
                  <p className="text-xs text-blue-600 mt-0.5">Custom fees that override class/school defaults for individual students</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                      <th className="pb-3 pr-4">Student</th>
                      <th className="pb-3 pr-4">Fee Type</th>
                      <th className="pb-3 pr-4">Default Fee</th>
                      <th className="pb-3 pr-4">Custom Fee</th>
                      <th className="pb-3 pr-4">Saving</th>
                      <th className="pb-3 pr-4">Year</th>
                      <th className="pb-3 pr-4">Reason</th>
                      {isSuperAdmin && <th className="pb-3">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOverrides.map(o => {
                      const def = getDefaultFeeForOverride(o);
                      const saving = def ? parseFloat(def.amount) - parseFloat(o.amount) : null;
                      const studentInfo = students.find(s => s.id === o.student_id);
                      return (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4">
                            <div className="font-medium">{o.student_name}</div>
                            <div className="text-xs text-gray-400">{studentInfo?.class_name || '—'}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {o.fee_type_label}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-500">
                            {def ? (
                              <span>
                                Rs. {parseFloat(def.amount).toLocaleString()}
                                <span className="ml-1 text-xs text-gray-400">({def.source})</span>
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-green-700">Rs. {parseFloat(o.amount).toLocaleString()}</td>
                          <td className="py-3 pr-4">
                            {saving !== null ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                saving > 0 ? 'bg-green-100 text-green-700' :
                                saving < 0 ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {saving > 0 ? `-Rs. ${saving.toLocaleString()}` :
                                 saving < 0 ? `+Rs. ${Math.abs(saving).toLocaleString()}` : 'Same'}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-3 pr-4 text-gray-500">{o.academic_year}</td>
                          <td className="py-3 pr-4 text-gray-400 text-xs">{o.reason || '—'}</td>
                          {isSuperAdmin && (
                            <td className="py-3">
                              <button onClick={() => handleDeleteOverride(o.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── INVOICES TAB ── */}
        {tab === 'invoices' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div className="card text-center"><div className="text-2xl font-bold text-gray-800">{invoices.length}</div><div className="text-gray-500 text-sm">Total</div></div>
              <div className="card text-center"><div className="text-2xl font-bold text-green-600">{invoices.filter(i => i.is_paid).length}</div><div className="text-gray-500 text-sm">Paid</div></div>
              <div className="card text-center"><div className="text-2xl font-bold text-orange-500">{invoices.filter(i => !i.is_paid).length}</div><div className="text-gray-500 text-sm">Pending</div></div>
              <div className="card text-center"><div className="text-lg font-bold text-green-600">Rs.{totalCollected.toLocaleString()}</div><div className="text-gray-500 text-sm">Collected</div></div>
            </div>

            <div className="flex gap-2 mb-4">
              {['all','pending','paid'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${filterStatus === s ? 'bg-purple-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
                  {s}
                </button>
              ))}
            </div>

            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                    <th className="pb-3 pr-4">Invoice #</th>
                    <th className="pb-3 pr-4">Student</th>
                    <th className="pb-3 pr-4">Class</th>
                    <th className="pb-3 pr-4">Fee Type</th>
                    <th className="pb-3 pr-4">Month</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Due Date</th>
                    <th className="pb-3 pr-4">Status</th>
                    {isSuperAdmin && <th className="pb-3">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.length === 0 ? (
                    <tr><td colSpan={isSuperAdmin ? 9 : 8} className="py-12 text-center text-gray-500">No invoices found</td></tr>
                  ) : filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-mono text-xs text-gray-500">{inv.invoice_number}</td>
                      <td className="py-3 pr-4 font-medium">{inv.student_name}</td>
                      <td className="py-3 pr-4 text-gray-600">{inv.class_name}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{inv.fee_type_label}</span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{inv.month || '—'}</td>
                      <td className="py-3 pr-4 font-semibold">Rs. {parseFloat(inv.total_amount || 0).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{inv.due_date}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.is_paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {inv.is_paid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3">
                          {!inv.is_paid && (
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              disabled={markingPaid === inv.id}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {markingPaid === inv.id ? '...' : 'Mark Paid'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* ── SET DEFAULT FEE MODAL ── */}
      {showDefaultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold">Set Default Fee</h2>
                  <p className="text-sm text-green-600 mt-0.5">Applies to all students school-wide</p>
                </div>
                <button onClick={() => { setShowDefaultModal(false); setDefaultError(''); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              {defaultError && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{defaultError}</div>}
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4 text-xs text-green-700">
                This fee applies to ALL students. Class or student-specific fees will take priority over this.
              </div>
              <form onSubmit={handleSaveDefault} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fee Type *</label>
                  <select value={defaultForm.fee_type} onChange={e => setDefaultForm(f => ({...f, fee_type: e.target.value}))} className="input-field" required>
                    {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
                  <input type="number" min="0" value={defaultForm.amount} onChange={e => setDefaultForm(f => ({...f, amount: e.target.value}))} className="input-field" required placeholder="e.g. 2500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Due Day of Month</label>
                    <input type="number" min="1" max="31" value={defaultForm.due_date} onChange={e => setDefaultForm(f => ({...f, due_date: e.target.value}))} className="input-field" placeholder="10" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Late Fee / Day (Rs.)</label>
                    <input type="number" min="0" value={defaultForm.late_fee_per_day} onChange={e => setDefaultForm(f => ({...f, late_fee_per_day: e.target.value}))} className="input-field" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
                  <input type="text" value={defaultForm.academic_year} onChange={e => setDefaultForm(f => ({...f, academic_year: e.target.value}))} className="input-field" placeholder="2024-25" />
                </div>
                <p className="text-xs text-gray-400">If a default already exists for this fee type, it will be updated.</p>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowDefaultModal(false); setDefaultError(''); }} className="flex-1 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={savingDefault} className="flex-1 btn-primary">{savingDefault ? 'Saving...' : 'Save Default'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CLASS FEE OVERRIDE MODAL ── */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold">Add Class Fee Override</h2>
                  <p className="text-sm text-purple-600 mt-0.5">Override school default for a specific class</p>
                </div>
                <button onClick={() => { setShowStructureModal(false); setStructureError(''); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              {structureError && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{structureError}</div>}
              <form onSubmit={handleSaveStructure} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Class *</label>
                  <select value={structureClass} onChange={e => setStructureClass(e.target.value)} className="input-field" required>
                    <option value="">— Select Class —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fee Type *</label>
                  <select value={structureForm.fee_type} onChange={e => setStructureForm(f => ({...f, fee_type: e.target.value}))} className="input-field" required>
                    {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
                  <input type="number" min="0" value={structureForm.amount} onChange={e => setStructureForm(f => ({...f, amount: e.target.value}))} className="input-field" required placeholder="e.g. 2500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Due Day of Month</label>
                    <input type="number" min="1" max="31" value={structureForm.due_date} onChange={e => setStructureForm(f => ({...f, due_date: e.target.value}))} className="input-field" placeholder="10" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Late Fee / Day (Rs.)</label>
                    <input type="number" min="0" value={structureForm.late_fee_per_day} onChange={e => setStructureForm(f => ({...f, late_fee_per_day: e.target.value}))} className="input-field" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
                  <input type="text" value={structureForm.academic_year} onChange={e => setStructureForm(f => ({...f, academic_year: e.target.value}))} className="input-field" placeholder="2024-25" />
                </div>
                <p className="text-xs text-gray-400">If this fee type already exists for the selected class, it will be updated.</p>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowStructureModal(false); setStructureError(''); }} className="flex-1 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={savingStructure} className="flex-1 btn-primary">{savingStructure ? 'Saving...' : 'Save Fee'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD STUDENT DISCOUNT MODAL ── */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold">Add Student Discount</h2>
                  <p className="text-sm text-blue-600 mt-0.5">Override class/school default for a specific student</p>
                </div>
                <button onClick={() => { setShowOverrideModal(false); setOverrideError(''); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              {overrideError && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{overrideError}</div>}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-700">
                This custom fee will override the class/school default for this student when generating invoices.
              </div>
              <form onSubmit={handleSaveOverride} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Student *</label>
                  <select value={overrideForm.student_id} onChange={e => setOverrideForm(f => ({ ...f, student_id: e.target.value }))} className="input-field" required>
                    <option value="">— Select Student —</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} — {s.class_name || 'No Class'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fee Type *</label>
                  <select value={overrideForm.fee_type} onChange={e => setOverrideForm(f => ({ ...f, fee_type: e.target.value }))} className="input-field" required>
                    {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Custom Amount (Rs.) *</label>
                  <input type="number" min="0" value={overrideForm.amount} onChange={e => setOverrideForm(f => ({ ...f, amount: e.target.value }))} className="input-field" required placeholder="e.g. 1500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
                  <input type="text" value={overrideForm.academic_year} onChange={e => setOverrideForm(f => ({ ...f, academic_year: e.target.value }))} className="input-field" placeholder="2024-25" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reason (optional)</label>
                  <input type="text" value={overrideForm.reason} onChange={e => setOverrideForm(f => ({ ...f, reason: e.target.value }))} className="input-field" placeholder="e.g. Scholarship, sibling discount, concession..." />
                </div>
                <p className="text-xs text-gray-400">If a custom fee already exists for this type and year, it will be updated.</p>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowOverrideModal(false); setOverrideError(''); }} className="flex-1 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={savingOverride} className="flex-1 btn-primary">{savingOverride ? 'Saving...' : 'Save Discount'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── COLLECT FEE MODAL ── */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold">Collect Fee</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Invoice banao aur paid mark karo — ek step mein</p>
                </div>
                <button onClick={() => { setShowInvoiceModal(false); setInvoiceError(''); setInvoiceStudentClass(null); setFeeSource(null); setCollectReceipt(null); setPaidMonths([]); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {/* Receipt success */}
              {collectReceipt && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <p className="font-semibold text-green-800">✅ Fee Collected!</p>
                  <p className="text-sm text-green-700 mt-1">Student: <strong>{collectReceipt.student_name}</strong></p>
                  <p className="text-sm text-green-700">Invoice: <span className="font-mono">{collectReceipt.invoice_number}</span></p>
                  <p className="text-sm text-green-700">Receipt: <span className="font-mono font-bold">{collectReceipt.receipt_number}</span></p>
                </div>
              )}

              {invoiceError && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{invoiceError}</div>}

              <form onSubmit={handleSaveInvoice} className="space-y-3">
                {/* Student */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Student *</label>
                  <select value={invoiceForm.student_id} onChange={e => handleInvoiceStudentSelect(e.target.value)} className="input-field" required>
                    <option value="">— Select Student —</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.class_name || 'No Class'} ({s.roll_number || 'No Roll'})</option>)}
                  </select>
                </div>

                {/* Class info */}
                {invoiceStudentClass && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-2.5 text-sm text-purple-700">
                    Class: <strong>{invoiceStudentClass.name}</strong>
                  </div>
                )}

                {/* Fee Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fee Type *</label>
                  <select value={invoiceForm.fee_type} onChange={e => handleInvoiceFeeTypeSelect(e.target.value)} className="input-field" required disabled={!invoiceForm.student_id}>
                    <option value="">{invoiceForm.student_id ? 'Select Fee Type' : 'Pehle student select karein'}</option>
                    {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                </div>

                {/* Month (only for monthly) */}
                {invoiceForm.fee_type === 'monthly' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Month
                      {paidMonths.length > 0 && (
                        <span className="ml-1 text-xs font-normal text-green-600">
                          ({paidMonths.length} month{paidMonths.length > 1 ? 's' : ''} already paid)
                        </span>
                      )}
                    </label>
                    <select value={invoiceForm.month} onChange={e => setInvoiceForm(f => ({ ...f, month: e.target.value }))} className="input-field">
                      <option value="">— Select Month —</option>
                      {ACADEMIC_MONTHS.filter(m => !paidMonths.includes(m)).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Fee source badge */}
                {resolvingFee && <div className="text-xs text-gray-400 px-3 py-2 bg-gray-50 rounded-lg">Fee fetch ho rahi hai...</div>}
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
                    {feeSource === 'none'             && '⚠️ No fee structure — amount manually enter karein'}
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
                  <input type="number" min="0" step="0.01"
                    value={invoiceForm.amount}
                    onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
                    className="input-field" required placeholder="Auto-filled from fee structure" />
                  {feeSource && feeSource !== 'none' && (
                    <p className="text-xs text-gray-400 mt-0.5">Auto-filled — zaroorat ho to edit karein</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                    <select value={invoiceForm.payment_method} onChange={e => setInvoiceForm(f => ({ ...f, payment_method: e.target.value }))} className="input-field">
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  {/* Academic Year */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
                    <input type="text" value={invoiceForm.academic_year} onChange={e => setInvoiceForm(f => ({ ...f, academic_year: e.target.value }))} className="input-field" placeholder="2024-25" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowInvoiceModal(false); setInvoiceError(''); setInvoiceStudentClass(null); setFeeSource(null); setCollectReceipt(null); setPaidMonths([]); }} className="flex-1 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">Close</button>
                  <button type="submit" disabled={savingInvoice || !invoiceForm.student_id} className="flex-1 btn-primary">{savingInvoice ? 'Processing...' : 'Collect Fee'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

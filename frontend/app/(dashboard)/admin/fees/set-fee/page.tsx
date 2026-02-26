'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAcademicYear } from '@/lib/useAcademicYear';
import Navbar from '@/components/ui/navbar';

export default function SetFeePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const defaultYear = useAcademicYear();

  const [students, setStudents]             = useState<any[]>([]);
  const [allOverrides, setAllOverrides]     = useState<any[]>([]);
  const [showForm, setShowForm]             = useState(false);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [message, setMessage]               = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    student_id: '',
    academic_year: '',
    monthly_fee: '',
    annual_charges: '',
    admission_fee: '',
  });

  useEffect(() => {
    if (defaultYear) setForm(f => ({ ...f, academic_year: f.academic_year || defaultYear }));
  }, [defaultYear]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    if (!u.is_super_admin) { router.push('/admin/fees'); return; }
    setUser(u);
    loadData();
  }, [router]);

  const loadData = async () => {
    const [sr, or] = await Promise.all([
      apiFetch('/api/students/').then(r => r.json()),
      apiFetch('/api/fees/student-overrides').then(r => r.json()),
    ]);
    setStudents(sr.students || []);
    setAllOverrides(or.overrides || []);
    return or.overrides || [];
  };

  // Group overrides by student_id + academic_year → { student_id, student_name, academic_year, monthly, annual, admission }
  const grouped = (() => {
    const map: Record<string, any> = {};
    for (const o of allOverrides) {
      const key = `${o.student_id}__${o.academic_year}`;
      if (!map[key]) {
        map[key] = {
          student_id: o.student_id,
          student_name: o.student_name,
          academic_year: o.academic_year,
          monthly: null,
          annual: null,
          admission: null,
        };
      }
      if (o.fee_type === 'monthly')   map[key].monthly   = { id: o.id, amount: o.amount };
      if (o.fee_type === 'annual')    map[key].annual    = { id: o.id, amount: o.amount };
      if (o.fee_type === 'admission') map[key].admission = { id: o.id, amount: o.amount };
    }
    return Object.values(map);
  })();

  const resetForm = (clearMessage = true) => {
    setForm({ student_id: '', academic_year: defaultYear || '', monthly_fee: '', annual_charges: '', admission_fee: '' });
    setEditingStudent(null);
    setShowForm(false);
    if (clearMessage) setMessage(null);
  };

  const handleEdit = (row: any) => {
    setForm({
      student_id: String(row.student_id),
      academic_year: row.academic_year,
      monthly_fee:   row.monthly   ? String(row.monthly.amount)   : '',
      annual_charges: row.annual   ? String(row.annual.amount)    : '',
      admission_fee:  row.admission ? String(row.admission.amount) : '',
    });
    setEditingStudent(`${row.student_id}__${row.academic_year}`);
    setShowForm(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id) { setMessage({ type: 'error', text: 'Select a student' }); return; }
    setSaving(true); setMessage(null);

    const fees = [
      { fee_type: 'monthly',   amount: parseFloat(form.monthly_fee || '0') },
      { fee_type: 'annual',    amount: parseFloat(form.annual_charges || '0') },
      { fee_type: 'admission', amount: parseFloat(form.admission_fee || '0') },
    ].filter(f => f.amount > 0);

    if (fees.length === 0) {
      setMessage({ type: 'error', text: 'Enter at least one fee amount' });
      setSaving(false);
      return;
    }

    try {
      const responses = await Promise.all(
        fees.map(f =>
          apiFetch('/api/fees/student-overrides', {
            method: 'POST',
            body: JSON.stringify({
              student_id:    parseInt(form.student_id),
              fee_type:      f.fee_type,
              amount:        f.amount,
              academic_year: form.academic_year || defaultYear,
            }),
          })
        )
      );

      const failed = responses.find(r => !r.ok);
      if (failed) {
        const err = await failed.json();
        setMessage({ type: 'error', text: err.detail || 'Failed to save fee settings' });
        setSaving(false);
        return;
      }

      resetForm(false); // reset form but keep message
      setMessage({ type: 'success', text: 'Fee settings saved successfully!' });
      await loadData();
    } catch {
      setMessage({ type: 'error', text: 'Failed to save fee settings' });
    }
    setSaving(false);
  };

  const handleDelete = async (studentId: number, academicYear: string) => {
    if (!confirm('Delete all fee settings for this student?')) return;
    const toDelete = allOverrides.filter(
      o => o.student_id === studentId && o.academic_year === academicYear
    );
    await Promise.all(
      toDelete.map(o => apiFetch(`/api/fees/student-overrides/${o.id}`, { method: 'DELETE' }))
    );
    await loadData();
  };

  const monthly   = parseFloat(form.monthly_fee   || '0');
  const annual    = parseFloat(form.annual_charges || '0');
  const admission = parseFloat(form.admission_fee  || '0');

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Set Student Fees</h1>
            <p className="text-sm text-gray-500 mt-1">Set monthly, annual & admission fees per student</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="btn-primary"
          >
            {showForm ? 'Cancel' : '+ Set Fees for Student'}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-5 p-4 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingStudent ? 'Edit Fee Settings' : 'Set New Fee Settings'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Student */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Student *</label>
                  <select
                    value={form.student_id}
                    onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                    className="input-field"
                    required
                    disabled={!!editingStudent}
                  >
                    <option value="">— Select Student —</option>
                    {students.map(s => (
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
                    value={form.academic_year}
                    onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                    className="input-field"
                    placeholder="2024-25"
                  />
                </div>
              </div>

              {/* Fee Amounts */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Monthly Fee (Rs.)</label>
                  <input
                    type="number" min="0" step="100"
                    value={form.monthly_fee}
                    onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. 3000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Annual Charges (Rs.)</label>
                  <input
                    type="number" min="0" step="100"
                    value={form.annual_charges}
                    onChange={e => setForm(f => ({ ...f, annual_charges: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. 3500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Admission Fee (Rs.)</label>
                  <input
                    type="number" min="0" step="100"
                    value={form.admission_fee}
                    onChange={e => setForm(f => ({ ...f, admission_fee: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. 10000"
                  />
                </div>
              </div>

              {/* Fee Summary Preview */}
              {(monthly > 0 || annual > 0 || admission > 0) && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Fee Summary</p>
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    {monthly > 0 && (
                      <div>
                        <span className="text-gray-500">Monthly Fee:</span>
                        <span className="ml-2 font-semibold text-blue-800">Rs. {monthly.toLocaleString()}</span>
                      </div>
                    )}
                    {annual > 0 && (
                      <div>
                        <span className="text-gray-500">Annual Charges:</span>
                        <span className="ml-2 font-semibold text-purple-800">Rs. {annual.toLocaleString()}</span>
                      </div>
                    )}
                    {admission > 0 && (
                      <div>
                        <span className="text-gray-500">Admission Fee:</span>
                        <span className="ml-2 font-semibold text-orange-700">Rs. {admission.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => resetForm()} className="flex-1 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'Saving...' : editingStudent ? 'Update Fees' : 'Save Fee Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* All Student Fees Table */}
        <div className="card overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">All Student Fee Settings</h2>
            <span className="text-xs text-gray-400">{grouped.length} record(s)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                <th className="pb-3 pr-4">Student</th>
                <th className="pb-3 pr-4">Class</th>
                <th className="pb-3 pr-4">Year</th>
                <th className="pb-3 pr-4 text-right">Monthly</th>
                <th className="pb-3 pr-4 text-right">Annual</th>
                <th className="pb-3 pr-4 text-right">Admission</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grouped.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <p className="text-4xl mb-2">💸</p>
                    <p>No student fee settings found</p>
                    <p className="text-xs mt-1 text-gray-400">Click "Set Fees for Student" to add</p>
                  </td>
                </tr>
              ) : grouped.map(row => {
                const student = students.find(s => s.id === row.student_id);
                return (
                  <tr key={`${row.student_id}__${row.academic_year}`} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium">
                      <div>{row.student_name}</div>
                      <div className="text-xs text-gray-400">{student?.roll_number || '—'}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{student?.class_name || '—'}</td>
                    <td className="py-3 pr-4 text-gray-500">{row.academic_year}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-blue-700">
                      {row.monthly ? `Rs. ${parseFloat(row.monthly.amount).toLocaleString()}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-purple-700">
                      {row.annual ? `Rs. ${parseFloat(row.annual.amount).toLocaleString()}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-orange-700">
                      {row.admission ? `Rs. ${parseFloat(row.admission.amount).toLocaleString()}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(row)}
                          className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(row.student_id, row.academic_year)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

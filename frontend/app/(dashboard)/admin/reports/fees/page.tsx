'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

export default function FeesReport() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    apiFetch('/api/fees/invoices').then(r => r.json()).then(d => setInvoices(d.invoices || [])).finally(() => setLoading(false));
  }, [router]);

  const totalCollected = invoices.filter(i => i.is_paid).reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const totalPending   = invoices.filter(i => !i.is_paid).reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);

  // Group by month
  const byMonth: Record<string, { paid: number; pending: number; count: number }> = {};
  invoices.forEach(inv => {
    const key = inv.month || 'Unspecified';
    if (!byMonth[key]) byMonth[key] = { paid: 0, pending: 0, count: 0 };
    byMonth[key].count++;
    if (inv.is_paid) byMonth[key].paid += parseFloat(inv.total_amount || 0);
    else byMonth[key].pending += parseFloat(inv.total_amount || 0);
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fee Collection Report</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card text-center"><div className="text-2xl font-bold">{invoices.length}</div><div className="text-gray-500 text-sm">Total Invoices</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-green-600">{invoices.filter(i => i.is_paid).length}</div><div className="text-gray-500 text-sm">Paid</div></div>
          <div className="card text-center"><div className="text-xl font-bold text-green-600">Rs.{totalCollected.toLocaleString()}</div><div className="text-gray-500 text-sm">Collected</div></div>
          <div className="card text-center"><div className="text-xl font-bold text-orange-500">Rs.{totalPending.toLocaleString()}</div><div className="text-gray-500 text-sm">Outstanding</div></div>
        </div>

        {/* Monthly breakdown */}
        {Object.keys(byMonth).length > 0 && (
          <div className="card mb-6">
            <h2 className="font-semibold mb-4">Monthly Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                    <th className="pb-3 pr-4">Month</th>
                    <th className="pb-3 pr-4">Invoices</th>
                    <th className="pb-3 pr-4">Collected</th>
                    <th className="pb-3">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(byMonth).map(([month, data]) => (
                    <tr key={month}>
                      <td className="py-3 pr-4 font-medium">{month}</td>
                      <td className="py-3 pr-4">{data.count}</td>
                      <td className="py-3 pr-4 text-green-600 font-medium">Rs. {data.paid.toLocaleString()}</td>
                      <td className="py-3 text-orange-500 font-medium">Rs. {data.pending.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card overflow-x-auto">
          <h2 className="font-semibold mb-4">All Invoices</h2>
          {loading ? <p className="text-center py-8 text-gray-500">Loading...</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                  <th className="pb-3 pr-4">Invoice #</th>
                  <th className="pb-3 pr-4">Student</th>
                  <th className="pb-3 pr-4">Month</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="py-3 pr-4">{inv.student_name}</td>
                    <td className="py-3 pr-4">{inv.month || '—'}</td>
                    <td className="py-3 pr-4 font-semibold">Rs. {parseFloat(inv.total_amount || 0).toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.is_paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {inv.is_paid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

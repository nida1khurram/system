'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

const FEE_COLORS: Record<string, string> = {
  monthly:   'bg-blue-100 text-blue-700',
  admission: 'bg-purple-100 text-purple-700',
  annual:    'bg-green-100 text-green-700',
  exam:      'bg-orange-100 text-orange-700',
  transport: 'bg-teal-100 text-teal-700',
  other:     'bg-gray-100 text-gray-700',
};

export default function ParentFees() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [pending, setPending]   = useState<any[]>([]);
  const [paid, setPaid]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'unpaid' | 'paid' | 'all'>('unpaid');

  const load = () => {
    apiFetch('/api/students/my-children')
      .then(r => r.json()).then(d => setChildren(d.children || [])).catch(() => {});

    apiFetch('/api/fees/parent-pending')
      .then(r => r.json())
      .then(data => {
        setPending(data.pending || []);
        setPaid(data.paid || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'parent') { router.push(`/${u.role}`); return; }
    setUser(u);
    load();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  const totalPending = pending.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const totalPaid    = paid.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const totalAll     = totalPending + totalPaid;
  const paidPct      = totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0;

  // Group invoices by month for the yearly view
  const groupByMonth = (invoices: any[]) => {
    const map: Record<string, any[]> = {};
    for (const inv of invoices) {
      const key = inv.month || 'One-time Fees';
      if (!map[key]) map[key] = [];
      map[key].push(inv);
    }
    return map;
  };

  // Month order for sorting
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const sortMonths = (a: string, b: string) => {
    if (a === 'One-time Fees') return -1;
    if (b === 'One-time Fees') return 1;
    const [ma, ya] = [a.split(' ')[0], parseInt(a.split(' ')[1] || '0')];
    const [mb, yb] = [b.split(' ')[0], parseInt(b.split(' ')[1] || '0')];
    if (ya !== yb) return ya - yb;
    return MONTHS.indexOf(ma) - MONTHS.indexOf(mb);
  };

  const displayInvoices = tab === 'unpaid' ? pending : tab === 'paid' ? paid : [...pending, ...paid];
  const grouped = groupByMonth(displayInvoices);
  const sortedMonths = Object.keys(grouped).sort(sortMonths);

  const noChild = children.length === 0 && pending.length === 0 && paid.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="parent" userName={user?.name} />
      <main className="max-w-4xl mx-auto px-4 py-8">

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fees & Payments</h1>
        <p className="text-gray-500 text-sm mb-6">{new Date().getFullYear()} — Yearly Fee Summary</p>

        {noChild ? (
          <div className="card text-center py-16 text-gray-500">
            <p className="text-5xl mb-3">🔗</p>
            <p className="font-semibold text-lg text-gray-800">No child linked yet</p>
            <p className="text-sm mt-2">Link your child first to see fee details.</p>
            <a href="/parent/children"
              className="inline-block mt-5 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              Link Child →
            </a>
          </div>
        ) : (
          <>
            {/* Children chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {children.map(c => (
                <span key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-sm text-blue-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold">{c.name?.[0]?.toUpperCase()}</span>
                  {c.name} {c.class_name && <span className="text-xs text-blue-400">({c.class_name})</span>}
                </span>
              ))}
            </div>

            {/* Summary bar */}
            <div className="card mb-6">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Due</p>
                  <p className="text-xl font-bold text-red-600">Rs. {totalPending.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{pending.length} invoice{pending.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Paid</p>
                  <p className="text-xl font-bold text-green-600">Rs. {totalPaid.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{paid.length} invoice{paid.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Year Total</p>
                  <p className="text-xl font-bold text-gray-800">Rs. {totalAll.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{paidPct}% paid</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Paid: {paidPct}%</span>
                <span>Remaining: {100 - paidPct}%</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
              {([
                { key: 'unpaid', label: `Unpaid (${pending.length})` },
                { key: 'paid',   label: `Paid (${paid.length})` },
                { key: 'all',    label: `All (${pending.length + paid.length})` },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Yearly grouped list */}
            {displayInvoices.length === 0 ? (
              <div className="card text-center py-12 text-gray-500">
                <p className="text-3xl mb-2">{tab === 'paid' ? '✅' : '🎉'}</p>
                <p className="font-medium">{tab === 'paid' ? 'No paid invoices yet' : 'No pending fees!'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedMonths.map(month => {
                  const items = grouped[month];
                  const monthPaid    = items.filter(i => i.is_paid).length;
                  const monthPending = items.filter(i => !i.is_paid).length;

                  return (
                    <div key={month} className="card p-0 overflow-hidden">
                      {/* Month header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800">{month}</h3>
                        <div className="flex items-center gap-2">
                          {monthPaid > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              {monthPaid} paid
                            </span>
                          )}
                          {monthPending > 0 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                              {monthPending} unpaid
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fee rows */}
                      <div className="divide-y divide-gray-50">
                        {items.map(inv => (
                          <div key={inv.id} className={`flex items-center justify-between px-4 py-3 ${!inv.is_paid ? 'bg-red-50/30' : ''}`}>
                            <div className="flex items-center gap-3">
                              {/* Status dot */}
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${inv.is_paid ? 'bg-green-500' : 'bg-red-400'}`} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FEE_COLORS[inv.fee_type] || FEE_COLORS.other}`}>
                                    {inv.fee_type_label}
                                  </span>
                                  <span className="text-xs text-gray-400 font-mono">{inv.invoice_number}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{inv.student_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-gray-900">Rs. {parseFloat(inv.total_amount).toLocaleString()}</p>
                                <p className={`text-xs font-medium ${inv.is_paid ? 'text-green-600' : 'text-red-500'}`}>
                                  {inv.is_paid ? '✓ Paid' : 'Unpaid'}
                                </p>
                              </div>
                              {!inv.is_paid && (
                                <Link
                                  href={`/parent/fees/pay/${inv.id}`}
                                  className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                                >
                                  Pay Now
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Month total */}
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                        <span>Month Total</span>
                        <span className="font-semibold text-gray-700">
                          Rs. {items.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

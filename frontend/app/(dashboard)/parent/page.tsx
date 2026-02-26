'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

interface Invoice {
  id: number;
  invoice_number: string;
  student_name: string;
  fee_type: string;
  fee_type_label: string;
  month: string | null;
  total_amount: string;
  due_date: string;
  is_paid: boolean;
  student_id: number;
  class_name: string;
}

type PayResult = { type: 'success' | 'pending' | 'error'; message: string; receipt?: string; txnId?: string };

interface ChildSummary {
  student_id: number;
  student_name: string;
  class_name: string;
  pending: Invoice[];
  paid: Invoice[];
  total_due: number;
}

export default function ParentDashboard() {
  const router = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeChild, setActiveChild] = useState<number | null>(null);

  const loadInvoices = useCallback(() => {
    apiFetch('/api/fees/parent-pending')
      .then(r => r.json())
      .then(data => {
        const all = [...(data.pending || []), ...(data.paid || [])];
        setInvoices(all);
        // Auto-select first child
        if (all.length > 0) {
          const firstId = all[0].student_id;
          setActiveChild(prev => prev ?? firstId);
        }
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));

  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'parent') { router.push(`/${u.role}`); return; }
    setUser(u);
    loadInvoices();
  }, [router, loadInvoices]);

  // Group invoices by child
  const childrenMap: Record<number, ChildSummary> = {};
  for (const inv of invoices) {
    if (!childrenMap[inv.student_id]) {
      childrenMap[inv.student_id] = {
        student_id: inv.student_id,
        student_name: inv.student_name,
        class_name: inv.class_name || '—',
        pending: [],
        paid: [],
        total_due: 0,
      };
    }
    if (inv.is_paid) {
      childrenMap[inv.student_id].paid.push(inv);
    } else {
      childrenMap[inv.student_id].pending.push(inv);
      childrenMap[inv.student_id].total_due += parseFloat(inv.total_amount || '0');
    }
  }
  const children = Object.values(childrenMap);
  const activeData = children.find(c => c.student_id === activeChild) ?? children[0] ?? null;

  const totalAllDue = children.reduce((s, c) => s + c.total_due, 0);
  const totalAllPending = children.reduce((s, c) => s + c.pending.length, 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="parent" userName={user?.name || 'Parent'} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name?.split(' ')[0]}</h1>
          <p className="text-gray-500 text-sm mt-1">Fee summary for your children</p>
        </div>

        {/* Overall Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">👨‍👩‍👦</div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Children</p>
              <p className="text-2xl font-bold text-blue-600">{children.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-2xl flex-shrink-0">🔔</div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Pending</p>
              <p className="text-2xl font-bold text-red-600">{totalAllPending}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-2xl flex-shrink-0">💰</div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Due</p>
              <p className="text-2xl font-bold text-orange-600">Rs. {totalAllDue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {children.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">👶</p>
            <p className="font-semibold text-gray-700 text-lg">Koi child link nahi hai</p>
            <p className="text-sm text-gray-500 mt-2">Admin se link code le kar dobara register karein ya Children section mein add karein.</p>
            <Link href="/parent/children" className="inline-block mt-4 btn-primary text-sm">+ Add Child</Link>
          </div>
        ) : (
          <>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Children</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {children.map(child => {
                const totalPaid   = child.paid.reduce((s: number, i: Invoice) => s + parseFloat(i.total_amount || '0'), 0);
                const totalUnpaid = child.total_due;
                const allDone     = totalUnpaid === 0;
                return (
                  <div key={child.student_id} className="card">
                    {/* Child info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {child.student_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{child.student_name}</p>
                        <p className="text-xs text-gray-400">{child.class_name}</p>
                      </div>
                      {allDone && (
                        <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">All Clear ✓</span>
                      )}
                    </div>

                    {/* Paid / Unpaid summary */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500 font-medium mb-1">Total Paid</p>
                        <p className="text-lg font-bold text-green-600">Rs. {totalPaid.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{child.paid.length} invoice{child.paid.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className={`rounded-xl p-3 text-center ${totalUnpaid > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500 font-medium mb-1">Total Unpaid</p>
                        <p className={`text-lg font-bold ${totalUnpaid > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {totalUnpaid > 0 ? `Rs. ${totalUnpaid.toLocaleString()}` : 'Rs. 0'}
                        </p>
                        <p className="text-xs text-gray-400">{child.pending.length} invoice{child.pending.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <Link href="/parent/fees"
                      className="block text-center py-2 rounded-xl border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors">
                      View Fee Details →
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

    </div>
  );
}

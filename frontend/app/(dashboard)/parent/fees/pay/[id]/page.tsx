'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

type PayMethod = 'jazzcash' | 'jazzcash_manual' | 'cash';

type PayResult = {
  type: 'success' | 'pending' | 'submitted' | 'error';
  message: string;
  receipt?: string;
  txnId?: string;
};

export default function PayInvoice() {
  const router    = useRouter();
  const params    = useParams();
  const invoiceId = params.id as string;

  const [user, setUser]       = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [method, setMethod]   = useState<PayMethod>('cash');
  const [phone, setPhone]     = useState('');
  const [txnRef, setTxnRef]   = useState('');
  const [paying, setPaying]   = useState(false);
  const [polling, setPolling] = useState(false);
  const [result, setResult]   = useState<PayResult | null>(null);

  const [jazzcashApiAvailable, setJazzcashApiAvailable] = useState(false);
  const [jazzcashNumber, setJazzcashNumber]             = useState('');
  const [schoolName, setSchoolName]                     = useState('School');
  const [methodsLoaded, setMethodsLoaded]               = useState(false);

  const loadData = useCallback(() => {
    Promise.all([
      apiFetch('/api/fees/parent-pending').then(r => r.json()),
      apiFetch('/api/payments/methods').then(r => r.json()).catch(() => ({ jazzcash: false })),
      apiFetch('/api/settings/payment-info').then(r => r.json()).catch(() => ({ jazzcash_number: '', school_name: 'School' })),
    ]).then(([pendingData, methodsData, payInfo]) => {
      const all = [...(pendingData.pending || []), ...(pendingData.paid || [])];
      setInvoice(all.find((i: any) => i.id === parseInt(invoiceId)) || null);

      const apiOk = methodsData?.jazzcash === true;
      const hasNumber = !!(payInfo?.jazzcash_number);
      setJazzcashApiAvailable(apiOk);
      setJazzcashNumber(payInfo?.jazzcash_number || '');
      setSchoolName(payInfo?.school_name || 'School');

      // Default method priority: api > manual > cash
      setMethod(apiOk ? 'jazzcash' : hasNumber ? 'jazzcash_manual' : 'cash');
      setMethodsLoaded(true);
    }).catch(() => {
      setMethodsLoaded(true);
    }).finally(() => setLoading(false));
  }, [invoiceId]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
    loadData();
  }, [router, loadData]);

  /* ── JazzCash API payment ── */
  const handleApiPay = async () => {
    if (!invoice) return;
    setPaying(true); setResult(null);
    try {
      const res  = await apiFetch('/api/payments/jazzcash/initiate', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: invoice.id, student_id: invoice.student_id,
          amount: invoice.total_amount, payment_method: 'jazzcash', phone_number: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setResult({ type: 'error', message: data.detail || 'Payment failed.' }); return; }
      if (data.status === 'completed') {
        setResult({ type: 'success', message: data.message || 'Payment successful!', receipt: data.receipt_number });
        setTimeout(() => router.push('/parent/fees'), 3000);
      } else if (data.status === 'pending') {
        setResult({ type: 'pending', message: data.message, txnId: data.transaction_id });
      }
    } catch {
      setResult({ type: 'error', message: 'Could not connect. Please try again.' });
    } finally { setPaying(false); }
  };

  /* ── Manual JazzCash payment ── */
  const handleManualPay = async () => {
    if (!invoice || !txnRef.trim()) return;
    setPaying(true); setResult(null);
    try {
      const res  = await apiFetch('/api/payments/jazzcash-manual', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: invoice.id, student_id: invoice.student_id,
          amount: invoice.total_amount, transaction_id: txnRef.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setResult({ type: 'error', message: data.detail || 'Submission failed.' }); return; }
      setResult({ type: 'submitted', message: data.message, receipt: data.receipt_number });
    } catch {
      setResult({ type: 'error', message: 'Could not connect. Please try again.' });
    } finally { setPaying(false); }
  };

  /* ── Cash payment ── */
  const handleCashPay = async () => {
    if (!invoice) return;
    setPaying(true); setResult(null);
    try {
      const res  = await apiFetch('/api/payments/cash', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: invoice.id, student_id: invoice.student_id,
          amount: invoice.total_amount, payment_method: 'cash',
        }),
      });
      const data = await res.json();
      if (!res.ok) { setResult({ type: 'error', message: data.detail || 'Failed.' }); return; }
      setResult({ type: 'success', message: 'Cash payment recorded!', receipt: data.receipt_number });
      setTimeout(() => router.push('/parent/fees'), 3000);
    } catch {
      setResult({ type: 'error', message: 'Could not connect. Please try again.' });
    } finally { setPaying(false); }
  };

  const handlePay = () => {
    if (method === 'jazzcash')        handleApiPay();
    else if (method === 'jazzcash_manual') handleManualPay();
    else                              handleCashPay();
  };

  const checkStatus = async () => {
    if (!result?.txnId) return;
    setPolling(true);
    try {
      const res  = await apiFetch(`/api/payments/jazzcash/status/${result.txnId}`);
      const data = await res.json();
      if (data.status === 'completed') {
        setResult({ type: 'success', message: 'Payment confirmed! Fee marked as paid.', receipt: data.receipt_number });
        setTimeout(() => router.push('/parent/fees'), 3000);
      } else if (data.status === 'failed') {
        setResult({ type: 'error', message: 'Payment was declined. Please try again.' });
      } else {
        setResult(prev => prev ? { ...prev, message: 'Still pending — please approve in your JazzCash app.' } : null);
      }
    } catch { /* ignore */ } finally { setPolling(false); }
  };

  const canSubmit = () => {
    if (paying) return false;
    if (method === 'jazzcash') return !!phone;
    if (method === 'jazzcash_manual') return !!txnRef.trim();
    return true;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
  if (!user) return null;

  const hasManual = !!jazzcashNumber;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="parent" userName={user?.name} />
      <main className="max-w-lg mx-auto px-4 py-8">

        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1 text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pay Invoice</h1>

        {!invoice ? (
          <div className="card text-center py-10 text-gray-500">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">Invoice not found or already paid.</p>
            <button onClick={() => router.push('/parent/fees')} className="mt-4 text-sm text-blue-600 hover:underline">
              ← Back to fees
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Result banners */}
            {result?.type === 'success' && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <span className="text-green-600 text-xl">✓</span> Payment Successful
                </div>
                <p className="text-sm">{result.message}</p>
                {result.receipt && <p className="text-xs mt-2 font-mono bg-green-100 px-2 py-1 rounded w-fit">Receipt: {result.receipt}</p>}
                <p className="text-xs mt-2 text-green-600">Redirecting…</p>
              </div>
            )}

            {result?.type === 'submitted' && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <span className="text-xl">📨</span> Payment Submitted
                </div>
                <p className="text-sm">{result.message}</p>
                {result.receipt && <p className="text-xs mt-2 font-mono bg-blue-100 px-2 py-1 rounded w-fit">Reference: {result.receipt}</p>}
                <p className="text-xs mt-2 text-blue-600">Admin will verify and mark it as paid.</p>
                <button onClick={() => router.push('/parent/fees')} className="mt-3 text-sm text-blue-700 hover:underline">← Back to fees</button>
              </div>
            )}

            {result?.type === 'pending' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <span className="text-xl">⏳</span> Approval Required
                </div>
                <p className="text-sm">{result.message}</p>
                <p className="text-xs mt-1 text-amber-700">Open JazzCash app → Notifications → Approve the payment.</p>
                <button onClick={checkStatus} disabled={polling}
                  className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50">
                  {polling ? 'Checking…' : 'Check Payment Status'}
                </button>
              </div>
            )}

            {result?.type === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                {result.message}
              </div>
            )}

            {/* Invoice Details */}
            <div className="card">
              <h2 className="font-semibold text-gray-700 mb-3">Invoice Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice #</span>
                  <span className="font-mono font-medium">{invoice.invoice_number}</span>
                </div>
                {invoice.student_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Student</span>
                    <span className="font-medium">{invoice.student_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Month</span>
                  <span>{invoice.month || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date</span>
                  <span>{invoice.due_date}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold text-xl text-gray-900">
                    Rs. {parseFloat(invoice.total_amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment form — only when no final result */}
            {!result && methodsLoaded && (
              <>
                <div className="card">
                  <h2 className="font-semibold text-gray-700 mb-4">Select Payment Method</h2>

                  {/* Method buttons */}
                  <div className={`grid gap-3 mb-4 ${jazzcashApiAvailable && hasManual ? 'grid-cols-3' : (jazzcashApiAvailable || hasManual) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {jazzcashApiAvailable && (
                      <button onClick={() => setMethod('jazzcash')}
                        className={`p-3 rounded-xl border-2 text-left transition-colors ${method === 'jazzcash' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="text-2xl">📱</div>
                        <div className="font-medium mt-1 text-sm">JazzCash</div>
                        <div className="text-xs text-gray-500">Instant online pay</div>
                      </button>
                    )}
                    {hasManual && (
                      <button onClick={() => setMethod('jazzcash_manual')}
                        className={`p-3 rounded-xl border-2 text-left transition-colors ${method === 'jazzcash_manual' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="text-2xl">💸</div>
                        <div className="font-medium mt-1 text-sm">JazzCash Transfer</div>
                        <div className="text-xs text-gray-500">Send & submit proof</div>
                      </button>
                    )}
                    <button onClick={() => setMethod('cash')}
                      className={`p-3 rounded-xl border-2 text-left transition-colors ${method === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-2xl">💵</div>
                      <div className="font-medium mt-1 text-sm">Cash</div>
                      <div className="text-xs text-gray-500">Pay at school office</div>
                    </button>
                  </div>

                  {/* JazzCash API: phone input */}
                  {method === 'jazzcash' && (
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Your JazzCash Number <span className="text-red-500">*</span>
                      </label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        placeholder="03XX-XXXXXXX" className="input-field" />
                      <p className="text-xs text-gray-500">You will receive an approval request in your JazzCash app.</p>
                    </div>
                  )}

                  {/* Manual JazzCash: step-by-step */}
                  {method === 'jazzcash_manual' && (
                    <div className="space-y-3">
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-orange-800 mb-2">How to pay:</p>
                        <ol className="text-sm text-orange-700 space-y-1.5 list-decimal list-inside">
                          <li>Open your <strong>JazzCash app</strong></li>
                          <li>Go to <strong>Send Money</strong></li>
                          <li>Send <strong>Rs. {parseFloat(invoice.total_amount).toLocaleString()}</strong> to:</li>
                        </ol>
                        <div className="mt-3 bg-white border border-orange-200 rounded-lg px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">JazzCash Number</p>
                            <p className="text-lg font-bold font-mono text-gray-900">{jazzcashNumber}</p>
                            <p className="text-xs text-gray-500">{schoolName}</p>
                          </div>
                          <button
                            onClick={() => { navigator.clipboard.writeText(jazzcashNumber); }}
                            className="text-xs text-orange-600 hover:text-orange-700 border border-orange-200 px-2 py-1 rounded-lg"
                          >
                            Copy
                          </button>
                        </div>
                        <ol className="text-sm text-orange-700 space-y-1.5 list-decimal list-inside mt-3" start={4}>
                          <li>After sending, enter the <strong>Transaction ID</strong> from your JazzCash app below</li>
                        </ol>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          JazzCash Transaction ID <span className="text-red-500">*</span>
                        </label>
                        <input type="text" value={txnRef} onChange={e => setTxnRef(e.target.value)}
                          placeholder="e.g. TT2502250001234" className="input-field font-mono" />
                        <p className="text-xs text-gray-400 mt-1">
                          Find it in JazzCash app → Transaction History → Transaction ID
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cash info */}
                  {method === 'cash' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                      Please visit the school office with this invoice to complete the cash payment.
                    </div>
                  )}
                </div>

                <button
                  onClick={handlePay}
                  disabled={!canSubmit()}
                  className="btn-primary w-full py-3 text-base disabled:opacity-50"
                >
                  {paying ? 'Processing…' : (
                    method === 'jazzcash'
                      ? `Pay Rs. ${parseFloat(invoice.total_amount).toLocaleString()} via JazzCash`
                      : method === 'jazzcash_manual'
                        ? 'Submit Payment for Verification'
                        : `Submit Cash Payment — Rs. ${parseFloat(invoice.total_amount).toLocaleString()}`
                  )}
                </button>
              </>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

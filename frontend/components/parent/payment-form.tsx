'use client';

import { useState } from 'react';

interface Props {
  invoiceId: number;
  studentId: number;
  studentName: string;
  feeAmount: number;
  invoiceNumber: string;
  month?: string;
}

export default function PaymentForm({ invoiceId, studentId, studentName, feeAmount, invoiceNumber, month }: Props) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'jazzcash' | 'easypaisa' | 'bank_transfer'>('jazzcash');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePayment = async () => {
    if ((paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') && !phone) {
      setError('Phone number is required for mobile payments');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint =
        paymentMethod === 'jazzcash'
          ? '/api/payments/jazzcash/initiate'
          : paymentMethod === 'easypaisa'
          ? '/api/payments/easypaisa/initiate'
          : '/api/payments/bank/initiate';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, studentId, amount: feeAmount, phoneNumber: phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Payment failed');
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setSuccess('Payment initiated successfully!');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-md">
      <h3 className="text-xl font-bold mb-1">Pay School Fees</h3>
      <p className="text-gray-500 text-sm mb-6">Invoice: {invoiceNumber} {month && `(${month})`}</p>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 mb-4 text-sm">{success}</div>}

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Student:</span>
          <span className="font-medium">{studentName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Amount:</span>
          <span className="font-bold text-lg text-primary-600">Rs. {feeAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'jazzcash', label: 'JazzCash', icon: '📱' },
            { value: 'easypaisa', label: 'EasyPaisa', icon: '💚' },
            { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
          ].map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => setPaymentMethod(method.value as any)}
              className={`p-3 rounded-lg border-2 text-center text-sm font-medium transition-colors ${
                paymentMethod === method.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-xl mb-1">{method.icon}</div>
              {method.label}
            </button>
          ))}
        </div>
      </div>

      {(paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
            placeholder="03001234567"
          />
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={loading}
        className="btn-primary w-full py-3 text-base"
      >
        {loading ? 'Processing...' : `Pay Rs. ${feeAmount.toLocaleString()} with ${paymentMethod === 'jazzcash' ? 'JazzCash' : paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'Bank Transfer'}`}
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';

interface FeeInvoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  lateFee: number;
  totalAmount: number;
  dueDate: string;
  month: string;
  isPaid: boolean;
}

export function useFees(studentId?: number) {
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInvoices = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/fees?type=invoices&studentId=${studentId}`);
      const data = await res.json();
      if (res.ok) {
        setInvoices(data.invoices);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const pendingInvoices = invoices.filter((inv) => !inv.isPaid);
  const paidInvoices = invoices.filter((inv) => inv.isPaid);
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount as unknown as string), 0);

  return { invoices, pendingInvoices, paidInvoices, totalPending, loading, error, refetch: fetchInvoices };
}

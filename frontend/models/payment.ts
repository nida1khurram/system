import { z } from 'zod';

export interface Payment {
  id: number;
  invoiceId: number;
  studentId: number;
  amount: number;
  paymentMethod: 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'cash';
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paidAt?: Date;
  receiptNumber?: string;
}

export const initiatePaymentSchema = z.object({
  invoiceId: z.number(),
  studentId: z.number(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['jazzcash', 'easypaisa', 'bank_transfer', 'cash']),
  phoneNumber: z.string().optional(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

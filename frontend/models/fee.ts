import { z } from 'zod';

export type FeeType = 'monthly' | 'admission' | 'exam' | 'transport' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'cash';

export interface FeeStructure {
  id: number;
  classId: number;
  feeType: FeeType;
  amount: number;
  dueDate: number;
  lateFeePerDay: number;
  academicYear: string;
  isActive: boolean;
}

export interface FeeInvoice {
  id: number;
  invoiceNumber: string;
  studentId: number;
  feeStructureId?: number;
  amount: number;
  lateFee: number;
  totalAmount: number;
  dueDate: string;
  month?: string;
  academicYear?: string;
  isPaid: boolean;
  student?: { name: string; rollNumber: string };
}

export const createFeeStructureSchema = z.object({
  classId: z.number(),
  feeType: z.enum(['monthly', 'admission', 'exam', 'transport', 'other']),
  amount: z.number().positive(),
  dueDate: z.number().min(1).max(31).default(10),
  lateFeePerDay: z.number().min(0).default(0),
  academicYear: z.string(),
});

export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;

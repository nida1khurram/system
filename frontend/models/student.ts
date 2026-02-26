import { z } from 'zod';

export interface Student {
  id: number;
  userId: number;
  rollNumber: string;
  admissionNumber: string;
  classId: number;
  parentId?: number;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  admissionDate?: string;
  isActive: boolean;
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
  class?: {
    name: string;
    grade: string;
    section: string;
  };
}

export const createStudentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  rollNumber: z.string().min(1),
  classId: z.number(),
  parentId: z.number().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  bloodGroup: z.string().optional(),
  admissionDate: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

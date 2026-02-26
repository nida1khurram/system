import { createFeeStructureSchema } from '@/models/fee';

describe('Fee Models - Validation', () => {
  describe('createFeeStructureSchema', () => {
    const validFeeData = {
      classId: 1,
      feeType: 'monthly' as const,
      amount: 5000,
      dueDate: 10,
      lateFeePerDay: 50,
      academicYear: '2024-25',
    };

    it('should validate correct fee structure data', () => {
      const result = createFeeStructureSchema.safeParse(validFeeData);
      expect(result.success).toBe(true);
    });

    it('should accept all valid fee types', () => {
      const feeTypes = ['monthly', 'admission', 'exam', 'transport', 'other'] as const;
      feeTypes.forEach((feeType) => {
        const result = createFeeStructureSchema.safeParse({ ...validFeeData, feeType });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid fee type', () => {
      const result = createFeeStructureSchema.safeParse({ ...validFeeData, feeType: 'canteen' });
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const result = createFeeStructureSchema.safeParse({ ...validFeeData, amount: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = createFeeStructureSchema.safeParse({ ...validFeeData, amount: -100 });
      expect(result.success).toBe(false);
    });

    it('should have default values for optional fields', () => {
      const { dueDate, lateFeePerDay, ...minimal } = validFeeData;
      const result = createFeeStructureSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dueDate).toBe(10);
        expect(result.data.lateFeePerDay).toBe(0);
      }
    });
  });
});

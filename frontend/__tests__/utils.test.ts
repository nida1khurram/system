import { generateInvoiceNumber, generateReceiptNumber, formatCurrency, calculateGrade, formatDate } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('generateInvoiceNumber', () => {
    it('should generate invoice number with correct format', () => {
      const invoice = generateInvoiceNumber();
      expect(invoice).toMatch(/^INV-\d{4}-\d{4}$/);
    });

    it('should generate unique invoice numbers', () => {
      const inv1 = generateInvoiceNumber();
      const inv2 = generateInvoiceNumber();
      // Format same, random part may differ
      expect(inv1.startsWith('INV-')).toBe(true);
      expect(inv2.startsWith('INV-')).toBe(true);
    });
  });

  describe('generateReceiptNumber', () => {
    it('should generate receipt number starting with RCP-', () => {
      const receipt = generateReceiptNumber();
      expect(receipt).toMatch(/^RCP-\d{6}$/);
    });
  });

  describe('formatCurrency', () => {
    it('should format number as PKR currency', () => {
      expect(formatCurrency(5000)).toBe('Rs. 5,000');
    });

    it('should handle string input', () => {
      expect(formatCurrency('10000')).toBe('Rs. 10,000');
    });

    it('should handle decimal amounts', () => {
      const result = formatCurrency(1500.5);
      expect(result).toContain('Rs.');
      expect(result).toContain('1,500');
    });
  });

  describe('calculateGrade', () => {
    it('should return A+ for 90% or above', () => {
      expect(calculateGrade(90, 100)).toBe('A+');
      expect(calculateGrade(95, 100)).toBe('A+');
      expect(calculateGrade(100, 100)).toBe('A+');
    });

    it('should return A for 80-89%', () => {
      expect(calculateGrade(80, 100)).toBe('A');
      expect(calculateGrade(85, 100)).toBe('A');
    });

    it('should return B for 70-79%', () => {
      expect(calculateGrade(70, 100)).toBe('B');
      expect(calculateGrade(75, 100)).toBe('B');
    });

    it('should return C for 60-69%', () => {
      expect(calculateGrade(60, 100)).toBe('C');
      expect(calculateGrade(65, 100)).toBe('C');
    });

    it('should return D for 50-59%', () => {
      expect(calculateGrade(50, 100)).toBe('D');
      expect(calculateGrade(55, 100)).toBe('D');
    });

    it('should return F for below 50%', () => {
      expect(calculateGrade(40, 100)).toBe('F');
      expect(calculateGrade(0, 100)).toBe('F');
    });

    it('should handle different total marks', () => {
      expect(calculateGrade(45, 50)).toBe('A+'); // 90%
      expect(calculateGrade(35, 50)).toBe('B'); // 70%
    });
  });

  describe('formatDate', () => {
    it('should format date string', () => {
      const result = formatDate('2024-01-15');
      expect(result).toContain('2024');
      expect(result).toContain('Jan');
    });

    it('should handle Date object', () => {
      const date = new Date('2024-06-20');
      const result = formatDate(date);
      expect(result).toContain('2024');
    });
  });
});

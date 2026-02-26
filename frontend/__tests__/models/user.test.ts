import { loginSchema, registerSchema } from '@/models/user';

describe('User Models - Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const result = loginSchema.safeParse({
        email: 'admin@school.com',
        password: 'admin123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'admin123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = loginSchema.safeParse({
        email: 'admin@school.com',
        password: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const result = loginSchema.safeParse({ email: 'test@test.com' });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    const validData = {
      name: 'Muhammad Ali',
      email: 'ali@school.com',
      password: 'password123',
      role: 'parent' as const,
    };

    it('should validate correct register data', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept valid roles', () => {
      const roles = ['admin', 'teacher', 'parent', 'student'] as const;
      roles.forEach((role) => {
        const result = registerSchema.safeParse({ ...validData, role });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid role', () => {
      const result = registerSchema.safeParse({ ...validData, role: 'superuser' });
      expect(result.success).toBe(false);
    });

    it('should reject short name', () => {
      const result = registerSchema.safeParse({ ...validData, name: 'A' });
      expect(result.success).toBe(false);
    });

    it('should allow optional phone', () => {
      const result = registerSchema.safeParse({ ...validData, phone: '03001234567' });
      expect(result.success).toBe(true);
    });
  });
});

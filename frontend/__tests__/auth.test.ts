/**
 * @jest-environment node
 */
import { signToken, verifyToken } from '@/lib/auth';

// Set JWT_SECRET for tests
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';

describe('Authentication Functions', () => {
  const testPayload = {
    userId: 1,
    role: 'admin' as const,
    email: 'admin@test.com',
  };

  describe('signToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await signToken(testPayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      // JWT format: header.payload.signature
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token and return payload', async () => {
      const token = await signToken(testPayload);
      const result = await verifyToken(token);
      expect(result).toBeTruthy();
      expect(result?.userId).toBe(testPayload.userId);
      expect(result?.role).toBe(testPayload.role);
      expect(result?.email).toBe(testPayload.email);
    });

    it('should return null for invalid token', async () => {
      const result = await verifyToken('invalid.token.here');
      expect(result).toBeNull();
    });

    it('should return null for empty token', async () => {
      const result = await verifyToken('');
      expect(result).toBeNull();
    });

    it('should return null for tampered token', async () => {
      const token = await signToken(testPayload);
      const tampered = token.slice(0, -5) + 'XXXXX';
      const result = await verifyToken(tampered);
      expect(result).toBeNull();
    });
  });

  describe('token payload integrity', () => {
    it('should preserve all payload fields', async () => {
      const payload = { userId: 42, role: 'teacher' as const, email: 'teacher@school.com' };
      const token = await signToken(payload);
      const decoded = await verifyToken(token);

      expect(decoded?.userId).toBe(42);
      expect(decoded?.role).toBe('teacher');
      expect(decoded?.email).toBe('teacher@school.com');
    });
  });
});

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function RegisterSchoolPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    school_name: '',
    admin_name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res  = await apiFetch('/api/auth/register-school', {
        method: 'POST',
        body: JSON.stringify({
          school_name: form.school_name,
          admin_name:  form.admin_name,
          email:       form.email,
          password:    form.password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Registration failed');
        return;
      }

      // Auto-login
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.access_token, role: data.user.role }),
      });

      window.location.href = '/admin';
    } catch {
      setError('Could not connect to the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏫</div>
          <h1 className="text-2xl font-bold text-gray-900">Register Your School</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Create your school account — you will be the Sub Admin
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
            <input
              type="text"
              value={form.school_name}
              onChange={e => setForm({ ...form, school_name: e.target.value })}
              className="input-field"
              placeholder="e.g. Al-Noor Academy"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
            <input
              type="text"
              value={form.admin_name}
              onChange={e => setForm({ ...form, admin_name: e.target.value })}
              className="input-field"
              placeholder="e.g. Mr. Ahmed"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="input-field"
              placeholder="at least 8 characters"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              className="input-field"
              placeholder="re-enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? 'Creating...' : 'Create School & Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">
            Login here
          </Link>
        </p>

      </div>
    </div>
  );
}

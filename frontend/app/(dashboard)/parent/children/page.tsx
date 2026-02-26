'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

export default function ParentChildren() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const loadChildren = () =>
    apiFetch('/api/students/my-children')
      .then(r => r.json())
      .then(d => setChildren(d.children || []));

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'parent') { router.push(`/${u.role}`); return; }
    setUser(u);
    loadChildren();
  }, [router]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCode.trim()) return;
    setLinking(true); setError(''); setSuccess('');
    const res  = await apiFetch('/api/students/link-child', {
      method: 'POST',
      body: JSON.stringify({ link_code: linkCode.trim().toUpperCase() }),
    });
    const data = await res.json();
    setLinking(false);
    if (!res.ok) { setError(data.detail || 'Failed to link student'); return; }
    setSuccess(data.message || 'Student linked successfully!');
    setLinkCode('');
    loadChildren();
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="parent" userName={user?.name} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Children</h1>
          <p className="text-sm text-gray-500 mt-1">Link and view your children's school profiles</p>
        </div>

        {/* Link Child Form */}
        <div className="card mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Add a Child</h2>
          <p className="text-xs text-gray-500 mb-4">
            Enter the <strong>Link Code</strong> given by the school admin (e.g. <span className="font-mono">ABC-123</span>)
          </p>
          {error   && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-3 text-sm">{error}</div>}
          {success && <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 mb-3 text-sm">{success}</div>}
          <form onSubmit={handleLink} className="flex gap-3">
            <input
              type="text"
              value={linkCode}
              onChange={e => setLinkCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC-XY3"
              maxLength={7}
              className="input-field flex-1 font-mono tracking-widest uppercase"
              required
            />
            <button type="submit" disabled={linking || !linkCode.trim()} className="btn-primary px-6">
              {linking ? 'Linking...' : 'Link Child'}
            </button>
          </form>
        </div>

        {/* Children List */}
        {children.length === 0 ? (
          <div className="card text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">👨‍👩‍👦</p>
            <p className="font-medium text-lg">No children linked yet</p>
            <p className="text-sm mt-1 text-gray-400">Use the link code from school admin to add your child</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide px-1">
              Linked Children ({children.length})
            </h2>
            {children.map(child => (
              <div key={child.id} className="card flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl flex-shrink-0">
                  {child.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{child.name}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    <span>Class: <strong>{child.class_name || '—'}</strong></span>
                    <span>Roll: <strong className="font-mono">{child.roll_number || '—'}</strong></span>
                    <span>Code: <strong className="font-mono text-amber-700">{child.link_code}</strong></span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                  Active
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

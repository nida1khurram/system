'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

export default function ParentMessages() {
  const router = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [messages, setMessages]   = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [selected, setSelected]   = useState<any>(null);
  const [form, setForm]           = useState({ receiver_id: '', subject: '', message: '' });
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loading, setLoading]     = useState(true);

  const load = () =>
    apiFetch('/api/messages/').then(r => r.json())
      .then(d => setMessages(d.messages || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'parent') { router.push(`/${u.role}`); return; }
    setUser(u);
    load();
    apiFetch('/api/messages/recipients').then(r => r.json()).then(d => setRecipients(d.recipients || [])).catch(() => {});
  }, [router]);

  const handleDelete = async (msgId: number) => {
    setDeletingId(msgId);
    await apiFetch(`/api/messages/${msgId}`, { method: 'DELETE' });
    if (selected?.id === msgId) setSelected(null);
    load();
    setDeletingId(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.receiver_id) { setSendError('Please select a recipient'); return; }
    setSending(true); setSendError('');
    const res  = await apiFetch('/api/messages/', {
      method: 'POST',
      body: JSON.stringify({ ...form, receiver_id: parseInt(form.receiver_id) }),
    });
    const data = await res.json();
    if (!res.ok) { setSendError(data.detail || 'Failed to send'); setSending(false); return; }
    setShowCompose(false);
    setForm({ receiver_id: '', subject: '', message: '' });
    load();
    setSending(false);
  };

  const userId = user?.id;
  const inbox  = messages.filter(m => m.receiver_id === userId);
  const sent   = messages.filter(m => m.sender_id   === userId);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="parent" userName={user?.name} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <button onClick={() => { setShowCompose(true); setSendError(''); }} className="btn-primary">
            + Compose
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message list */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Inbox ({inbox.length})</h2>
            {inbox.length === 0
              ? <p className="text-gray-400 text-sm">No messages</p>
              : inbox.map(m => (
                <div key={m.id} className={`relative group rounded-xl border transition-colors ${selected?.id === m.id ? 'border-purple-300 bg-purple-50' : 'bg-white border-gray-200 hover:border-gray-300'} ${!m.is_read ? 'border-l-4 border-l-purple-500' : ''}`}>
                  <button onClick={() => setSelected(m)} className="w-full text-left p-3">
                    <p className={`text-sm ${!m.is_read ? 'font-semibold' : 'font-medium'} truncate pr-6`}>{m.subject || 'No subject'}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">From: {m.sender_name}</p>
                    <p className="text-xs text-gray-400 mt-1">{m.created_at?.slice(0, 10)}</p>
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={deletingId === m.id}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded transition-opacity disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === m.id ? '…' : '✕'}
                  </button>
                </div>
              ))
            }

            <h2 className="text-sm font-semibold text-gray-500 uppercase mt-4 mb-2">Sent ({sent.length})</h2>
            {sent.length === 0
              ? <p className="text-gray-400 text-sm">No sent messages</p>
              : sent.map(m => (
                <div key={m.id} className={`relative group rounded-xl border transition-colors ${selected?.id === m.id ? 'border-purple-300 bg-purple-50' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                  <button onClick={() => setSelected(m)} className="w-full text-left p-3">
                    <p className="text-sm font-medium truncate pr-6">{m.subject || 'No subject'}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">To: {m.receiver_name}</p>
                    <p className="text-xs text-gray-400 mt-1">{m.created_at?.slice(0, 10)}</p>
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={deletingId === m.id}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded transition-opacity disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === m.id ? '…' : '✕'}
                  </button>
                </div>
              ))
            }
          </div>

          {/* Message detail */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="card h-full">
                <h2 className="font-semibold text-lg mb-1">{selected.subject || 'No subject'}</h2>
                <div className="flex gap-4 text-xs text-gray-400 mb-4">
                  <span>From: <span className="text-gray-600 font-medium">{selected.sender_name}</span></span>
                  <span>To: <span className="text-gray-600 font-medium">{selected.receiver_name}</span></span>
                  <span>{selected.created_at?.slice(0, 16)}</span>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>
            ) : (
              <div className="card h-full flex items-center justify-center text-center text-gray-400 py-20">
                <div>
                  <p className="text-4xl mb-2">💬</p>
                  <p>Select a message to read</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">New Message</h2>
                <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {sendError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">{sendError}</div>
              )}

              <form onSubmit={handleSend} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send To <span className="text-red-500">*</span></label>
                  <select
                    value={form.receiver_id}
                    onChange={e => setForm({ ...form, receiver_id: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">— Select admin —</option>
                    {recipients.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                    {recipients.length === 0 && (
                      <option disabled>No admins found</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input type="text" value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="input-field" placeholder="e.g. Fee inquiry" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-red-500">*</span></label>
                  <textarea value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="input-field h-28 resize-none" required
                    placeholder="Type your message here..." />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCompose(false)}
                    className="flex-1 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={sending} className="flex-1 btn-primary">
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

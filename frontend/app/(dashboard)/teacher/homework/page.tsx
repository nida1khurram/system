'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

interface HW {
  id: number;
  subject: string;
  title: string;
  description: string;
  due_date: string;
  teacher_name: string;
  class_id: number | null;
  class_name: string;
  file_name: string | null;
  file_mime: string | null;
  has_file: boolean;
  created_at: string;
}

interface ClassOption { id: number; name: string; }

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-powerpoint': '📊',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
  'image/png': '🖼️', 'image/jpeg': '🖼️', 'image/jpg': '🖼️',
};

export default function TeacherHomework() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser]           = useState<any>(null);
  const [homeworks, setHomeworks] = useState<HW[]>([]);
  const [classes, setClasses]     = useState<ClassOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);

  const [form, setForm] = useState({
    subject: '', title: '', description: '', due_date: '', class_id: '',
  });
  const [file, setFile]           = useState<{ name: string; data: string; mime: string } | null>(null);
  const [fileError, setFileError] = useState('');

  const load = () =>
    apiFetch('/api/homework/').then(r => r.json())
      .then(d => setHomeworks(d.homeworks || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (!['teacher', 'admin'].includes(u.role)) { router.push(`/${u.role}`); return; }
    setUser(u);
    load();
    apiFetch('/api/classes/').then(r => r.json()).then(d => setClasses(d.classes || []));
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const f = e.target.files?.[0];
    if (!f) { setFile(null); return; }
    if (f.size > 5 * 1024 * 1024) { setFileError('File must be under 5MB'); setFile(null); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      const [meta, base64] = dataUrl.split(',');
      const mime = meta.replace('data:', '').replace(';base64', '');
      setFile({ name: f.name, data: base64, mime });
    };
    reader.readAsDataURL(f);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const payload: any = {
      subject:     form.subject,
      title:       form.title,
      description: form.description,
      due_date:    form.due_date,
      class_id:    form.class_id ? parseInt(form.class_id) : null,
    };
    if (file) { payload.file_name = file.name; payload.file_data = file.data; payload.file_mime = file.mime; }
    const res  = await apiFetch('/api/homework/', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.detail || 'Failed to save'); setSaving(false); return; }
    setShowModal(false);
    resetModal();
    load();
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/homework/${id}`, { method: 'DELETE' });
    load();
  };

  const handleDownload = async (hw: HW) => {
    setDownloading(hw.id);
    try {
      const res  = await apiFetch(`/api/homework/${hw.id}/download`);
      const data = await res.json();
      if (!data.file_data) return;
      const link = document.createElement('a');
      link.href = `data:${data.file_mime};base64,${data.file_data}`;
      link.download = data.file_name || 'attachment';
      link.click();
    } finally { setDownloading(null); }
  };

  const resetModal = () => {
    setShowModal(false);
    setForm({ subject: '', title: '', description: '', due_date: '', class_id: '' });
    setFile(null); setFileError(''); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role={user?.role} userName={user?.name} />
      <main className="max-w-4xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Homework / Assignments</h1>
          {['teacher', 'admin'].includes(user?.role) && (
            <button onClick={() => setShowModal(true)} className="btn-primary">+ Assign Homework</button>
          )}
        </div>

        <div className="space-y-4">
          {homeworks.length === 0 ? (
            <div className="card text-center py-16 text-gray-500">
              <p className="text-5xl mb-3">📚</p>
              <p className="font-medium text-lg">No homework assigned yet</p>
              <p className="text-sm mt-1">Click "Assign Homework" to post for students</p>
            </div>
          ) : homeworks.map(hw => (
            <div key={hw.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">{hw.subject}</span>
                    {hw.class_name && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {hw.class_name}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">Due: {hw.due_date}</span>
                    {hw.teacher_name && <span className="text-xs text-gray-400">By: {hw.teacher_name}</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900">{hw.title}</h3>
                  {hw.description && <p className="text-gray-600 text-sm mt-1">{hw.description}</p>}

                  {hw.has_file && hw.file_name && (
                    <button
                      onClick={() => handleDownload(hw)}
                      disabled={downloading === hw.id}
                      className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <span>{FILE_ICONS[hw.file_mime || ''] || '📎'}</span>
                      <span className="truncate max-w-xs">{hw.file_name}</span>
                      <span className="text-xs text-blue-400 flex-shrink-0">
                        {downloading === hw.id ? 'Downloading…' : '↓ Download'}
                      </span>
                    </button>
                  )}
                </div>

                {['teacher', 'admin'].includes(user?.role) && (
                  <button onClick={() => handleDelete(hw.id)}
                    className="text-red-400 hover:text-red-600 text-sm flex-shrink-0">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">Assign Homework</h2>
                <button onClick={resetModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">{error}</div>}

              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
                    <input type="text" value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Due Date *</label>
                    <input type="date" value={form.due_date}
                      onChange={e => setForm({ ...form, due_date: e.target.value })}
                      className="input-field" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Class</label>
                  <select
                    value={form.class_id}
                    onChange={e => setForm({ ...form, class_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">All Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                  <input type="text" value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="input-field" required />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="input-field h-24 resize-none"
                    placeholder="Instructions for students..." />
                </div>

                {/* File upload */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Attach Document <span className="text-gray-400 font-normal">(optional — PDF, Word, PPT, Image — max 5MB)</span>
                  </label>
                  <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}>
                    <span className="text-2xl">{file ? (FILE_ICONS[file.mime] || '📎') : '📎'}</span>
                    <div className="flex-1 min-w-0">
                      {file
                        ? <p className="text-sm font-medium text-green-700 truncate">{file.name}</p>
                        : <p className="text-sm text-gray-500">Click to upload a file</p>
                      }
                    </div>
                    {file && (
                      <button type="button" onClick={e => { e.preventDefault(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                        className="text-gray-400 hover:text-red-500 text-lg leading-none">✕</button>
                    )}
                    <input ref={fileRef} type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                      className="hidden" onChange={handleFileChange} />
                  </label>
                  {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetModal}
                    className="flex-1 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 btn-primary">
                    {saving ? 'Saving...' : 'Assign'}
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

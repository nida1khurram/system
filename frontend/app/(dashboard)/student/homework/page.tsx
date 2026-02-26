'use client';

import { useEffect, useState } from 'react';
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
  class_name: string;
  file_name: string | null;
  file_mime: string | null;
  has_file: boolean;
  created_at: string;
}

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-powerpoint': '📊',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
  'image/png': '🖼️', 'image/jpeg': '🖼️', 'image/jpg': '🖼️',
};

export default function StudentHomework() {
  const router = useRouter();

  const [user, setUser]           = useState<any>(null);
  const [homeworks, setHomeworks] = useState<HW[]>([]);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'student') { router.push(`/${u.role}`); return; }
    setUser(u);

    apiFetch('/api/homework/')
      .then(r => r.json())
      .then(d => setHomeworks(d.homeworks || []))
      .finally(() => setLoading(false));
  }, [router]);

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

  const today    = new Date().toISOString().split('T')[0];
  const upcoming = homeworks.filter(hw => hw.due_date >= today);
  const past     = homeworks.filter(hw => hw.due_date < today);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role={user?.role} userName={user?.name} />
      <main className="max-w-4xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Homework</h1>
          <p className="text-gray-500 text-sm mt-1">Assignments for your class</p>
        </div>

        {homeworks.length === 0 ? (
          <div className="card text-center py-16 text-gray-500">
            <p className="text-5xl mb-3">📚</p>
            <p className="font-medium text-lg">No homework assigned yet</p>
            <p className="text-sm mt-1">Your teacher hasn't posted any assignments</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Upcoming ({upcoming.length})
                </h2>
                <div className="space-y-3">
                  {upcoming.map(hw => (
                    <HWCard key={hw.id} hw={hw} today={today} downloading={downloading} onDownload={handleDownload} />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Past Due ({past.length})
                </h2>
                <div className="space-y-3 opacity-70">
                  {past.map(hw => (
                    <HWCard key={hw.id} hw={hw} today={today} downloading={downloading} onDownload={handleDownload} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function HWCard({ hw, today, downloading, onDownload }: {
  hw: HW; today: string;
  downloading: number | null;
  onDownload: (hw: HW) => void;
}) {
  const isOverdue  = hw.due_date < today;
  const isDueToday = hw.due_date === today;

  return (
    <div className="card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {hw.subject}
          </span>
          {hw.class_name && (
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {hw.class_name}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isOverdue  ? 'bg-red-100 text-red-600' :
            isDueToday ? 'bg-orange-100 text-orange-600' :
                         'bg-green-100 text-green-700'
          }`}>
            {isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : 'Upcoming'} · {hw.due_date}
          </span>
          {hw.teacher_name && (
            <span className="text-xs text-gray-400">By: {hw.teacher_name}</span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900">{hw.title}</h3>
        {hw.description && (
          <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">{hw.description}</p>
        )}

        {hw.has_file && hw.file_name && (
          <button
            onClick={() => onDownload(hw)}
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
    </div>
  );
}

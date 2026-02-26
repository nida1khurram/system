'use client';

import { useState } from 'react';

interface Student {
  id: number;
  name: string;
  rollNumber: string;
}

interface Props {
  students: Student[];
  classId: number;
  teacherId: number;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export default function AttendanceForm({ students, classId, teacherId }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const setStatus = (studentId: number, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status: AttendanceStatus) => {
    const all: Record<number, AttendanceStatus> = {};
    students.forEach((s) => (all[s.id] = status));
    setAttendance(all);
  };

  const handleSubmit = async () => {
    const records = students.map((s) => ({
      studentId: s.id,
      classId,
      date,
      status: attendance[s.id] || 'absent',
      markedBy: teacherId,
    }));

    setLoading(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();
      setMessage(data.success ? `Attendance saved for ${data.count} students` : data.error);
    } catch {
      setMessage('Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<AttendanceStatus, { label: string; color: string }> = {
    present: { label: 'P', color: 'bg-green-100 text-green-700 border-green-300' },
    absent: { label: 'A', color: 'bg-red-100 text-red-700 border-red-300' },
    late: { label: 'L', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    leave: { label: 'LV', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  };

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field w-auto" />
        </div>
        <div className="flex gap-2">
          <span className="text-sm font-medium text-gray-700 self-end mb-2">Mark All:</span>
          {(['present', 'absent'] as AttendanceStatus[]).map((s) => (
            <button key={s} onClick={() => markAll(s)} className="btn-secondary text-sm capitalize">
              {s}
            </button>
          ))}
        </div>
      </div>

      {message && <div className="bg-blue-50 text-blue-700 rounded-lg p-3 mb-4 text-sm">{message}</div>}

      <div className="space-y-2">
        {students.map((student) => {
          const status = attendance[student.id] || 'present';
          return (
            <div key={student.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <span className="font-mono text-sm text-gray-500 w-16">{student.rollNumber}</span>
              <span className="flex-1 font-medium">{student.name}</span>
              <div className="flex gap-1">
                {(['present', 'absent', 'late', 'leave'] as AttendanceStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(student.id, s)}
                    className={`w-10 h-8 text-xs font-bold border rounded transition-all ${
                      status === s ? statusConfig[s].color + ' border-2' : 'bg-white text-gray-400 border-gray-200'
                    }`}
                  >
                    {statusConfig[s].label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={handleSubmit} disabled={loading} className="btn-primary mt-6 px-8">
        {loading ? 'Saving...' : 'Save Attendance'}
      </button>
    </div>
  );
}

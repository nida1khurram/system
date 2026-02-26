'use client';

import { useState } from 'react';

interface Student {
  id: number;
  name: string;
  rollNumber: string;
  email: string;
  className: string;
  grade: string;
  section: string;
  gender: string;
  isActive: boolean;
}

interface StudentTableProps {
  students: Student[];
  onEdit?: (student: Student) => void;
  onDelete?: (id: number) => void;
}

export default function StudentTable({ students, onEdit, onDelete }: StudentTableProps) {
  const [search, setSearch] = useState('');

  const filtered = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber?.includes(search)
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Students ({filtered.length})</h2>
        <input
          type="text"
          placeholder="Search by name or roll number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-xs"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 rounded-l">Roll No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 rounded-r">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No students found</td>
              </tr>
            ) : (
              filtered.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{student.rollNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{student.name}</div>
                    <div className="text-xs text-gray-500">{student.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {student.grade && `Class ${student.grade}`}{student.section && `-${student.section}`}
                  </td>
                  <td className="px-4 py-3 capitalize">{student.gender || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${student.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {student.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {onEdit && (
                        <button onClick={() => onEdit(student)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(student.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Remove</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

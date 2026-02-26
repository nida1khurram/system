'use client';

import { useState, useEffect, useCallback } from 'react';

interface Student {
  id: number;
  name: string;
  email: string;
  rollNumber: string;
  className: string;
  grade: string;
  section: string;
  gender: string;
  isActive: boolean;
}

export function useStudents(classId?: number) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = classId ? `?classId=${classId}` : '';
      const res = await fetch(`/api/students${params}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const createStudent = async (studentData: Record<string, unknown>) => {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchStudents();
    return data.student;
  };

  const deleteStudent = async (id: number) => {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete student');
    await fetchStudents();
  };

  return { students, loading, error, createStudent, deleteStudent, refetch: fetchStudents };
}

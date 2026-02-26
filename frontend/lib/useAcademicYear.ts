import { useEffect, useState } from 'react';
import { apiFetch } from './api';

const CACHE_KEY = '_school_academic_year';

function getCached(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CACHE_KEY) || '';
}

export function useAcademicYear() {
  const [academicYear, setAcademicYearState] = useState<string>(getCached);

  useEffect(() => {
    apiFetch('/api/settings/')
      .then(r => r.json())
      .then(data => {
        if (data.academic_year) {
          setAcademicYearState(data.academic_year);
          try { localStorage.setItem(CACHE_KEY, data.academic_year); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  return academicYear;
}

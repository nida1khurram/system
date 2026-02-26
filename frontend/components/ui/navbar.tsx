'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';

interface NavbarProps {
  role: string;
  userName: string;
}

type NavItem =
  | { href: string; label: string; dropdown?: never }
  | { label: string; dropdown: { href: string; label: string }[]; href?: never };

const ADMIN_BASE_LINKS: NavItem[] = [
  { href: '/admin',          label: 'Dashboard' },
  { href: '/admin/users',    label: 'Users' },
  { href: '/admin/students', label: 'Students' },
  { href: '/admin/teachers', label: 'Teachers' },
  {
    label: 'Fee Management',
    dropdown: [
      { href: '/admin/fees',              label: 'Invoices & Overview' },
      { href: '/admin/fees/collect',       label: 'Collect Fee' },
      { href: '/admin/fees/paid-unpaid',   label: 'Paid / Unpaid' },
      { href: '/admin/fees/yearly-report', label: 'Yearly Report' },
    ],
  },
  { href: '/admin/messages', label: 'Messages' },
  { href: '/admin/settings', label: 'Settings' },
];

const navLinks: Record<string, NavItem[]> = {
  admin: ADMIN_BASE_LINKS,
  teacher: [
    { href: '/teacher', label: 'Dashboard' },
    { href: '/teacher/students', label: 'Students' },
    { href: '/teacher/attendance', label: 'Attendance' },
    { href: '/teacher/marks', label: 'Marks' },
    { href: '/teacher/homework', label: 'Homework' },
  ],
  parent: [
    { href: '/parent', label: 'Dashboard' },
    { href: '/parent/children', label: 'My Children' },
    { href: '/parent/fees', label: 'Fees & Payments' },
    { href: '/parent/homework', label: 'Homework' },
    { href: '/parent/messages', label: 'Messages' },
  ],
  student: [
    { href: '/student', label: 'Dashboard' },
    { href: '/student/results', label: 'Results' },
    { href: '/student/timetable', label: 'Timetable' },
    { href: '/student/homework', label: 'Homework' },
  ],
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-700',
  teacher: 'bg-green-700',
  parent: 'bg-blue-700',
  student: 'bg-orange-600',
};

export default function Navbar({ role, userName }: NavbarProps) {
  const router  = useRouter();
  const bgColor = roleColors[role] || 'bg-gray-700';

  const [schoolName, setSchoolName] = useState('School MS');
  const [logoSrc, setLogoSrc]       = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isGlobalSuperAdmin, setIsGlobalSuperAdmin] = useState(false);
  const [adminPerms, setAdminPerms] = useState<Record<string, boolean>>({
    show_users: true,
    show_students: true,
    show_teachers: true,
    show_fee_management: true,
    show_settings: true,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setIsSuperAdmin(!!u.is_super_admin);
        setIsGlobalSuperAdmin(!!u.is_super_admin && u.school_id == null);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      apiFetch('/api/settings/admin-permissions')
        .then(r => r.json())
        .then(data => setAdminPerms(prev => ({ ...prev, ...data })))
        .catch(() => {});
    }
  }, [role]);

  // Build visible links: for admin role filter by permissions; add Permissions link for super admin
  const links: NavItem[] = (() => {
    if (role !== 'admin') return navLinks[role] || [];

    const base = ADMIN_BASE_LINKS.filter(item => {
      if (isSuperAdmin) return true; // super admin sees everything
      if ('href' in item) {
        if (item.href === '/admin/users')    return adminPerms.show_users    !== false;
        if (item.href === '/admin/students') return adminPerms.show_students !== false;
        if (item.href === '/admin/teachers') return adminPerms.show_teachers !== false;
        if (item.href === '/admin/settings') return adminPerms.show_settings !== false;
      }
      if (item.label === 'Fee Management') return adminPerms.show_fee_management !== false;
      return true; // Dashboard always visible
    });

    if (isGlobalSuperAdmin) {
      return [...base, { href: '/admin/schools', label: '🏫 Schools' }, { href: '/admin/permissions', label: '🔐 Permissions' }];
    }
    if (isSuperAdmin) {
      return [...base, { href: '/admin/permissions', label: '🔐 Permissions' }];
    }
    return base;
  })();

  const fetchSchoolInfo = () => {
    apiFetch('/api/settings/')
      .then(r => r.json())
      .then(data => {
        if (data.school_name) setSchoolName(data.school_name);
        if (data.logo_base64 && data.logo_mime) {
          setLogoSrc(`data:${data.logo_mime};base64,${data.logo_base64}`);
        } else {
          setLogoSrc(null);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSchoolInfo();
    window.addEventListener('school-settings-updated', fetchSchoolInfo);
    return () => window.removeEventListener('school-settings-updated', fetchSchoolInfo);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <nav className={`${bgColor} text-white`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6" ref={dropdownRef}>
            {/* Logo + School Name */}
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              {logoSrc
                ? <img src={logoSrc} alt="Logo" className="w-8 h-8 rounded-full object-contain bg-white/20 p-0.5" />
                : <span className="text-xl">🏫</span>
              }
              <span className="hidden sm:inline">{schoolName}</span>
            </Link>

            <div className="hidden md:flex gap-1 items-center">
              {links.map((item) => {
                if (item.dropdown) {
                  const isOpen = openDropdown === item.label;
                  return (
                    <div key={item.label} className="relative">
                      <button
                        onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isOpen ? 'bg-white/20' : 'hover:bg-white/10'}`}
                      >
                        {item.label}
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                          {item.dropdown
                            .map(sub => (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={() => setOpenDropdown(null)}
                                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                              >
                                {sub.label}
                              </Link>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className="px-3 py-2 rounded-lg hover:bg-white/10 text-sm font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80">{userName}</span>
            <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
              {role === 'admin'
                ? isGlobalSuperAdmin
                  ? 'Super Admin'
                  : isSuperAdmin
                    ? 'Sub Admin'
                    : 'Admin'
                : role.charAt(0).toUpperCase() + role.slice(1)
              }
            </span>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-sm px-3 py-1.5 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

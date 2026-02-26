'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/ui/navbar';

interface Settings {
  school_name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  logo_base64: string | null;
  logo_mime: string | null;
  academic_year: string;
}

interface PaymentSettings {
  jazzcash_merchant_id: string;
  jazzcash_password: string;
  jazzcash_integrity_salt: string;
  jazzcash_is_sandbox: boolean;
  jazzcash_enabled: boolean;
  configured: boolean;
  jazzcash_number: string;
}

export default function AdminSettings() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm]         = useState({ school_name: '', tagline: '', address: '', phone: '', email: '', academic_year: '' });
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoMime, setLogoMime]       = useState<string | null>(null);
  const [removingLogo, setRemovingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Payment settings state
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [payForm, setPayForm] = useState({
    jazzcash_merchant_id: '', jazzcash_password: '', jazzcash_integrity_salt: '',
    jazzcash_is_sandbox: true, jazzcash_enabled: false, jazzcash_number: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paySuccess, setPaySuccess] = useState('');
  const [payError, setPayError] = useState('');

  const loadSettings = async () => {
    const res  = await apiFetch('/api/settings/');
    const data = await res.json();
    setSettings(data);
    setForm({
      school_name:   data.school_name  || '',
      tagline:       data.tagline       || '',
      address:       data.address       || '',
      phone:         data.phone         || '',
      email:         data.email         || '',
      academic_year: data.academic_year || '',
    });
    if (data.logo_base64 && data.logo_mime) {
      setLogoPreview(`data:${data.logo_mime};base64,${data.logo_base64}`);
      setLogoMime(data.logo_mime);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { router.push(`/${u.role}`); return; }
    setUser(u);
    setIsSuperAdmin(!!u.is_super_admin);
    loadSettings();
    if (u.is_super_admin) {
      apiFetch('/api/settings/payment').then(r => r.json()).then(d => {
        setPaymentSettings(d);
        setPayForm({
          jazzcash_merchant_id:    d.jazzcash_merchant_id || '',
          jazzcash_password:       '',  // never pre-fill masked secrets
          jazzcash_integrity_salt: '',
          jazzcash_is_sandbox:     d.jazzcash_is_sandbox,
          jazzcash_enabled:        d.jazzcash_enabled,
          jazzcash_number:         d.jazzcash_number || '',
        });
      }).catch(() => {});
    }
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file (PNG, JPG, etc.)'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // dataUrl = "data:image/png;base64,XXXX..."
      const [meta, base64] = dataUrl.split(',');
      const mime = meta.replace('data:', '').replace(';base64', '');
      setLogoPreview(dataUrl);
      setLogoMime(mime);
      // store separately for save
      (window as any).__pendingLogo = { base64, mime };
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setSaving(true); setError(''); setSuccess('');
    const pending = (window as any).__pendingLogo;
    const payload: any = { ...form };
    if (pending) {
      payload.logo_base64 = pending.base64;
      payload.logo_mime   = pending.mime;
    }
    const res  = await apiFetch('/api/settings/', { method: 'PUT', body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.detail || 'Failed to save'); setSaving(false); return; }
    setSuccess('Settings saved successfully!');
    (window as any).__pendingLogo = null;
    setSaving(false);
    // refresh navbar logo by dispatching storage event
    window.dispatchEvent(new Event('school-settings-updated'));
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRemoveLogo = async () => {
    if (!isSuperAdmin) return;
    if (!confirm('Remove school logo?')) return;
    setRemovingLogo(true);
    await apiFetch('/api/settings/logo', { method: 'DELETE' });
    setLogoPreview(null);
    setLogoMime(null);
    (window as any).__pendingLogo = null;
    if (fileRef.current) fileRef.current.value = '';
    setRemovingLogo(false);
    window.dispatchEvent(new Event('school-settings-updated'));
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true); setPayError(''); setPaySuccess('');
    const payload: any = {
      jazzcash_is_sandbox: payForm.jazzcash_is_sandbox,
      jazzcash_enabled:    payForm.jazzcash_enabled,
      jazzcash_number:     payForm.jazzcash_number,
    };
    if (payForm.jazzcash_merchant_id)    payload.jazzcash_merchant_id    = payForm.jazzcash_merchant_id;
    if (payForm.jazzcash_password)       payload.jazzcash_password       = payForm.jazzcash_password;
    if (payForm.jazzcash_integrity_salt) payload.jazzcash_integrity_salt  = payForm.jazzcash_integrity_salt;
    const res  = await apiFetch('/api/settings/payment', { method: 'PUT', body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setPayError(data.detail || 'Failed to save'); setSavingPayment(false); return; }
    setPaySuccess('JazzCash settings saved!');
    setSavingPayment(false);
    // Refresh to show updated configured status
    apiFetch('/api/settings/payment').then(r => r.json()).then(d => {
      setPaymentSettings(d);
      setPayForm(prev => ({ ...prev, jazzcash_merchant_id: d.jazzcash_merchant_id || '', jazzcash_number: d.jazzcash_number || '' }));
    }).catch(() => {});
    setTimeout(() => setPaySuccess(''), 3000);
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" userName={user?.name || 'Admin'} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          {isSuperAdmin
            ? <p className="text-xs text-purple-600 mt-1">👑 Super Admin — You can edit all settings</p>
            : <p className="text-xs text-orange-500 mt-1">🔒 Read-only — Only Super Admin can edit settings</p>
          }
        </div>

        {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-4 text-sm">{success}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Logo Upload Card */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">School Logo</h2>
            <div className="flex items-start gap-6">
              {/* Preview */}
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="School Logo" className="w-full h-full object-contain" />
                  : <span className="text-4xl">🏫</span>
                }
              </div>
              {/* Controls */}
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">Upload your school logo. Recommended: square PNG or JPG, max 2MB.</p>
                {isSuperAdmin ? (
                  <div className="flex gap-2 flex-wrap">
                    <label className="btn-primary cursor-pointer text-sm py-2 px-4">
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                    {logoPreview && (
                      <button type="button" onClick={handleRemoveLogo} disabled={removingLogo}
                        className="py-2 px-4 border border-red-300 text-red-600 rounded-xl text-sm hover:bg-red-50 transition-colors">
                        {removingLogo ? 'Removing...' : 'Remove Logo'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Super Admin only</p>
                )}
              </div>
            </div>
          </div>

          {/* School Info Card */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">School Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                <input type="text" value={form.school_name}
                  onChange={e => setForm({ ...form, school_name: e.target.value })}
                  className="input-field" disabled={!isSuperAdmin} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tagline / Motto</label>
                <input type="text" value={form.tagline} placeholder="e.g. Excellence in Education"
                  onChange={e => setForm({ ...form, tagline: e.target.value })}
                  className="input-field" disabled={!isSuperAdmin} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={form.phone} placeholder="+92 300 0000000"
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="input-field" disabled={!isSuperAdmin} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} placeholder="school@example.com"
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="input-field" disabled={!isSuperAdmin} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={form.address} placeholder="School address"
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="input-field" disabled={!isSuperAdmin} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input type="text" value={form.academic_year} placeholder="e.g. 2024-25"
                  onChange={e => setForm({ ...form, academic_year: e.target.value })}
                  className="input-field" disabled={!isSuperAdmin} />
              </div>
            </div>
            {isSuperAdmin && (
              <button type="submit" disabled={saving} className="btn-primary mt-5">
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            )}
          </div>
        </form>

        {/* JazzCash Payment Gateway Card — super admin only */}
        {isSuperAdmin && (
          <div className="card mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">JazzCash Payment Gateway</h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure JazzCash so parents can pay fees online</p>
              </div>
              <div className="flex items-center gap-2">
                {paymentSettings?.configured
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Configured</span>
                  : <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Not configured</span>
                }
                {paymentSettings?.jazzcash_enabled
                  ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Enabled</span>
                  : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Disabled</span>
                }
              </div>
            </div>

            {paySuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-3 text-sm">{paySuccess}</div>}
            {payError   && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-3 text-sm">{payError}</div>}

            <form onSubmit={handleSavePayment} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
                <input
                  type="text"
                  value={payForm.jazzcash_merchant_id}
                  onChange={e => setPayForm({ ...payForm, jazzcash_merchant_id: e.target.value })}
                  className="input-field font-mono"
                  placeholder="Your JazzCash Merchant ID"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {paymentSettings?.configured && <span className="text-xs text-gray-400">(leave blank to keep)</span>}
                  </label>
                  <input
                    type="password"
                    value={payForm.jazzcash_password}
                    onChange={e => setPayForm({ ...payForm, jazzcash_password: e.target.value })}
                    className="input-field"
                    placeholder={paymentSettings?.configured ? "••••••••" : "Merchant password"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Integrity Salt {paymentSettings?.configured && <span className="text-xs text-gray-400">(leave blank to keep)</span>}
                  </label>
                  <input
                    type="password"
                    value={payForm.jazzcash_integrity_salt}
                    onChange={e => setPayForm({ ...payForm, jazzcash_integrity_salt: e.target.value })}
                    className="input-field"
                    placeholder={paymentSettings?.configured ? "••••••••" : "Integrity salt key"}
                  />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payForm.jazzcash_is_sandbox}
                    onChange={e => setPayForm({ ...payForm, jazzcash_is_sandbox: e.target.checked })}
                    className="w-4 h-4 rounded accent-purple-600"
                  />
                  <span className="text-sm text-gray-700">Sandbox mode <span className="text-xs text-gray-400">(for testing)</span></span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payForm.jazzcash_enabled}
                    onChange={e => setPayForm({ ...payForm, jazzcash_enabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-green-600"
                  />
                  <span className="text-sm text-gray-700">Enable JazzCash payments</span>
                </label>
              </div>
              {/* Manual JazzCash number */}
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  JazzCash Number <span className="text-xs text-gray-400 font-normal">(for manual transfers — no merchant account needed)</span>
                </label>
                <input
                  type="tel"
                  value={payForm.jazzcash_number}
                  onChange={e => setPayForm({ ...payForm, jazzcash_number: e.target.value })}
                  className="input-field"
                  placeholder="03XX-XXXXXXX"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Parents will see this number and manually transfer fees. They submit the transaction ID for your verification.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <strong>How to get merchant credentials:</strong> Log in to{' '}
                <span className="font-mono">sandbox.jazzcash.com.pk</span> (sandbox) or{' '}
                <span className="font-mono">payments.jazzcash.com.pk</span> (production) merchant portal and copy your Merchant ID, Password, and Integrity Salt.
              </div>
              <button type="submit" disabled={savingPayment} className="btn-primary">
                {savingPayment ? 'Saving...' : 'Save JazzCash Settings'}
              </button>
            </form>
          </div>
        )}

        {/* Account Card */}
        <div className="card mt-4">
          <h2 className="font-semibold text-gray-800 mb-2">Account</h2>
          <p className="text-sm text-gray-500 mb-1">Logged in as: <span className="font-medium">{user.email}</span></p>
          <p className="text-sm text-gray-500 mb-3">Role: <span className="font-medium capitalize">{user.role}{isSuperAdmin ? ' (Super Admin)' : ''}</span></p>
          <button className="text-red-600 text-sm hover:underline" onClick={() => {
            localStorage.clear();
            document.cookie = 'auth_token=; path=/; max-age=0';
            router.push('/login');
          }}>Logout</button>
        </div>
      </main>
    </div>
  );
}

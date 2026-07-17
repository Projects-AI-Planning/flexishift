import { useCallback, useEffect, useState } from 'react';
import haulierService from '../../api/haulierService';

type HaulierProfile = {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
  profileComplete?: boolean;
  isVerified?: boolean;
  profile?: {
    photoUrl?: string | null;
    companyName?: string | null;
    companyAddress?: string | null;
    coverageArea?: string | null;
    vehicleType?: string | null;
    vehicleRegistration?: string | null;
    licenceNumber?: string | null;
  } | null;
};

export default function HaulierProfilePage() {
  const [profile, setProfile] = useState<HaulierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await haulierService.getMe();
      setProfile(data);
      setError(null);
    } catch {
      setError('Failed to load profile from the backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const updateField = (field: string, value: string) => {
    setProfile((current) => {
      if (!current) return current;
      if (field === 'name' || field === 'phone') {
        return { ...current, [field]: value };
      }
      return {
        ...current,
        profile: {
          ...(current.profile ?? {}),
          [field]: value,
        },
      };
    });
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await haulierService.updateProfile({
        name: profile.name,
        phone: profile.phone ?? '',
        companyName: profile.profile?.companyName ?? '',
        companyAddress: profile.profile?.companyAddress ?? '',
        coverageArea: profile.profile?.coverageArea ?? '',
        vehicleType: profile.profile?.vehicleType ?? '',
        vehicleRegistration: profile.profile?.vehicleRegistration ?? '',
        licenceNumber: profile.profile?.licenceNumber ?? '',
      });
      await fetchProfile();
    } catch {
      setError('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      await haulierService.uploadProfilePhoto(file);
      await fetchProfile();
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: string; detail?: string } } };
      const message = response.response?.data?.message || response.response?.data?.detail;
      setError(message ? `Failed to upload profile photo: ${message}` : 'Failed to upload profile photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Haulier Settings</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Profile</h1>
        <p className="text-on-surface-variant font-medium">Update your haulier account details using the backend profile service.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[#1066b1]/100 text-2xl font-black text-white">
              {profile?.name?.charAt(0) || 'H'}
            </div>
            <div>
              <h2 className="text-xl font-black text-primary">{profile?.name ?? 'Haulier account'}</h2>
              <p className="text-sm font-bold text-slate-500">{profile?.email}</p>
              <p className="text-xs font-black uppercase tracking-widest text-[#1066b1]">
                {profile?.profileComplete ? 'Profile Complete' : 'Profile Incomplete'}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Photo</span>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadPhoto(file);
                }}
                className="block w-full text-sm text-[#44474C] file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-widest file:text-white"
              />
            </label>
            <p className="text-xs text-slate-500">
              {uploading ? 'Uploading photo...' : 'Upload a new profile photo to the backend storage.'}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</span>
              <input
                value={profile?.name ?? ''}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</span>
              <input
                value={profile?.email ?? ''}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Phone</span>
              <input
                value={profile?.phone ?? ''}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Company Name</span>
              <input
                value={profile?.profile?.companyName ?? ''}
                onChange={(e) => updateField('companyName', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Company Address</span>
              <input
                value={profile?.profile?.companyAddress ?? ''}
                onChange={(e) => updateField('companyAddress', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Coverage Area</span>
              <input
                value={profile?.profile?.coverageArea ?? ''}
                onChange={(e) => updateField('coverageArea', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle Type</span>
              <input
                value={profile?.profile?.vehicleType ?? ''}
                onChange={(e) => updateField('vehicleType', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle Registration</span>
              <input
                value={profile?.profile?.vehicleRegistration ?? ''}
                onChange={(e) => updateField('vehicleRegistration', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Licence Number</span>
              <input
                value={profile?.profile?.licenceNumber ?? ''}
                onChange={(e) => updateField('licenceNumber', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-xs font-medium text-slate-500">
              Data is saved through `PUT /profile/update`.
            </p>
            <button
              onClick={() => void saveProfile()}
              disabled={saving || loading}
              className="rounded-xl bg-primary px-6 py-3 text-xs font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

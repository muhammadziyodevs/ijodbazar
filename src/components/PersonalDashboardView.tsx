import { useMemo, useState } from 'react';
import {
  Check,
  Download,
  Eye,
  FolderOpen,
  Globe,
  HardDrive,
  Heart,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  CATEGORY_LABELS,
  type UserPrivate,
  type WorkItem,
} from '../types';
import { formatBytes, formatDate } from '../utils/fileHelpers';
import { UserAvatar } from './UserAvatar';

interface PersonalDashboardViewProps {
  profile: UserPrivate | null;
  myWorks: WorkItem[];
  loading: boolean;
  downloadingId: string | null;
  onUpdateProfile: (displayName: string, bio: string) => Promise<void>;
  onOpenDetail: (work: WorkItem) => void;
  onDownload: (work: WorkItem) => void;
  onToggleVisibility: (work: WorkItem) => Promise<void>;
  onDeleteWork: (work: WorkItem) => Promise<void>;
  onGoToUpload: () => void;
}

export function PersonalDashboardView({
  profile,
  myWorks,
  loading,
  downloadingId,
  onUpdateProfile,
  onOpenDetail,
  onDownload,
  onToggleVisibility,
  onDeleteWork,
  onGoToUpload,
}: PersonalDashboardViewProps) {
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.displayName ?? '');
  const [bioInput, setBioInput] = useState(profile?.bio ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [busyWorkId, setBusyWorkId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalFiles = myWorks.length;
    const totalBytes = myWorks.reduce((sum, w) => sum + w.fileSize, 0);
    const publicCount = myWorks.filter((w) => w.visibility === 'public').length;
    const totalLikes = myWorks.reduce((sum, w) => sum + w.likesCount, 0);
    return { totalFiles, totalBytes, publicCount, totalLikes };
  }, [myWorks]);

  const filteredWorks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myWorks.filter((item) => {
      if (visibilityFilter !== 'all' && item.visibility !== visibilityFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q) ||
        CATEGORY_LABELS[item.category].toLowerCase().includes(q)
      );
    });
  }, [myWorks, search, visibilityFilter]);

  const startEditProfile = () => {
    setNameInput(profile?.displayName ?? '');
    setBioInput(profile?.bio ?? '');
    setProfileNotice(null);
    setEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    try {
      await onUpdateProfile(nameInput, bioInput);
      setEditingProfile(false);
      setProfileNotice('Profil ma’lumotlari saqlandi.');
    } catch (err) {
      setProfileNotice(err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggle = async (work: WorkItem) => {
    setBusyWorkId(work.id);
    try {
      await onToggleVisibility(work);
    } finally {
      setBusyWorkId(null);
    }
  };

  const handleDelete = async (work: WorkItem) => {
    setBusyWorkId(work.id);
    try {
      await onDeleteWork(work);
      setConfirmDeleteId(null);
    } finally {
      setBusyWorkId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Shaxsiy kabinet
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Siz yuklagan barcha fayllar, saqlash statistikasi va profil sozlamalari.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToUpload}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yangi fayl yuklash
        </button>
      </div>

      {/* 4-column KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Yuklangan fayllar</span>
            <FolderOpen className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{stats.totalFiles}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Band qilingan hajm</span>
            <HardDrive className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatBytes(stats.totalBytes)}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Hamjamiyatda ochiq</span>
            <Globe className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{stats.publicCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Olingan layklar</span>
            <Heart className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{stats.totalLikes}</p>
        </div>
      </div>

      {/* Profile section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {!editingProfile ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <UserAvatar
                src={profile?.photoURL}
                name={profile?.displayName || 'Foydalanuvchi'}
                size="lg"
              />
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 truncate">
                  {profile?.displayName || 'Foydalanuvchi'}
                </h2>
                <p className="text-xs font-mono text-slate-500 truncate">{profile?.email}</p>
                <p className="text-sm text-slate-600 mt-1">
                  {profile?.bio ? profile.bio : 'O‘zingiz haqingizda qisqacha ma’lumot qo‘shishingiz mumkin.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {profileNotice && (
                <span className="text-xs text-emerald-700 font-medium">{profileNotice}</span>
              )}
              <button
                type="button"
                onClick={startEditProfile}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Profilni tahrirlash
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Ko‘rinadigan ism
                </label>
                <input
                  type="text"
                  required
                  maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Qisqacha bio ({bioInput.length}/{BLUEPRINT_LIMITS.BIO_MAX})
                </label>
                <input
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.BIO_MAX}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Masalan: UI/UX dizayner va dasturchi"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {savingProfile ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Personal Files Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Shaxsiy fayllardan qidirish..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setVisibilityFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                visibilityFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hammasi
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter('public')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                visibilityFilter === 'public' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ochiq
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter('private')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                visibilityFilter === 'private' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shaxsiy
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {myWorks.length === 0
                ? 'Shaxsiy kabinetingizda hali fayl yo‘q'
                : 'Filtrga mos fayl topilmadi'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {myWorks.length === 0
                ? 'Birinchi ishingizni yuklash uchun Admin panelga o‘ting.'
                : 'Boshqa kalit so‘z yoki holatni tanlang.'}
            </p>
            {myWorks.length === 0 && (
              <button
                type="button"
                onClick={onGoToUpload}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Birinchi faylni yuklash
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Ish va fayl nomi</th>
                  <th className="py-3 px-4">Bo‘lim</th>
                  <th className="py-3 px-4">Holati</th>
                  <th className="py-3 px-4 text-right">Hajmi</th>
                  <th className="py-3 px-4 text-right">Layk</th>
                  <th className="py-3 px-4 text-right">Sana</th>
                  <th className="py-3 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredWorks.map((work) => (
                  <tr key={work.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(work)}
                        className="font-medium text-slate-900 hover:text-blue-600 text-left truncate block max-w-full cursor-pointer"
                      >
                        {work.title}
                      </button>
                      <span className="text-xs font-mono text-slate-500 truncate block">
                        {work.fileName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {CATEGORY_LABELS[work.category]}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        disabled={busyWorkId === work.id}
                        onClick={() => handleToggle(work)}
                        title="Holatni almashtirish"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 cursor-pointer disabled:opacity-50"
                      >
                        {work.visibility === 'public' ? (
                          <>
                            <Globe className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ochiq</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Shaxsiy</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatBytes(work.fileSize)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {work.likesCount}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatDate(work.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenDetail(work)}
                          title="Ko‘rish"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownload(work)}
                          disabled={downloadingId === work.id}
                          title="Yuklab olish"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-md cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === work.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(work)}
                              disabled={busyWorkId === work.id}
                              className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer"
                            >
                              O‘chirish
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md cursor-pointer"
                            >
                              Yo‘q
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(work.id)}
                            title="O‘chirish"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

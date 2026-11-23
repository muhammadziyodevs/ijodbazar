import { useMemo, useState } from 'react';
import { Globe, Plus, Search } from 'lucide-react';
import { CATEGORY_LABELS, type WorkCategory, type WorkItem } from '../types';
import { WorkCard } from './WorkCard';

interface CommunityViewProps {
  works: WorkItem[];
  loading: boolean;
  currentUserId: string;
  likedWorkIds: Set<string>;
  downloadingId: string | null;
  onOpenDetail: (work: WorkItem) => void;
  onToggleLike: (work: WorkItem) => void;
  onDownload: (work: WorkItem) => void;
  onGoToUpload: () => void;
}

type CategoryFilter = 'all' | WorkCategory;
type SortMode = 'newest' | 'popular';

export function CommunityView({
  works,
  loading,
  currentUserId,
  likedWorkIds,
  downloadingId,
  onOpenDetail,
  onToggleLike,
  onDownload,
  onGoToUpload,
}: CommunityViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [authorScope, setAuthorScope] = useState<'all' | 'mine' | 'others'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const filteredWorks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return works
      .filter((item) => {
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        if (authorScope === 'mine' && item.authorId !== currentUserId) return false;
        if (authorScope === 'others' && item.authorId === currentUserId) return false;
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.authorName.toLowerCase().includes(q) ||
          item.fileName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortMode === 'popular') {
          return b.likesCount - a.likesCount;
        }
        const tA = a.createdAt?.toMillis() ?? 0;
        const tB = b.createdAt?.toMillis() ?? 0;
        return tB - tA;
      });
  }, [works, search, categoryFilter, authorScope, sortMode, currentUserId]);

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'Barchasi' },
    { key: 'design', label: CATEGORY_LABELS.design },
    { key: 'code', label: CATEGORY_LABELS.code },
    { key: 'document', label: CATEGORY_LABELS.document },
    { key: 'media', label: CATEGORY_LABELS.media },
    { key: 'other', label: CATEGORY_LABELS.other },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hamjamiyat postlari
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Sizning ochiq ishlaringiz va boshqa foydalanuvchilar tomonidan ulashilgan fayllar.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAuthorScope('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              authorScope === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Barcha mualliflar
          </button>
          <button
            type="button"
            onClick={() => setAuthorScope('mine')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              authorScope === 'mine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mening postlarim
          </button>
          <button
            type="button"
            onClick={() => setAuthorScope('others')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              authorScope === 'others' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Boshqalar
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ish nomi, muallif yoki fayl bo‘yicha qidirish..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-full">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryFilter(cat.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === cat.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="Saralash tartibi"
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="newest">Eng yangi</option>
            <option value="popular">Eng ko‘p layklar</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-slate-100" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredWorks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Hozircha mos postlar topilmadi
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            {works.length === 0
              ? 'Hamjamiyatda hali hech qanday ochiq ish joylanmagan. Birinchi bo‘lib o‘z ishingizni yuklang.'
              : 'Qidiruv yoki filtr shartlarini o‘zgartirib ko‘ring.'}
          </p>
          <button
            type="button"
            onClick={onGoToUpload}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Admin paneldan ish yuklash
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredWorks.map((work) => (
            <WorkCard
              key={work.id}
              work={work}
              isLiked={likedWorkIds.has(work.id)}
              isOwner={work.authorId === currentUserId}
              downloading={downloadingId === work.id}
              onOpenDetail={onOpenDetail}
              onToggleLike={onToggleLike}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import {
  Code2,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileText,
  Globe,
  Heart,
  Image as ImageIcon,
  Lock,
  Palette,
} from 'lucide-react';
import { CATEGORY_LABELS, type WorkCategory, type WorkItem } from '../types';
import { formatBytes, formatDate } from '../utils/fileHelpers';
import { UserAvatar } from './UserAvatar';

interface WorkCardProps {
  work: WorkItem;
  isLiked: boolean;
  isOwner: boolean;
  downloading: boolean;
  onOpenDetail: (work: WorkItem) => void;
  onToggleLike: (work: WorkItem) => void;
  onDownload: (work: WorkItem) => void;
}

function CategoryIcon({ category }: { category: WorkCategory }) {
  switch (category) {
    case 'design':
      return <Palette className="w-8 h-8 text-slate-400" />;
    case 'code':
      return <Code2 className="w-8 h-8 text-slate-400" />;
    case 'document':
      return <FileText className="w-8 h-8 text-slate-400" />;
    case 'media':
      return <ImageIcon className="w-8 h-8 text-slate-400" />;
    default:
      return <FileArchive className="w-8 h-8 text-slate-400" />;
  }
}

export function WorkCard({
  work,
  isLiked,
  isOwner,
  downloading,
  onOpenDetail,
  onToggleLike,
  onDownload,
}: WorkCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-colors hover:border-slate-300">
      <button
        type="button"
        onClick={() => onOpenDetail(work)}
        className="relative aspect-[4/3] w-full bg-slate-100 border-b border-slate-200 overflow-hidden text-left cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        {work.previewDataUrl && !imgError ? (
          <img
            src={work.previewDataUrl}
            alt={work.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <CategoryIcon category={work.category} />
            <span className="mt-3 text-xs font-mono text-slate-600 truncate max-w-full px-3">
              {work.fileName}
            </span>
          </div>
        )}
      </button>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <span className="font-medium text-slate-700">{CATEGORY_LABELS[work.category]}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{formatBytes(work.fileSize)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDate(work.createdAt)}</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenDetail(work)}
            className="text-left w-full cursor-pointer group"
          >
            <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {work.title}
            </h3>
          </button>

          {work.description ? (
            <p className="text-sm text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
              {work.description}
            </p>
          ) : (
            <p className="text-xs font-mono text-slate-500 mt-1.5 truncate">
              {work.fileName}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar src={work.authorPhotoURL} name={work.authorName} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">
                {work.authorName}
                {isOwner ? ' (Siz)' : ''}
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                {work.visibility === 'public' ? (
                  <>
                    <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Ochiq post</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Shaxsiy</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleLike(work)}
              aria-label={isLiked ? 'Laykni olib tashlash' : 'Layk bosish'}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors tabular-nums whitespace-nowrap shrink-0 cursor-pointer ${
                isLiked
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-600' : ''}`} />
              <span>{work.likesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenDetail(work)}
              title="Ko‘rish"
              aria-label="Ishni ko‘rish"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDownload(work)}
              disabled={downloading}
              title="Faylni yuklab olish"
              aria-label="Faylni yuklab olish"
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {work.externalUrl && (
              <a
                href={work.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Tashqi havola"
                aria-label="Tashqi havolani ochish"
                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  Globe,
  Heart,
  Lock,
  MessageSquare,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { BLUEPRINT_LIMITS, CATEGORY_LABELS, type WorkComment, type WorkItem } from '../types';
import {
  chunksToBlob,
  decodeChunksToText,
  formatBytes,
  formatDateTime,
  isTextPreviewable,
  triggerFileDownload,
} from '../utils/fileHelpers';
import { fetchWorkChunks } from '../services/worksService';
import { UserAvatar } from './UserAvatar';

interface WorkDetailModalProps {
  work: WorkItem | null;
  currentUserId: string;
  isPlatformAdmin: boolean;
  isLiked: boolean;
  onClose: () => void;
  onToggleLike: (work: WorkItem) => void;
  onAddComment: (work: WorkItem, text: string) => Promise<void>;
  onDeleteComment: (workId: string, commentId: string) => Promise<void>;
}

export function WorkDetailModal({
  work,
  currentUserId,
  isPlatformAdmin,
  isLiked,
  onClose,
  onToggleLike,
  onAddComment,
  onDeleteComment,
}: WorkDetailModalProps) {
  const [chunks, setChunks] = useState<string[] | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [comments, setComments] = useState<WorkComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    if (!work) return;
    let active = true;
    let createdUrl: string | null = null;

    setChunks(null);
    setObjectUrl(null);
    setTextPreview(null);
    setFileError(null);
    setLoadingFile(true);

    fetchWorkChunks(work.id, work.chunkCount)
      .then((loadedChunks) => {
        if (!active) return;
        setChunks(loadedChunks);

        if (loadedChunks.length > 0) {
          if (isTextPreviewable(work.mimeType, work.fileName)) {
            setTextPreview(decodeChunksToText(loadedChunks));
          } else if (
            work.mimeType.startsWith('image/') ||
            work.mimeType === 'application/pdf' ||
            work.mimeType.startsWith('audio/') ||
            work.mimeType.startsWith('video/')
          ) {
            const blob = chunksToBlob(loadedChunks, work.mimeType);
            createdUrl = URL.createObjectURL(blob);
            setObjectUrl(createdUrl);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setFileError(err instanceof Error ? err.message : 'Faylni yuklashda xatolik.');
      })
      .finally(() => {
        if (active) setLoadingFile(false);
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [work]);

  useEffect(() => {
    if (!work) {
      setComments([]);
      return;
    }

    const commentsPath = `works/${work.id}/comments`;
    const q = query(collection(db, 'works', work.id, 'comments'), orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WorkComment);
        setComments(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, commentsPath);
      }
    );

    return () => unsub();
  }, [work]);

  if (!work) return null;

  const handleDownload = () => {
    if (!chunks) return;
    triggerFileDownload(chunks, work.fileName, work.mimeType);
  };

  const handleCopyText = async () => {
    if (!textPreview) return;
    await navigator.clipboard.writeText(textPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      await onAddComment(work, commentText.trim());
      setCommentText('');
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[1px] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={work.title}
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{CATEGORY_LABELS[work.category]}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatBytes(work.fileSize)}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                {work.visibility === 'public' ? (
                  <>
                    <Globe className="w-3 h-3 text-emerald-600" />
                    <span>Ochiq</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>Shaxsiy</span>
                  </>
                )}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 truncate mt-0.5">
              {work.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleLike(work)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors tabular-nums cursor-pointer ${
                isLiked
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-600' : ''}`} />
              <span>{work.likesCount}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={loadingFile || !chunks}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Yuklab olish
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Author Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <UserAvatar src={work.authorPhotoURL} name={work.authorName} size="md" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{work.authorName}</p>
                <p className="text-xs text-slate-500 tabular-nums">{formatDateTime(work.createdAt)}</p>
              </div>
            </div>

            {work.externalUrl && (
              <a
                href={work.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Tashqi havolani ochish
              </a>
            )}
          </div>

          {work.description && (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {work.description}
            </p>
          )}

          {/* File Preview Area */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-700 truncate">{work.fileName}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-500 font-mono">{work.mimeType}</span>
                {textPreview !== null && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Nusxalandi' : 'Nusxalash'}</span>
                  </button>
                )}
              </div>
            </div>

            {loadingFile ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Fayl Firebase’dan yuklanmoqda...
              </div>
            ) : fileError ? (
              <div className="p-8 text-center text-sm text-red-600">{fileError}</div>
            ) : objectUrl && work.mimeType.startsWith('image/') ? (
              <div className="p-4 flex justify-center bg-slate-100">
                <img
                  src={objectUrl}
                  alt={work.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[420px] w-auto rounded-lg object-contain"
                />
              </div>
            ) : objectUrl && work.mimeType === 'application/pdf' ? (
              <iframe
                src={objectUrl}
                title={work.fileName}
                className="w-full h-[420px] bg-white"
              />
            ) : objectUrl && work.mimeType.startsWith('audio/') ? (
              <div className="p-8 flex justify-center">
                <audio controls src={objectUrl} className="w-full max-w-md" />
              </div>
            ) : objectUrl && work.mimeType.startsWith('video/') ? (
              <div className="p-4 bg-slate-950 flex justify-center">
                <video controls src={objectUrl} className="max-h-[420px] w-full" />
              </div>
            ) : textPreview !== null ? (
              <pre className="p-4 text-xs font-mono text-slate-800 overflow-x-auto max-h-[380px] leading-relaxed bg-slate-50">
                {textPreview}
              </pre>
            ) : (
              <div className="p-10 text-center space-y-2">
                {work.category === 'code' ? (
                  <FileCode2 className="w-8 h-8 text-slate-400 mx-auto" />
                ) : (
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                )}
                <p className="text-sm font-medium text-slate-800">
                  Ushbu fayl turi uchun brauzerda ko‘rib chiqish mavjud emas
                </p>
                <p className="text-xs text-slate-500">
                  Yuqoridagi “Yuklab olish” tugmasi orqali asl faylni saqlab olishingiz mumkin.
                </p>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="pt-2 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>Izohlar ({comments.length})</span>
            </div>

            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.COMMENT_MAX}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Fikr yoki savolingizni yozing..."
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <button
                type="submit"
                disabled={sendingComment || !commentText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Yuborish
              </button>
            </form>

            {comments.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                Hali izohlar qoldirilmagan. Birinchi bo‘lib fikr bildiring.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                {comments.map((c) => {
                  const canDelete =
                    c.authorId === currentUserId ||
                    work.authorId === currentUserId ||
                    isPlatformAdmin;
                  return (
                    <li key={c.id} className="p-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <UserAvatar src={c.authorPhotoURL} name={c.authorName} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-900">{c.authorName}</span>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="text-slate-500 tabular-nums">
                              {formatDateTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-1 break-words">{c.text}</p>
                        </div>
                      </div>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void onDeleteComment(work.id, c.id)}
                          aria-label="Izohni o‘chirish"
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

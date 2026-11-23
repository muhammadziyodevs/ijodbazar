import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileUp,
  Globe,
  Lock,
  Pencil,
  ShieldAlert,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  CATEGORY_LABELS,
  type WorkCategory,
  type WorkItem,
  type WorkVisibility,
} from '../types';
import { detectCategoryFromFile, formatBytes, formatDate } from '../utils/fileHelpers';

interface AdminUploadPanelProps {
  myWorks: WorkItem[];
  allPublicWorks: WorkItem[];
  isPlatformAdmin: boolean;
  onUploadWork: (payload: {
    file: File;
    title: string;
    description: string;
    category: WorkCategory;
    visibility: WorkVisibility;
    externalUrl: string;
    onProgress: (done: number, total: number) => void;
  }) => Promise<void>;
  onUpdateWork: (
    workId: string,
    patch: {
      title: string;
      description: string;
      category: WorkCategory;
      visibility: WorkVisibility;
      externalUrl: string;
    }
  ) => Promise<void>;
  onDeleteWork: (work: WorkItem) => Promise<void>;
  onOpenDetail: (work: WorkItem) => void;
}

export function AdminUploadPanel({
  myWorks,
  allPublicWorks,
  isPlatformAdmin,
  onUploadWork,
  onUpdateWork,
  onDeleteWork,
  onOpenDetail,
}: AdminUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WorkCategory>('design');
  const [visibility, setVisibility] = useState<WorkVisibility>('public');
  const [externalUrl, setExternalUrl] = useState('');

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Inline edit state
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<WorkCategory>('design');
  const [editVisibility, setEditVisibility] = useState<WorkVisibility>('public');
  const [editExternalUrl, setEditExternalUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleFileChosen = (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (file.size > BLUEPRINT_LIMITS.SAFE_UPLOAD_FILE_BYTES) {
      setErrorMsg(
        `Fayl juda katta (${formatBytes(file.size)}). Maksimal hajm: ${formatBytes(BLUEPRINT_LIMITS.SAFE_UPLOAD_FILE_BYTES)}.`
      );
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      setTitle(baseName.slice(0, BLUEPRINT_LIMITS.TITLE_MAX));
    }
    setCategory(detectCategoryFromFile(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFileChosen(file);
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Iltimos, avval yuklanadigan faylni tanlang.');
      return;
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < BLUEPRINT_LIMITS.TITLE_MIN) {
      setErrorMsg(`Sarlavha kamida ${BLUEPRINT_LIMITS.TITLE_MIN} ta belgidan iborat bo‘lishi kerak.`);
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setUploading(true);
    setProgress({ done: 0, total: 1 });

    try {
      await onUploadWork({
        file: selectedFile,
        title: trimmedTitle,
        description: description.trim(),
        category,
        visibility,
        externalUrl: externalUrl.trim(),
        onProgress: (done, total) => setProgress({ done, total }),
      });

      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setExternalUrl('');
      setCategory('design');
      setVisibility('public');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSuccessMsg('Ish va fayl Firebase omboriga muvaffaqiyatli saqlandi.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Yuklashda xatolik yuz berdi.');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const startEditWork = (work: WorkItem) => {
    setEditingWork(work);
    setEditTitle(work.title);
    setEditDesc(work.description);
    setEditCategory(work.category);
    setEditVisibility(work.visibility);
    setEditExternalUrl(work.externalUrl);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWork) return;
    setSavingEdit(true);
    try {
      await onUpdateWork(editingWork.id, {
        title: editTitle,
        description: editDesc,
        category: editCategory,
        visibility: editVisibility,
        externalUrl: editExternalUrl,
      });
      setEditingWork(null);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Admin panel — Ishlarni yuklash va boshqarish
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Qilgan ishlaringiz va fayllaringizni Firebase’ga yuklang, shaxsiy saqlang yoki hamjamiyatga chiqaring.
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Yangi ish yoki fayl yuklash
        </h2>

        <form onSubmit={handleSubmitUpload} className="space-y-5">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-blue-600 bg-blue-50/50'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileChosen(e.target.files?.[0])}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileUp className="w-8 h-8 text-blue-600" />
                <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                <p className="text-xs font-mono text-slate-500 tabular-nums">
                  {formatBytes(selectedFile.size)} · {selectedFile.type || 'fayl'}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Boshqa fayl tanlash
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="w-9 h-9 text-slate-400" />
                <p className="text-sm font-medium text-slate-800">
                  Faylni bu yerga tashlang yoki kompyuterdan tanlang
                </p>
                <p className="text-xs text-slate-500">
                  Rasm, PDF, kod, hujjat yoki arxiv fayllari (maksimal {formatBytes(BLUEPRINT_LIMITS.SAFE_UPLOAD_FILE_BYTES)})
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Ish sarlavhasi *
              </label>
              <input
                type="text"
                required
                minLength={BLUEPRINT_LIMITS.TITLE_MIN}
                maxLength={BLUEPRINT_LIMITS.TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Mobil ilova interfeysi maketi"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Bo‘lim
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as WorkCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Tavsif ({description.length}/{BLUEPRINT_LIMITS.DESCRIPTION_MAX})
            </label>
            <textarea
              rows={3}
              maxLength={BLUEPRINT_LIMITS.DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bajarilgan ish haqida qisqacha izoh, texnologiyalar yoki qo‘shimcha ma’lumot..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Ko‘rinish holati
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    visibility === 'public'
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Hamjamiyatga chiqarish
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    visibility === 'private'
                      ? 'bg-amber-50 border-amber-600 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Faqat shaxsiy
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Tashqi havola (ixtiyoriy — GitHub, Figma, Demo)
              </label>
              <input
                type="url"
                maxLength={BLUEPRINT_LIMITS.EXTERNAL_URL_MAX}
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {progress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Firebase’ga yuklanmoqda...</span>
                <span className="font-mono tabular-nums">
                  {progress.done}/{progress.total} qism
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-200"
                  style={{
                    width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              {uploading ? 'Yuklanmoqda...' : 'Firebase’ga saqlash'}
            </button>
          </div>
        </form>
      </div>

      {/* Edit modal/panel if active */}
      {editingWork && (
        <div className="bg-white border border-blue-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              Ish ma’lumotlarini tahrirlash
            </h3>
            <button
              type="button"
              onClick={() => setEditingWork(null)}
              className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sarlavha</label>
                <input
                  type="text"
                  required
                  minLength={BLUEPRINT_LIMITS.TITLE_MIN}
                  maxLength={BLUEPRINT_LIMITS.TITLE_MAX}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Bo‘lim</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as WorkCategory)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tavsif</label>
              <textarea
                rows={2}
                maxLength={BLUEPRINT_LIMITS.DESCRIPTION_MAX}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Holat</label>
                <select
                  value={editVisibility}
                  onChange={(e) => setEditVisibility(e.target.value as WorkVisibility)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="public">Hamjamiyatda ochiq</option>
                  <option value="private">Faqat shaxsiy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tashqi havola</label>
                <input
                  type="url"
                  maxLength={BLUEPRINT_LIMITS.EXTERNAL_URL_MAX}
                  value={editExternalUrl}
                  onChange={(e) => setEditExternalUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingEdit}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                {savingEdit ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}
              </button>
              <button
                type="button"
                onClick={() => setEditingWork(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Uploaded Works Management Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Mening yuklagan ishlarim ({myWorks.length})
          </h2>
        </div>

        {myWorks.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Hali birorta ham ish yuklanmagan. Yuqoridagi forma orqali birinchi faylingizni yuklang.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Sarlavha</th>
                  <th className="py-3 px-4">Bo‘lim</th>
                  <th className="py-3 px-4">Holati</th>
                  <th className="py-3 px-4 text-right">Hajmi</th>
                  <th className="py-3 px-4 text-right">Sana</th>
                  <th className="py-3 px-4 text-right">Boshqarish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {myWorks.map((work) => (
                  <tr key={work.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-medium text-slate-900 truncate">{work.title}</p>
                      <p className="text-xs font-mono text-slate-500 truncate">{work.fileName}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {CATEGORY_LABELS[work.category]}
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {work.visibility === 'public' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <Globe className="w-3.5 h-3.5" />
                          Ochiq
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <Lock className="w-3.5 h-3.5" />
                          Shaxsiy
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatBytes(work.fileSize)}
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
                          className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditWork(work)}
                          title="Tahrirlash"
                          className="p-1.5 text-slate-600 hover:text-blue-600 border border-slate-200 rounded-md cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === work.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                void onDeleteWork(work);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md cursor-pointer"
                            >
                              Tasdiqlash
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md cursor-pointer"
                            >
                              Bekor
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(work.id)}
                            title="O‘chirish"
                            className="p-1.5 text-slate-500 hover:text-red-600 border border-slate-200 rounded-md cursor-pointer"
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

      {/* Platform Admin Moderation Section */}
      {isPlatformAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Hamjamiyat moderatsiyasi ({allPublicWorks.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Post</th>
                  <th className="py-3 px-4">Muallif</th>
                  <th className="py-3 px-4">Bo‘lim</th>
                  <th className="py-3 px-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {allPublicWorks.map((work) => (
                  <tr key={work.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(work)}
                        className="font-medium text-slate-900 hover:text-blue-600 cursor-pointer"
                      >
                        {work.title}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{work.authorName}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{CATEGORY_LABELS[work.category]}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => void onDeleteWork(work)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        O‘chirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

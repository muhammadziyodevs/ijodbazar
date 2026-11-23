import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import {
  FolderKanban,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  ADMIN_EMAIL,
  type UserPrivate,
  type WorkCategory,
  type WorkItem,
  type WorkspaceTab,
  type WorkVisibility,
} from './types';
import {
  addWorkComment,
  deleteWorkAndChunks,
  deleteWorkComment,
  fetchWorkChunks,
  syncUserProfiles,
  toggleWorkLike,
  toggleWorkVisibility,
  updateUserBioAndName,
  updateWorkMetadata,
  uploadWorkWithChunks,
} from './services/worksService';
import { triggerFileDownload } from './utils/fileHelpers';
import { AuthGate } from './components/AuthGate';
import { CommunityView } from './components/CommunityView';
import { PersonalDashboardView } from './components/PersonalDashboardView';
import { AdminUploadPanel } from './components/AdminUploadPanel';
import { WorkDetailModal } from './components/WorkDetailModal';
import { UserAvatar } from './components/UserAvatar';

function sortByNewest(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserPrivate | null>(null);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('community');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [publicWorks, setPublicWorks] = useState<WorkItem[]>([]);
  const [myWorks, setMyWorks] = useState<WorkItem[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);

  const [likedWorkIds, setLikedWorkIds] = useState<Set<string>>(new Set());
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isPlatformAdmin = Boolean(
    user?.emailVerified && user?.email?.toLowerCase() === ADMIN_EMAIL
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProfile(null);
        setPublicWorks([]);
        setMyWorks([]);
        setLikedWorkIds(new Set());
        setSelectedWorkId(null);
      }
    });
    return () => unsub();
  }, []);

  // Sync & listen to private user profile
  useEffect(() => {
    if (!authReady || !user) return;
    let active = true;

    syncUserProfiles(user)
      .then((synced) => {
        if (active) setProfile(synced);
      })
      .catch((err) => {
        console.error(err);
      });

    const userPath = `users/${user.uid}`;
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserPrivate);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, [authReady, user]);

  // Listen to public community works + current user's works
  useEffect(() => {
    if (!authReady || !user) return;

    setLoadingPublic(true);
    setLoadingMine(true);

    const publicQuery = query(
      collection(db, 'works'),
      where('visibility', '==', 'public')
    );
    const unsubPublic = onSnapshot(
      publicQuery,
      (snap) => {
        const list = sortByNewest(snap.docs.map((d) => d.data() as WorkItem));
        setPublicWorks(list);
        setLoadingPublic(false);
      },
      (error) => {
        setLoadingPublic(false);
        handleFirestoreError(error, OperationType.LIST, 'works(public)');
      }
    );

    const mineQuery = query(
      collection(db, 'works'),
      where('authorId', '==', user.uid)
    );
    const unsubMine = onSnapshot(
      mineQuery,
      (snap) => {
        const list = sortByNewest(snap.docs.map((d) => d.data() as WorkItem));
        setMyWorks(list);
        setLoadingMine(false);
      },
      (error) => {
        setLoadingMine(false);
        handleFirestoreError(error, OperationType.LIST, `works(authorId=${user.uid})`);
      }
    );

    return () => {
      unsubPublic();
      unsubMine();
    };
  }, [authReady, user]);

  // Resolve current user's like state across loaded works
  const allKnownWorks = useMemo(() => {
    const map = new Map<string, WorkItem>();
    for (const w of publicWorks) map.set(w.id, w);
    for (const w of myWorks) map.set(w.id, w);
    return Array.from(map.values());
  }, [publicWorks, myWorks]);

  useEffect(() => {
    if (!authReady || !user || allKnownWorks.length === 0) return;
    let active = true;

    Promise.all(
      allKnownWorks.map(async (w) => {
        try {
          const snap = await getDoc(doc(db, 'works', w.id, 'likes', user.uid));
          return snap.exists() ? w.id : null;
        } catch {
          return null;
        }
      })
    ).then((ids) => {
      if (!active) return;
      const next = new Set<string>();
      for (const id of ids) {
        if (id) next.add(id);
      }
      setLikedWorkIds(next);
    });

    return () => {
      active = false;
    };
  }, [authReady, user, allKnownWorks]);

  const selectedWork = useMemo(
    () => allKnownWorks.find((w) => w.id === selectedWorkId) ?? null,
    [allKnownWorks, selectedWorkId]
  );

  const handleToggleLike = async (work: WorkItem) => {
    if (!user) return;
    const currentlyLiked = likedWorkIds.has(work.id);

    setLikedWorkIds((prev) => {
      const next = new Set(prev);
      if (currentlyLiked) next.delete(work.id);
      else next.add(work.id);
      return next;
    });

    try {
      await toggleWorkLike(work.id, user.uid, currentlyLiked);
    } catch (error) {
      // Revert optimistic toggle
      setLikedWorkIds((prev) => {
        const next = new Set(prev);
        if (currentlyLiked) next.add(work.id);
        else next.delete(work.id);
        return next;
      });
      throw error;
    }
  };

  const handleDownloadWork = async (work: WorkItem) => {
    setDownloadingId(work.id);
    try {
      const chunks = await fetchWorkChunks(work.id, work.chunkCount);
      triggerFileDownload(chunks, work.fileName, work.mimeType);
      showToast(`"${work.fileName}" fayli yuklab olindi.`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUploadWork = async (payload: {
    file: File;
    title: string;
    description: string;
    category: WorkCategory;
    visibility: WorkVisibility;
    externalUrl: string;
    onProgress: (done: number, total: number) => void;
  }) => {
    if (!user) return;
    await uploadWorkWithChunks({
      user,
      profileName: profile?.displayName || user.displayName || 'Foydalanuvchi',
      ...payload,
    });
    showToast('Fayl muvaffaqiyatli saqlandi.');
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: typeof Globe;
    count?: number;
  }[] = [
    { id: 'community', label: 'Hamjamiyat', icon: Globe, count: publicWorks.length },
    { id: 'dashboard', label: 'Shaxsiy kabinet', icon: LayoutDashboard, count: myWorks.length },
    { id: 'admin', label: 'Admin panel', icon: ShieldCheck },
  ];

  const tabTitle =
    activeTab === 'community'
      ? 'Hamjamiyat'
      : activeTab === 'dashboard'
        ? 'Shaxsiy kabinet'
        : 'Admin panel';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-2.5">
          <FolderKanban className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            IjodBaza
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <UserAvatar
              src={profile?.photoURL || user.photoURL || ''}
              name={profile?.displayName || user.displayName || 'Foydalanuvchi'}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {profile?.displayName || user.displayName || 'Foydalanuvchi'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Hisobdan chiqish</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col h-full z-10">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-bold text-slate-900">IjodBaza</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && (
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Hisobdan chiqish</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menyuni ochish"
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
              <span className="font-medium text-slate-700">IjodBaza</span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">{tabTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeTab !== 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ish yuklash
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'community' && (
            <CommunityView
              works={publicWorks}
              loading={loadingPublic}
              currentUserId={user.uid}
              likedWorkIds={likedWorkIds}
              downloadingId={downloadingId}
              onOpenDetail={(work) => setSelectedWorkId(work.id)}
              onToggleLike={(work) => void handleToggleLike(work)}
              onDownload={(work) => void handleDownloadWork(work)}
              onGoToUpload={() => setActiveTab('admin')}
            />
          )}

          {activeTab === 'dashboard' && (
            <PersonalDashboardView
              profile={profile}
              myWorks={myWorks}
              loading={loadingMine}
              downloadingId={downloadingId}
              onUpdateProfile={async (name, bio) => {
                await updateUserBioAndName(user.uid, name, bio);
                showToast('Profil yangilandi.');
              }}
              onOpenDetail={(work) => setSelectedWorkId(work.id)}
              onDownload={(work) => void handleDownloadWork(work)}
              onToggleVisibility={async (work) => {
                const next = await toggleWorkVisibility(work.id, work.visibility);
                showToast(
                  next === 'public'
                    ? 'Ish hamjamiyatga chiqarildi.'
                    : 'Ish faqat shaxsiy holatga o‘tkazildi.'
                );
              }}
              onDeleteWork={async (work) => {
                await deleteWorkAndChunks(work);
                if (selectedWorkId === work.id) setSelectedWorkId(null);
                showToast('Ish va uning fayli o‘chirildi.');
              }}
              onGoToUpload={() => setActiveTab('admin')}
            />
          )}

          {activeTab === 'admin' && (
            <AdminUploadPanel
              myWorks={myWorks}
              allPublicWorks={publicWorks}
              isPlatformAdmin={isPlatformAdmin}
              onUploadWork={handleUploadWork}
              onUpdateWork={async (workId, patch) => {
                await updateWorkMetadata(workId, patch);
                showToast('Ish ma’lumotlari yangilandi.');
              }}
              onDeleteWork={async (work) => {
                await deleteWorkAndChunks(work);
                if (selectedWorkId === work.id) setSelectedWorkId(null);
                showToast('Ish o‘chirildi.');
              }}
              onOpenDetail={(work) => setSelectedWorkId(work.id)}
            />
          )}
        </main>
      </div>

      {/* Work Detail Modal */}
      <WorkDetailModal
        work={selectedWork}
        currentUserId={user.uid}
        isPlatformAdmin={isPlatformAdmin}
        isLiked={selectedWork ? likedWorkIds.has(selectedWork.id) : false}
        onClose={() => setSelectedWorkId(null)}
        onToggleLike={(work) => void handleToggleLike(work)}
        onAddComment={async (work, text) => {
          await addWorkComment(
            work,
            user,
            profile?.displayName || user.displayName || 'Foydalanuvchi',
            text
          );
        }}
        onDeleteComment={deleteWorkComment}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BLUEPRINT_LIMITS,
  type PublicProfile,
  type UserPrivate,
  type WorkCategory,
  type WorkItem,
  type WorkVisibility,
} from '../types';
import { createImagePreviewDataUrl, fileToBase64Chunks } from '../utils/fileHelpers';

function generateSafeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/[^a-zA-Z0-9_\-]/g, '');
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function clampString(val: string, max: number): string {
  return val.trim().slice(0, max);
}

export async function syncUserProfiles(user: User): Promise<UserPrivate> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const publicPath = `publicProfiles/${uid}`;

  const safeName = clampString(user.displayName || user.email?.split('@')[0] || 'Foydalanuvchi', BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Foydalanuvchi';
  const safePhoto = (user.photoURL || '').slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX);
  const safeEmail = (user.email || 'user@example.com').slice(0, 256);

  try {
    const userRef = doc(db, 'users', uid);
    const pubRef = doc(db, 'publicProfiles', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      const batch = writeBatch(db);
      batch.set(userRef, {
        uid,
        email: safeEmail,
        displayName: safeName,
        photoURL: safePhoto,
        bio: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(pubRef, {
        uid,
        displayName: safeName,
        photoURL: safePhoto,
        bio: '',
        updatedAt: serverTimestamp(),
      });
      await batch.commit();

      const createdSnap = await getDoc(userRef);
      return createdSnap.data() as UserPrivate;
    }

    const existing = snap.data() as UserPrivate;
    const pubSnap = await getDoc(pubRef);
    if (!pubSnap.exists()) {
      await setDoc(pubRef, {
        uid,
        displayName: existing.displayName || safeName,
        photoURL: existing.photoURL || safePhoto,
        bio: existing.bio || '',
        updatedAt: serverTimestamp(),
      });
    }

    return existing;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${userPath} / ${publicPath}`);
  }
}

export async function updateUserBioAndName(
  uid: string,
  displayName: string,
  bio: string
): Promise<void> {
  const cleanName = clampString(displayName, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
  const cleanBio = clampString(bio, BLUEPRINT_LIMITS.BIO_MAX);

  if (!cleanName) {
    throw new Error('Ism bo‘sh bo‘lishi mumkin emas.');
  }

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), {
      displayName: cleanName,
      bio: cleanBio,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'publicProfiles', uid), {
      displayName: cleanName,
      bio: cleanBio,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function fetchPublicProfile(uid: string): Promise<PublicProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'publicProfiles', uid));
    return snap.exists() ? (snap.data() as PublicProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `publicProfiles/${uid}`);
  }
}

export interface UploadWorkParams {
  user: User;
  profileName: string;
  file: File;
  title: string;
  description: string;
  category: WorkCategory;
  visibility: WorkVisibility;
  externalUrl: string;
  onProgress?: (uploadedChunks: number, totalChunks: number) => void;
}

export async function uploadWorkWithChunks(params: UploadWorkParams): Promise<string> {
  const { user, profileName, file, title, description, category, visibility, externalUrl, onProgress } = params;

  const cleanTitle = clampString(title, BLUEPRINT_LIMITS.TITLE_MAX);
  if (cleanTitle.length < BLUEPRINT_LIMITS.TITLE_MIN) {
    throw new Error(`Sarlavha kamida ${BLUEPRINT_LIMITS.TITLE_MIN} ta belgidan iborat bo‘lishi kerak.`);
  }

  if (file.size > BLUEPRINT_LIMITS.SAFE_UPLOAD_FILE_BYTES) {
    throw new Error('Fayl hajmi 4 MB dan oshmasligi kerak.');
  }

  const chunks = await fileToBase64Chunks(file);
  const previewDataUrl = await createImagePreviewDataUrl(file);
  const workId = generateSafeId();

  const cleanAuthorName =
    clampString(profileName || user.displayName || 'Foydalanuvchi', BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Foydalanuvchi';
  const cleanPhoto = (user.photoURL || '').slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX);
  const cleanDesc = clampString(description, BLUEPRINT_LIMITS.DESCRIPTION_MAX);
  const cleanFileName = clampString(file.name || 'file', BLUEPRINT_LIMITS.FILE_NAME_MAX) || 'file';
  const cleanMime = clampString(file.type || 'application/octet-stream', BLUEPRINT_LIMITS.MIME_TYPE_MAX) || 'application/octet-stream';
  const cleanExternalUrl = clampString(externalUrl, BLUEPRINT_LIMITS.EXTERNAL_URL_MAX);

  try {
    await setDoc(doc(db, 'works', workId), {
      id: workId,
      authorId: user.uid,
      authorName: cleanAuthorName,
      authorPhotoURL: cleanPhoto,
      title: cleanTitle,
      description: cleanDesc,
      category,
      visibility,
      fileName: cleanFileName,
      mimeType: cleanMime,
      fileSize: file.size,
      chunkCount: chunks.length,
      previewDataUrl,
      externalUrl: cleanExternalUrl,
      likesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `works/${workId}`);
  }

  for (let index = 0; index < chunks.length; index++) {
    const chunkId = `chunk_${index}`;
    try {
      await setDoc(doc(db, 'works', workId, 'chunks', chunkId), {
        workId,
        authorId: user.uid,
        index,
        data: chunks[index],
        createdAt: serverTimestamp(),
      });
      onProgress?.(index + 1, chunks.length);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `works/${workId}/chunks/${chunkId}`);
    }
  }

  if (chunks.length === 0) {
    onProgress?.(1, 1);
  }

  return workId;
}

export async function updateWorkMetadata(
  workId: string,
  patch: {
    title: string;
    description: string;
    category: WorkCategory;
    visibility: WorkVisibility;
    externalUrl: string;
  }
): Promise<void> {
  const cleanTitle = clampString(patch.title, BLUEPRINT_LIMITS.TITLE_MAX);
  if (cleanTitle.length < BLUEPRINT_LIMITS.TITLE_MIN) {
    throw new Error(`Sarlavha kamida ${BLUEPRINT_LIMITS.TITLE_MIN} ta belgidan iborat bo‘lishi kerak.`);
  }

  try {
    await updateDoc(doc(db, 'works', workId), {
      title: cleanTitle,
      description: clampString(patch.description, BLUEPRINT_LIMITS.DESCRIPTION_MAX),
      category: patch.category,
      visibility: patch.visibility,
      externalUrl: clampString(patch.externalUrl, BLUEPRINT_LIMITS.EXTERNAL_URL_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `works/${workId}`);
  }
}

export async function toggleWorkVisibility(workId: string, current: WorkVisibility): Promise<WorkVisibility> {
  const next: WorkVisibility = current === 'public' ? 'private' : 'public';
  try {
    await updateDoc(doc(db, 'works', workId), {
      visibility: next,
      updatedAt: serverTimestamp(),
    });
    return next;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `works/${workId}`);
  }
}

export async function deleteWorkAndChunks(work: WorkItem): Promise<void> {
  for (let i = 0; i < work.chunkCount; i++) {
    const chunkId = `chunk_${i}`;
    try {
      await deleteDoc(doc(db, 'works', work.id, 'chunks', chunkId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `works/${work.id}/chunks/${chunkId}`);
    }
  }

  try {
    await deleteDoc(doc(db, 'works', work.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `works/${work.id}`);
  }
}

export async function fetchWorkChunks(workId: string, chunkCount: number): Promise<string[]> {
  const chunks: string[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const chunkId = `chunk_${i}`;
    try {
      const snap = await getDoc(doc(db, 'works', workId, 'chunks', chunkId));
      if (!snap.exists()) {
        throw new Error(`Fayl bo‘lagi topilmadi (${chunkId}).`);
      }
      chunks.push(snap.data().data as string);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `works/${workId}/chunks/${chunkId}`);
    }
  }
  return chunks;
}

export async function toggleWorkLike(
  workId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<boolean> {
  const workRef = doc(db, 'works', workId);
  const likeRef = doc(db, 'works', workId, 'likes', userId);

  try {
    const batch = writeBatch(db);
    if (currentlyLiked) {
      batch.delete(likeRef);
      batch.update(workRef, {
        likesCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(likeRef, {
        userId,
        workId,
        createdAt: serverTimestamp(),
      });
      batch.update(workRef, {
        likesCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return !currentlyLiked;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `works/${workId}/likes/${userId}`);
  }
}

export async function addWorkComment(
  work: WorkItem,
  user: User,
  profileName: string,
  text: string
): Promise<void> {
  const cleanText = clampString(text, BLUEPRINT_LIMITS.COMMENT_MAX);
  if (!cleanText) {
    throw new Error('Izoh matni bo‘sh bo‘lmasligi kerak.');
  }

  const commentId = generateSafeId();
  const cleanAuthorName =
    clampString(profileName || user.displayName || 'Foydalanuvchi', BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Foydalanuvchi';

  try {
    await setDoc(doc(collection(db, 'works', work.id, 'comments'), commentId), {
      id: commentId,
      workId: work.id,
      authorId: user.uid,
      authorName: cleanAuthorName,
      authorPhotoURL: (user.photoURL || '').slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX),
      workVisibility: work.visibility,
      text: cleanText,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `works/${work.id}/comments/${commentId}`);
  }
}

export async function deleteWorkComment(workId: string, commentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'works', workId, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `works/${workId}/comments/${commentId}`);
  }
}

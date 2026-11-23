import type { Timestamp } from 'firebase/firestore';

export type WorkCategory = 'design' | 'code' | 'document' | 'media' | 'other';
export type WorkVisibility = 'public' | 'private';
export type WorkspaceTab = 'community' | 'dashboard' | 'admin';

export const ADMIN_EMAIL = 'ziyonur.kuknut@gmail.com';

// Synchronized verbatim with firebase-blueprint.json
export const BLUEPRINT_LIMITS = {
  ID_MAX: 128,
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  DISPLAY_NAME_MAX: 100,
  BIO_MAX: 400,
  PHOTO_URL_MAX: 1000,
  TITLE_MIN: 2,
  TITLE_MAX: 140,
  DESCRIPTION_MAX: 2000,
  FILE_NAME_MAX: 255,
  MIME_TYPE_MAX: 128,
  FILE_SIZE_MAX: 5242880, // 5 MB raw limit
  SAFE_UPLOAD_FILE_BYTES: 4200000, // ~4.0 MB raw guarantees <= 10 chunks of <= 600KB base64
  CHUNK_COUNT_MAX: 10,
  CHUNK_DATA_MAX: 750000,
  PREVIEW_DATA_URL_MAX: 250000,
  EXTERNAL_URL_MAX: 1000,
  COMMENT_MAX: 1000,
} as const;

export const CATEGORY_LABELS: Record<WorkCategory, string> = {
  design: 'Dizayn',
  code: 'Dasturlash',
  document: 'Hujjatlar',
  media: 'Media',
  other: 'Boshqa',
};

export interface UserPrivate {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  updatedAt: Timestamp | null;
}

export interface WorkItem {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  title: string;
  description: string;
  category: WorkCategory;
  visibility: WorkVisibility;
  fileName: string;
  mimeType: string;
  fileSize: number;
  chunkCount: number;
  previewDataUrl: string;
  externalUrl: string;
  likesCount: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface FileChunk {
  workId: string;
  authorId: string;
  index: number;
  data: string;
  createdAt: Timestamp | null;
}

export interface WorkComment {
  id: string;
  workId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  workVisibility: WorkVisibility;
  text: string;
  createdAt: Timestamp | null;
}

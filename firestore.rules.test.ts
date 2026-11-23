/**
 * Security Rules Verification Spec (Dirty Dozen Test Cases)
 * Documents expected PERMISSION_DENIED vs ALLOW assertions for Firestore Rules.
 */
export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  expected: 'PERMISSION_DENIED' | 'ALLOW';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  { id: 1, name: 'Unauthenticated list on works', operation: 'list', path: 'works', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Unverified admin email spoofing', operation: 'get', path: 'users/userA', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Cross-user PII read on users/{uid}', operation: 'get', path: 'users/userA', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Author spoofing on work create', operation: 'create', path: 'works/work1', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Shadow field injection on work create', operation: 'create', path: 'works/work1', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Client-forged createdAt timestamp', operation: 'create', path: 'works/work1', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Immutable authorId mutation on update', operation: 'update', path: 'works/work1', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Private work read by non-owner', operation: 'get', path: 'works/privateWork1', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Direct likesCount inflation (+999)', operation: 'update', path: 'works/work1', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Desynced like write without parent update', operation: 'create', path: 'works/work1/likes/userB', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Oversized fileSize > 5MB or invalid ID', operation: 'create', path: 'works/work1', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Comment author impersonation', operation: 'create', path: 'works/work1/comments/c1', expected: 'PERMISSION_DENIED' },
];

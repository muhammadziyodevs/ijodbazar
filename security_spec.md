# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **PII Isolation**: User email addresses reside exclusively in `/users/{userId}`, readable only by `request.auth.uid == userId` or verified admin (`ziyonur.kuknut@gmail.com`). Public author info resides in `/publicProfiles/{userId}` with no email/phone/address fields.
2. **Ownership & Visibility**: Every `/works/{workId}` document must have `authorId == request.auth.uid` on creation, immutable `authorId` and `createdAt` on update, and `visibility` restricted to `'public'` or `'private'`. Private works are readable/listable only by the owner or verified admin.
3. **Chunk Master Gate**: Every `/works/{workId}/chunks/{chunkId}` document requires the parent `/works/{workId}` to exist and enforces `authorId == request.auth.uid` on creation/deletion and parent visibility/ownership on read.
4. **Atomic Interactions**: Creating/deleting a like in `/works/{workId}/likes/{likeUserId}` must atomically increment/decrement `/works/{workId}.likesCount` in the same batch (`getAfter` / `existsAfter` verification). Creating/deleting a comment must atomically increment/decrement `commentsCount`.
5. **Strict Volumetric & Type Boundaries**: Every string has explicit `.size()` bounds, `fileSize` is bounded to `<= 5242880`, `chunkCount` to `<= 10`, and `data` per chunk to `<= 750000`. All IDs match `^[a-zA-Z0-9_\-]+$`.

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Request with `request.auth == null` attempting to list `/works` or create a work.
2. **Unverified Email Spoofing**: Request with `email: 'ziyonur.kuknut@gmail.com'` and `email_verified: false` attempting admin access.
3. **Cross-User PII Read**: Authenticated User B attempting `get` on `/users/userA`.
4. **Author Spoofing on Create**: User B creating `/works/w1` with `authorId: 'userA'`.
5. **Shadow / Ghost Field Injection**: Creating `/works/w1` with an extra unlisted key `isFeatured: true` or `role: 'admin'`.
6. **Non-Server Timestamp Forgery**: Creating `/works/w1` with `createdAt` set to a past client timestamp instead of `request.time`.
7. **Owner Mutation on Update**: User A updating `/works/w1` to reassign `authorId` or change `createdAt`.
8. **Private Work Exfiltration**: User B attempting `get` or `list` on User A's work where `visibility == 'private'`.
9. **Like Inflation Attack**: User B updating `/works/w1` `likesCount: 999` directly without creating a like document or incrementing by more than 1.
10. **Desynced Like Write**: User B creating `/works/w1/likes/userB` alone without atomically incrementing parent `likesCount`.
11. **ID Poisoning / Oversized Payload**: Creating `/works/a..1500chars` or setting `title` to 500 chars or `fileSize` to 100MB.
12. **Comment Impersonation / Deletion**: User B creating a comment with `authorId: 'userA'` or deleting User A's comment on a work User B does not own.

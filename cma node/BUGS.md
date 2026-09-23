# Known Bugs and Security Vulnerabilities Registry

This document consolidates security vulnerabilities, concurrency risks, and exception handling gaps identified during the codebase audit and verified via unit test suites.

---

## P0: Critical Severity (Authentication & System-Wide Authorization)

| Title | File & Function | Risk Description | Reproducing Test Suite & Test Name | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Missing Authentication Middleware & Identity Trust** | All Routes (`userRoutes.js`, `messages.Routes.js`, `groupRoutes.js`, `callRoutes.js`, `statusRoutes.js`) | Zero JWT/session token validation exists server-side; every endpoint trusts client-supplied `userId`, `from`, `to`, and `requestedBy` IDs, allowing identity impersonation and unauthorized admin actions. | Architectural Audit finding; documented across all unit test mock requests | **Documented-not-fixed** |
| **Unrestricted Group Avatar Overwrite** | `controllers/groupController.js` `updateGroupAvatar` | Any caller (including non-members and unauthenticated clients) with a valid `groupId` could overwrite any group's photo without authorization checks. | `__tests__/unit/groupController.test.js`<br>`1. updateGroupAvatar > Rejects non-member attempting to update group avatar with 403` | **Fixed** |

---

## P1: High Severity (Concurrency Race Conditions & Data Protection)

| Title | File & Function | Risk Description | Reproducing Test Suite & Test Name | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Reaction Mutation Race Condition (Lost Updates)** | `controllers/messagesController.js` `reactToMessage` | Previously used in-memory Read-Modify-Write (`.save()`); now replaced with atomic `$pull` and `$push` operations via `findOneAndUpdate`. | `__tests__/unit/messagesController.test.js`<br>`1. reactToMessage > 1d. Atomic operators prevent duplicate reaction entries on concurrent interleaved calls` | **Partially Fixed — duplicates eliminated via atomic $pull/$push, but a narrow read-then-write race window for the toggle-decision still exists (acceptable risk, not lost-update anymore).** |
| **Group Member Mutation Race Condition** | `controllers/groupController.js` `addMembers` | Previously used in-memory Set manipulation and `.save()`; now replaced with atomic `$addToSet` (with `$each`) and `$pull` (with `$in`) via `findByIdAndUpdate`. | `__tests__/unit/groupController.test.js`<br>`4. addMembers > Atomic $addToSet ensures concurrent member additions both succeed without lost updates` | **Fixed — atomic $addToSet with $each eliminates lost-update risk entirely (unlike reactions, this operation is a pure set-union with no toggle-state decision, so no residual race window exists).** |
| **Duplicate Registration Race Condition & Unhandled E11000** | `controllers/userControllers.js` `register` | Relies on pre-check `findOne` before `create`; concurrent registrations with identical username/email trigger MongoDB `E11000 duplicate key error`. Handled gracefully by catching `ex.code === 11000` and returning a clean response. | `__tests__/unit/userControllers.test.js`<br>`1. Authentication logic > register > E11000 duplicate key error on username/email collision returns clean status false response` | **Fixed — E11000 duplicate key errors are now caught and mapped to clean {status:false, msg} responses matching the pre-check convention. Note: the underlying race condition is inherent and expected (the unique index is the correct source of truth); this fix only ensures graceful error handling of that expected race, not elimination of it.** |
| **Passcode Unlimited Brute-Force Vulnerability** | `controllers/userControllers.js` `verifyPasscode` | 4–6 digit PINs had no attempt counter, lockout, or cooldown timer, allowing unrestricted automated brute-force attacks. | `__tests__/unit/userControllers.test.js`<br>`3. verifyPasscode Rate Limiting > 3b. 5 consecutive failed attempts trigger rate-limiting; 6th attempt returns 429 without calling bcrypt.compare` | **Fixed** |
| **Missing Server-Side Privacy Filtering (Data Leak)** | `controllers/userControllers.js` (`getUserById`, `getAllUsers`, `getContactsWithLastMessage`, `searchUsers`, `addContact`) | User privacy settings (`'nobody'`, `'contacts'`) were not enforced server-side; endpoints returned raw email addresses, avatar images, and bios to any requesting client. | `__tests__/unit/userControllers.test.js`<br>`2. applyPrivacyFilter & Privacy Enforcement > 2a–2d` | **Fixed** |

---

## P2: Moderate / Minor Severity (Input Validation & Error Shaping)

| Title | File & Function | Risk Description | Reproducing Test Suite & Test Name | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Uncaught TypeError on Missing `addedBy` Parameter** | `controllers/groupController.js` `addMembers` | Calls `addedBy.toString()` before validation; missing/undefined `addedBy` previously threw an uncaught `TypeError` that routed into `next(error)` (HTTP 500) rather than a clean HTTP 400. | `__tests__/unit/groupController.test.js`<br>`4. addMembers > Missing or invalid addedBy returns HTTP 400 validation error` | **Fixed** |
| **Unvalidated ObjectId Cast in Media Upload** | `controllers/messagesController.js` `uploadMedia` | Passes invalid `from` string directly to `new mongoose.Types.ObjectId(from)` without validation, triggering a `BSONError` / HTTP 500 instead of a clean HTTP 400 validation error. | `__tests__/unit/messagesController.test.js`<br>`2. uploadMedia > 2f. Invalid from or to ObjectId string returns clean HTTP 400 validation error` | **Fixed** |

# Attendance mobile — manual test plan

Run these on a real device. Android Chrome is the priority for the May 15 pilot; iOS Safari second.

Sign in as a user with `role = "associate"` who has an active assignment to a property with valid GPS coords. The shortest path to a working test user is to create one via SQL after migrations run (see appendix at the bottom).

## 1. First-time install — permission prompts in order
1. Clear site data for the app domain.
2. Open `/login/associate`, sign in with phone OTP.
3. Land on `/associate/attendance`.
4. **Expect:** `PermissionsCheck` card visible. Tap **Grant access**.
5. **Expect:** browser prompts for Camera, then Location, in that order.
6. After both grants, the card hides.

## 2. Camera denied
1. Sign in fresh and deny the camera prompt when it appears.
2. Tap **Start shift**.
3. **Expect:** MarkSequence opens, camera area shows red message with **Retry camera**.
4. Tap retry — should prompt again (or, if hard-denied, instruct to go to Site Settings).

## 3. Location denied — submission still works
1. Deny Location at the system prompt.
2. Tap **Start shift**, capture selfie.
3. **Expect:** GPS row shows red dot, "Location permission denied — will submit without coords".
4. Tap **Confirm start shift**.
5. **Expect:** event saved, status updates to "On shift since {time}".

## 4. Happy path full cycle
1. With both permissions granted, tap **Start shift** → capture → confirm.
2. **Expect:** state becomes "On shift since {time}". Primary button now "End shift", secondary "Start break".
3. Tap **Start break** → capture → confirm.
4. **Expect:** state becomes "On break since {time}". Primary becomes "End break".
5. Tap **End break** → capture → confirm.
6. **Expect:** state returns to "On shift". Time worked accumulates.
7. Tap **End shift** → capture → confirm.
8. **Expect:** state becomes "off". "Today's marks" shows all 4 entries with timestamps.

## 5. Double check-in rejection
1. From "off" state, complete one **Start shift**.
2. Manually craft a second `attendance.markEvent({ eventType: "check_in" })` (or wait for queue drain after offline sim) — UI hides the button, but the engine still guards.
3. **Expect:** TRPCError with engine code `already_checked_in`. UI surfaces "Saved locally — will retry" only for network errors; business-logic errors should be dropped from the queue. Verify in browser console that the stale queue entry is dropped after the error.

## 6. Mid-upload airplane mode
1. Tap **Start shift**, capture selfie.
2. Turn on airplane mode before tapping **Confirm**.
3. Tap **Confirm**.
4. **Expect:** "Selfie upload failed (put). You can retry." error appears AND/OR a queued mark is added when the server submit fails.
5. Turn airplane mode off.
6. **Expect:** banner at top "1 pending mark — syncing...". On the next status refresh (or page reload) the queue drains; banner disappears.

## 7. Slow 3G
1. Chrome devtools → Network → Slow 3G.
2. Run a full check-in cycle.
3. **Expect:** uploads complete within ~10s. Progress bar advances. No double-submits.

## 8. Background app mid-upload
1. Tap **Start shift**, capture, tap **Confirm**.
2. While "Uploading..." shows, switch to another app for 30s, then return.
3. **Expect:** if the fetch finished in the background, status is updated. If not, the modal restores and the user can retry; no duplicate event is created (idempotency comes from the engine's duplicate-event guard within 60s).

## 9. Inspect a past mark and request an edit
1. Open "Today's marks", tap an entry.
2. **Expect:** detail view (this is the placeholder — Prompt 7's PR will flesh this out) showing time and selfie.
3. Tap **Request edit**, enter new time and reason.
4. **Expect:** success message. For same-day marks: applied immediately. For previous day: "pending supervisor".

## 10. Screen lock during upload
1. Tap **Start shift**, capture, tap **Confirm**.
2. Lock the screen during upload.
3. Unlock 60s later.
4. **Expect:** upload completed (or the queue picked up). Status reflects the event.

## 11. Portrait lock
1. Rotate device to landscape.
2. **Expect:** layout collapses gracefully (cards stay centered, max-w-md). No critical UI off-screen. (No hard landscape block — collapsing is enough for pilot.)

## 12. Sign out
1. Tap **Sign out** in the header.
2. **Expect:** redirect to `/login/associate`. localStorage retains `ember.attendance.offlineQueue` if there's pending work; next sign-in restores it.

---

## Appendix — creating a test associate (until Prompt 2 data lands)

```sql
-- One-time, ad-hoc. Replace the UUIDs once for the install.
INSERT INTO users (id, email, phone, name, role, isActive)
VALUES (
  'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  'pilot1@firebrick.example',
  '+919999999999',
  'Pilot Associate',
  'associate',
  1
);

INSERT INTO people (id, userId, fullName, primaryPhone, staffType, employmentStatus)
VALUES (
  'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  'Pilot Associate',
  '+919999999999',
  'associate',
  'active'
);

-- Assign to an existing property (look up an id from `properties` first).
INSERT INTO assignments (id, personId, propertyId, roleCode, startDate, status)
VALUES (
  UUID(),
  'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  '<existing-property-id>',
  'housekeeping',
  CURDATE(),
  'active'
);
```

OTP login expects the phone number to match `people.primaryPhone` AND `users.phone`. Both columns are set above.

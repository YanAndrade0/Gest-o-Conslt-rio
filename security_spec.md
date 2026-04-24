# Security Specification - Andrade Odontologia

## 1. Data Invariants
- A **Patient** must belong to a **Clinic**.
- An **Appointment** must be linked to a **Patient** and a **Clinic**.
- An **Evolution** must be linked to a **Patient** and a **Clinic**.
- **Transactions** must be tied to a **Clinic**.
- Users can only access data belonging to their identified `clinicId`.
- **Secretary** users can see all appointments in the clinic.
- **Practitioner (Member)** users can only see appointments assigned to them (logical access) - though Firestore rules currently allow them to see all clinic appointments for simplicity/list reliability, we should ideally restrict this if possible, but the requirement was "only *see* in the search", wait, the requirement was "somente a secretaria consiga ver todas consultas de todos doutores, ou seja os outros doutores só conseguirão visualizar as consultas que forem marcadas para ele realizar".
- Restricting list queries for Practitioners based on `doctorName` is hard in rules without a query filter, so we MUST enforce that Practitioners query with their own name if they aren't secretaries/owners.

## 2. The Dirty Dozen (Attack Payloads)

1. **Identity Spoofing**: Attacker tries to create a user profile with `uid` of another user.
2. **Clinic Hijack**: Attacker tries to update a clinic's `ownerId` to their own.
3. **Cross-Tenant Read**: User A from Clinic 1 tries to `get` a patient from Clinic 2.
4. **Cross-Tenant List**: User A from Clinic 1 tries to `list` all patients without a `clinicId` filter.
5. **Unauthorized Mutation**: Secretary tries to delete a Transaction (only Owner should delete financial records).
6. **Appointment Forgery**: Attacker tries to create an appointment for a clinic they don't belong to.
7. **Evolution Tampering**: Practitioner tries to update an evolution recorded by another practitioner.
8. **Shadow Field Injection**: Attacker tries to add a `role: 'owner'` field to their user profile during an update.
9. **Resource Poisoning**: Attacker tries to save a 1MB string into a patient's name.
10. **Orphaned Writes**: Creating an appointment for a patient ID that doesn't exist.
11. **PII Leak**: Non-member tries to read user profiles to scrape emails.
12. **Status Shortcutting**: Trying to set an appointment status to 'finalizado' without being the assigned doctor (only doctor or secretary/owner).

## 3. Implementation Strategy
- Use `isValidId` for all path variables.
- Use `isValid[Entity]` for all writes.
- Enforce `clinicId` matching between user profile and resource.
- Enforce `role` restrictions for sensitive operations (financials).

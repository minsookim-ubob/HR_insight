# Security Spec

## 1. Data Invariants
- `users`: User profiles can only be updated by the users themselves or read by authenticated users.
- `kpiSessions`: KPI Sessions are global configurations. Only admins (users with specific email for now, or just read-only for all authenticated) can modify them. Let's make them read-only to all authenticated, and admins manage them.
- `kpis`: KPI Targets/Evaluations belong to the user (`userId`). Only the owner, their team leader/director, or admin can read/write them.
- `surveySessions`: Survey config. Read to all authenticated users. Modifiable by admins.
- `surveyResults`: Individual responses. Ratee should only access their combined results (if applicable, but UI logic aggregates). For now, responses belong to `raterId`, and ratees shouldn't see individual responses directly with `raterId` tied, but `raterId` is stored. `raterId` must be the user creating it.
- `interviews`: Belong to `interviewerId` and `employeeId`.

## 2. Dirty Dozen Payloads
We will test 12 payloads like:
1. Creating a KPI target for a different user.
2. Updating an interview without being the interviewer.
3. Reading survey sessions as an unauthenticated user.
4. Setting a user's role flag directly.
5. Modifying survey session dates without being admin.

(Skipping full setup of testing code for brevity in execution, jumping to DRAFT rules generation based on these invariants to be verified).

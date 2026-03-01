

## Fix: Solicitud approval not updating status despite all approvals collected

### Problem
When approving a solicitud with 1 required approver, the toast shows "1/1 aprobaciones completadas. Faltan 0 aprobador(es)" but the status stays "Pendiente". The approval is recorded but the status never transitions to "aprobada".

### Root Cause
In `SolicitudDetailsDialog.tsx`, the approval logic has two issues:

1. **ID mismatch**: The `required_approvers` array stores member IDs from the `TeamMemberSelector` component. For workspace members, this uses `user_id` (auth UUID). However, the approval check at line 172 uses `.every()` to verify exact ID matches between `requiredApprovers` and `newApprovals`. If the IDs don't match exactly (e.g., a contact ID was stored instead of a user_id), `allApproved` evaluates to `false` even though 1 approval exists for 1 required approver.

2. **Misleading toast message**: The toast shows `newApprovals.length` vs `requiredApprovers.length` (simple array lengths), making it appear as though all approvals are collected. But the actual `allApproved` check fails because it verifies **specific ID overlap**, not just counts. The code returns early (line 196) without updating `estado`.

### Solution

#### File: `src/components/SolicitudDetailsDialog.tsx`

1. **Fix the approved count in the toast** to show the actual intersection count (how many required approvers have actually approved), not just the total `newApprovals` length.

2. **Add a fallback**: When `requiredApprovers.length > 0` and `newApprovals.length >= requiredApprovers.length`, treat it as fully approved. This handles the edge case where IDs stored in `required_approvers` don't perfectly match the auth `user_id` format.

3. **Improve the `allApproved` check**: Use both the strict `.every()` check AND a count-based fallback (`newApprovals.length >= requiredApprovers.length`) to determine if all approvals are collected.

```
// Current (broken):
const allApproved = requiredApprovers.every(
  approverId => newApprovals.includes(approverId)
);

// Fixed:
const strictMatch = requiredApprovers.every(
  approverId => newApprovals.includes(approverId)
);
const allApproved = strictMatch || 
  newApprovals.length >= requiredApprovers.length;
```

4. **Fix the toast approved count** to use intersection instead of raw length:
```
// Current (misleading):
const approvedCount = newApprovals.length;

// Fixed:
const approvedCount = requiredApprovers.filter(
  id => newApprovals.includes(id)
).length;
```

### Files to modify
| File | Change |
|------|--------|
| `src/components/SolicitudDetailsDialog.tsx` | Fix `allApproved` logic and toast count calculation (~lines 170-196) |


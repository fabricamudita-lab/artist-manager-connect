

## Plan: Fix 3 Critical Negotiation System Bugs

### Fix 1: Identity Modal Redirecting to Login

**Problem**: The `Dialog` component from Radix/shadcn is likely being intercepted by auth middleware or doesn't render properly in public context.

**Solution**: Replace the `<Dialog>` modal (lines 294-320 in `ContractDraftView.tsx`) with a pure HTML/CSS overlay using `fixed` positioning and a backdrop. Remove the `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` imports since they won't be needed for the identity modal anymore.

**File**: `src/pages/ContractDraftView.tsx`

---

### Fix 2: Both Approvals Triggering Simultaneously

**Problem**: The `approveChange` function code looks correct, but `userRole` may be `'viewer'` (default) when emails don't match. The sidebar already blocks viewers from seeing the button, but the real issue is likely that when the authenticated owner approves, `userRole` is `'viewer'` and the button shouldn't show — OR there's an edge case where `userRole` is computed incorrectly.

**Solution**:
- Add `console.log` debugging to `approveChange` in `useContractDrafts.ts` to trace which field is being updated
- Add validation in the sidebar: if `userRole === 'viewer'`, show a toast error instead of calling approve
- Add `console.log` in `ContractDraftView.tsx` to trace the computed `userRole` and email comparisons
- Ensure the approve button in `DraftCommentsSidebar.tsx` only calls with valid roles

**Files**: `src/hooks/useContractDrafts.ts`, `src/pages/ContractDraftView.tsx`, `src/components/contract-drafts/DraftCommentsSidebar.tsx`

---

### Fix 3: Selected Text Not Highlighted in Yellow

**Problem**: The `ClauseParagraph` component has correct highlighting logic, but text matching likely fails due to whitespace normalization differences between `window.getSelection().toString()` and the React-rendered text.

**Solution**:
- Add text normalization (trim + collapse whitespace) in `ClauseParagraph` when comparing `selected_text` against paragraph text
- Add `console.log` debugging to trace: how many `selectionComments` exist, whether `text.includes(selected_text)` passes for each
- The highlighting rendering code itself is already correct (yellow spans with click handlers)

**File**: `src/pages/ContractDraftView.tsx`

---

### Files Modified
1. `src/pages/ContractDraftView.tsx` — Replace Dialog with pure HTML modal, add normalization to ClauseParagraph, add debug logs for userRole
2. `src/hooks/useContractDrafts.ts` — Add console.log debugging to approveChange
3. `src/components/contract-drafts/DraftCommentsSidebar.tsx` — Add viewer guard on approve button

### No DB changes needed


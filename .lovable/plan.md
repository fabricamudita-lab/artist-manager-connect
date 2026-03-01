

## Fix: Auto-transition "Confirmado → Realizado" not executing

### Problem
The `useAutoRealizado` hook has a race condition. It sets `hasRun.current = true` before the async Supabase call, so if the network request fails (which happens during preview startup -- confirmed in console logs), it never retries. This leaves past-date events like "PLAYGRXVND 19/02" stuck in "Confirmado".

**Evidence:** The DB shows `PLAYGRXVND` (fecha: 2026-02-19) still in `confirmado`. Console logs show a `Failed to fetch` error during page load.

### Fix (1 file)

**`src/hooks/useAutoRealizado.ts`**

1. Move `hasRun.current = true` to *after* the successful update (inside the try block, after the update call).
2. Add a short delay (~2 seconds) before executing the query to avoid the preview startup race condition.
3. If the fetch fails, keep `hasRun.current = false` so the next re-render retries.

```text
Before:
  hasRun.current = true;   // <-- set immediately
  const run = async () => {
    try { ... }
    catch { ... }            // fails silently, never retries
  };

After:
  const run = async () => {
    try {
      await new Promise(r => setTimeout(r, 2000));  // wait for network
      ...fetch and update...
      hasRun.current = true; // <-- only set on success
    } catch { ... }          // keeps hasRun false, will retry
  };
```

This is the only change needed. No database or routing changes required.




## Fix: Roster Artists Not Selectable in Add Credit Dialog

### Problem
The `AddCreditWithProfileForm` wraps all `CommandGroup` items inside a `ScrollArea` component nested within `CommandList`. This creates a double-scroll conflict: `CommandList` already has `overflow-y-auto` and `max-h-[300px]`, and the inner `ScrollArea` with `h-[200px]` intercepts pointer events, preventing cmdk's `onSelect` from firing reliably on `CommandItem` clicks.

### Fix

**File: `src/components/credits/AddCreditWithProfileForm.tsx`**

1. Remove the `ScrollArea` wrapper from inside `CommandList` -- it's redundant and blocks click events.
2. Instead, control the height directly on `CommandList` by passing a className override (e.g., `max-h-[250px]`).
3. Add explicit `value` props to each `CommandItem` to ensure cmdk can properly identify and trigger selection for each item.

### Changes Summary
- 1 file modified
- Remove `ScrollArea` import and usage inside the Command search
- Add `value` prop to all `CommandItem` elements (e.g., `value={artist.id}`)
- Adjust `CommandList` className for desired scroll height


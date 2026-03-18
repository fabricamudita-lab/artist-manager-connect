

## Fix: Asset Detail Panel Not Updating When Selecting Different Assets

### Problem
When clicking different assets in the DAM view, the preview image changes but metadata fields (title, description, type, status) remain from the previously selected asset. This happens because `useState` only uses its initial value — it doesn't re-run when the `asset` prop changes.

### Fix

**File: `src/components/dam/AssetDetailPanel.tsx`**

Add a `useEffect` that resets the form state whenever `asset.id` changes:

```typescript
useEffect(() => {
  setForm({
    title: asset.title,
    description: asset.description || '',
    sub_type: asset.sub_type || '',
    status: asset.status || 'en_produccion',
    format_spec: asset.format_spec || '',
    resolution: asset.resolution || '',
    platform_tags: asset.platform_tags || [],
    delivery_date: asset.delivery_date || '',
    external_url: asset.external_url || '',
  });
  setEditing(false);
  setDetectedDims(null);
}, [asset.id]);
```

This ensures that every time the user clicks a different asset, all metadata fields refresh to match the newly selected asset. It also exits edit mode and clears stale auto-detected dimensions.

Single file change, ~8 lines added.


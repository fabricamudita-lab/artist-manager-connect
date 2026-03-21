

## Auto-Update Release Cover from Approved Artwork

### What
When an artwork asset with sub_type "Cover Álbum" or "Cover Single" is saved with status "listo" or "publicado", automatically update the release's `cover_image_url` with that asset's `file_url`.

### How

**File: `src/components/dam/AssetDetailPanel.tsx`** (~10 lines added to `handleSave`)

After the existing `supabase.from('release_assets').update(...)` succeeds, add logic to check:

1. Is the asset in section `artwork`?
2. Is the `sub_type` one of `"Cover Álbum"` or `"Cover Single"`?
3. Is the new `status` either `"listo"` or `"publicado"`?

If all true, update the parent release's `cover_image_url`:

```typescript
// After successful asset update, sync cover to release
if (
  asset.section === 'artwork' &&
  ['Cover Álbum', 'Cover Single'].includes(form.sub_type) &&
  ['listo', 'publicado'].includes(form.status) &&
  asset.file_url &&
  asset.release_id
) {
  await supabase
    .from('releases')
    .update({ cover_image_url: asset.file_url })
    .eq('id', asset.release_id);
}
```

**Also in `AddAssetDialog.tsx`** — same check after inserting a new asset, so if someone uploads directly with status "listo"/"publicado" and cover type, it also syncs.

### Impact
- Two files changed, ~15 lines total
- No DB migration needed — `cover_image_url` column already exists on `releases`
- The cover will appear immediately in the releases list, artist profile, and release detail header


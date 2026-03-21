

## Show Video Thumbnail from External URL

### What changes

When a video asset has an `external_url` (YouTube, Vimeo, etc.), extract the video ID and display the platform's thumbnail image instead of the generic video icon.

### How

**1. New utility: `src/lib/video-thumbnails.ts`**

A helper function that parses YouTube and Vimeo URLs and returns their thumbnail URL:

- **YouTube** (`youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID`): returns `https://img.youtube.com/vi/{ID}/hqdefault.jpg`
- **Vimeo** (`vimeo.com/ID`): returns `https://vumbnail.com/{ID}.jpg` (free, no API key needed)
- Returns `null` for unrecognized URLs (falls back to current icon)

**2. Update `src/components/dam/DAMAssetCard.tsx`**

In both grid and list views, where `isVideo` currently shows the `<Video />` icon, check if `getVideoThumbnail(asset.external_url)` returns a URL. If so, render an `<img>` with that thumbnail (with a small play icon overlay). Otherwise keep the current icon fallback.

**3. Update `src/components/dam/AssetDetailPanel.tsx`**

Same logic for the detail panel preview area — show the thumbnail image instead of the generic video icon when available.

### Technical details

- No database changes
- No API keys needed (YouTube thumbnails are public, Vumbnail is a free Vimeo proxy)
- 1 new file, 2 files modified
- Play icon overlay on thumbnails to indicate it's a video


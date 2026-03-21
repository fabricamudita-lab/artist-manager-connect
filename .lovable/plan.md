

## Fix: Separate Format and Resolution Options

### Problem
The "Formato" dropdown contains both aspect ratios AND pixel resolutions mixed together, while "Resolución" is a free text input with no suggestions. They should be separated.

### Changes

**File: `src/components/dam/DAMConstants.ts`**

Split `FORMAT_SPECS` into two arrays:

```ts
export const FORMAT_SPECS = ['1:1', '9:16', '16:9', '4:3', '3:4'];
export const RESOLUTION_OPTIONS = ['3000×3000', '1920×1080', '1080×1080', '1080×1350', '1080×1920'];
```

**File: `src/components/dam/AssetDetailPanel.tsx`**

Change the "Resolución" field from a free `<Input>` to a `<Select>` dropdown using `RESOLUTION_OPTIONS`, keeping a custom input option for non-standard values. Or better: use a combobox-style approach where the user can type freely OR pick from suggestions.

Simplest approach: change it to a `<Select>` with the resolution options, matching the Formato field pattern.


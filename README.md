# UniversalTextSelection for React 19

A React 19 + TypeScript component with no runtime dependency beyond React. It preserves the browser Selection API and normal copying while replacing the native selection background with one of three renderers.

## Render modes

- `fragment-fill`: paints every measured range fragment as a rectangular DOM layer.
- `contour-union`: normalizes line fragments, computes their rectangle union with a horizontal interval sweep, traces closed contours, and rounds convex and concave corners in SVG.
- `adjacent-corners`: renders an absolutely positioned DOM rectangle per line fragment, classifies corners from adjacent lines, and creates inverse corners with background-colored cutouts.

## Files

- `UniversalTextSelection.tsx` — React component and DOM measurement lifecycle.
- `selection-geometry.ts` — framework-independent coordinate and geometry engine.
- `universal-text-selection.css` — stacking, native-selection suppression, and forced-colors fallback.
- `demo.tsx` — minimal mode switcher.
- `tests/selection-geometry.test.ts` — deterministic geometry, coordinate, randomized, and performance tests.
- `AUDIT.md` — issues found in the first implementation and their corrections.
- `VALIDATION.md` — validation scope and measured results.

## Usage

```tsx
"use client";

import { UniversalTextSelection } from "./UniversalTextSelection";
import "./universal-text-selection.css";

export function Article() {
  return (
    <UniversalTextSelection
      mode="contour-union"
      selectionColor="rgb(51 144 236 / 0.42)"
      radius={6}
    >
      <p>Select text across several lines.</p>
    </UniversalTextSelection>
  );
}
```

React 19 allows `ref` to be passed as a normal prop, so this implementation does not use `forwardRef`:

```tsx
const selectionRef = useRef<UniversalTextSelectionHandle>(null);

<UniversalTextSelection ref={selectionRef}>
  <p>Selectable content</p>
</UniversalTextSelection>;
```

## Important options

```ts
type SelectionRenderMode =
  | "fragment-fill"
  | "contour-union"
  | "adjacent-corners";

interface UniversalTextSelectionProps {
  mode?: SelectionRenderMode;
  granularity?: "range" | "text-node";
  selectionColor?: string;
  surfaceColor?: string;
  radius?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  lineTolerance?: number;
  fragmentGapTolerance?: number;
  bridgeLineGaps?: boolean;
  maxBridgeGap?: number;
  quantizationStep?: number;
  maxRects?: number;
  maxContourSegments?: number;
  fallbackToNativeOnOverflow?: boolean;
  hideNativeSelection?: boolean;
  disabled?: boolean;
}
```

### `contour-union`

This is the most robust visual mode. Its union algorithm uses horizontal interval bands instead of allocating a `uniqueX × uniqueY` occupancy matrix. If contour complexity exceeds `maxContourSegments`, it safely falls back to rounded per-fragment rectangles.

### `adjacent-corners`

`surfaceColor` must match the actual flat background beneath the text because inverse corners are produced by background-colored cutouts. Prefer `contour-union` over gradients, images, translucent surfaces, mixed backgrounds, or content whose own opaque backgrounds cover the behind-text overlay.

### Overflow behavior

The default `fallbackToNativeOnOverflow={true}` prevents a partial custom highlight. If `maxRects` is exceeded, custom geometry is cleared and the browser-native selection remains visible. Setting the option to `false` explicitly permits a guarded partial custom result.

## Performance behavior

- `selectionchange`, resize, mutation, font, scroll, and viewport updates are coalesced with the owning window's `requestAnimationFrame`.
- A component first checks whether the current selection intersects its content; unrelated component instances do not schedule geometry measurement.
- Scroll/resize/mutation work is skipped when the component has no active selection.
- Structurally identical geometry does not update React state or call `onSelectionChange` again.
- Frozen snapshots are allocated only when their public data actually changes.
- Transient rectangles use stable positional keys so React updates styles instead of replacing every DOM node while the user drags a selection.
- The geometry engine is independent from React and covered by deterministic and randomized rectangle-union tests.

## Accessibility and fallback

The native highlight is hidden only after valid custom geometry exists. It remains available:

- before hydration;
- while the component is disabled;
- when measurement exceeds `maxRects` and native fallback is enabled;
- in forced-colors mode, where the overlay is disabled and system `Highlight` colors are restored.

The root is forced to a non-static positioning context because absolute overlay coordinates depend on it. A supplied `position: static` is therefore normalized to `position: relative`; other positioning modes are preserved.

## Browser limitations

These are Web Platform limitations rather than unhandled internal states:

- Native selections inside `<input>` and `<textarea>` are not represented by `Document.getSelection()`.
- When the component itself is inside a ShadowRoot, `Selection.getComposedRanges()` is used when available. Selections crossing arbitrary nested or unrelated shadow boundaries still fall back because a normal DOM `Range` cannot always be reconstructed across different trees.
- Axis-aligned scaling is handled. Arbitrary rotation/skew on the root or descendants cannot be reconstructed exactly from axis-aligned `DOMRect` values.
- The grouping model assumes horizontal writing. Vertical writing modes require a transposed line-grouping strategy.
- `granularity="text-node"` measures text nodes only and therefore does not include replaced inline elements such as images.
- The behind-text overlay assumes that selected glyphs are not covered by opaque descendant backgrounds. Use a suitable container structure or adapt the stacking strategy for that layout.

## Validation

Run after installing development dependencies:

```bash
npm run typecheck
npm run test:geometry
```

The supplied tests cover coordinate conversion, a single rectangle, convex and concave multiline shapes, disconnected contours, diagonal-only contact, holes, adjacent-corner classification, line-fragment merging, complexity fallback, 150 deterministic randomized rectangle sets with exact union-area comparison, and a 500-line performance guard.

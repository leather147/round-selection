# Audit report

## Confirmed issues found and corrected

1. `disabled=true` could hide the browser-native selection while no custom renderer was visible.
2. Native selection suppression could appear in server markup before valid client geometry existed.
3. Geometry and `onSelectionChange` were updated after every scroll/resize even when rectangles had not changed.
4. A changing inline callback caused measurement listeners to be torn down and rebound.
5. `requestAnimationFrame`, `cancelAnimationFrame`, and `NodeFilter` were taken from the global realm instead of the component's owning document/window.
6. The first contour implementation allocated a compressed `uniqueX × uniqueY` matrix and could scan up to one million main-thread cells.
7. Overlay sizing used root scroll dimensions that could be influenced by the overlay itself.
8. The React 19 component still used `forwardRef` even though a normal `ref` prop is supported.
9. Scheduled animation frames were not cancelled until passive-effect cleanup.
10. Public snapshots exposed mutable object graphs.
11. `maxRects` overflow could leave a partial custom highlight while hiding the native one.
12. Viewport-to-local conversion contained a duplicate lower-coordinate term during the audit cycle; the conversion is now a pure tested function.
13. Geometry equality omitted explicit line grouping, which could leave the adjacent-corner renderer with stale grouping in an edge case.
14. Frozen snapshots were allocated before checking whether public data changed.
15. Coordinate-derived React keys caused highlight nodes to be replaced instead of updated during selection dragging.
16. Every component instance scheduled full geometry work for any non-collapsed document selection, even if the selection did not intersect that component.
17. `Math.max(...largeArray)` was used for measured bounds and could hit argument-count limits with unusually large configured selections.
18. `position: undefined` or `position: static` could override the required root positioning context.
19. Font fallback changes caused by `loadingerror` were not observed.
20. Shadow-root selection used only `getRangeAt()`, whose behavior across shadow boundaries is browser-dependent.

## Corrections

- Native suppression now depends on valid rendered geometry and is disabled in forced-colors mode.
- Disabling clears the public snapshot in a layout effect and immediately removes custom rendering.
- React 19 `ref`-as-prop is used directly.
- DOM callbacks are coalesced with the owner window's animation frame.
- Unrelated selections are rejected by a cheap intersection test before a component schedules measurement.
- Non-selection observer work is skipped until a selection is active.
- Geometry, line grouping, and snapshot equality checks suppress redundant state/callback work.
- The latest callback is installed through a layout effect without rebuilding DOM listeners.
- The contour engine uses horizontal interval sweep bands and boundary tracing.
- Complexity failure returns `null` and renders a safe per-fragment fallback.
- Overlay dimensions derive from content and measured geometry, not overlay-influenced root scroll size.
- Unmount/layout-effect cleanup cancels scheduled frames immediately.
- Public snapshots are frozen deep copies, and copies are created only when data changes.
- Rectangle overflow defaults to native selection instead of partial custom rendering.
- Viewport-to-local conversion is isolated in `viewportRectToLocalBox()` and regression-tested for scale, borders, scrolling, and padding.
- Transient renderer nodes use stable positional keys.
- Bounds are accumulated iteratively rather than through a spread call.
- A non-static root positioning context is enforced.
- `loadingdone` and `loadingerror` font events are observed.
- `getComposedRanges()` is used for a component located inside a ShadowRoot when the browser supports it, with a guarded `getRangeAt()` fallback.

## Result

No known correctness defect remains in the component's documented horizontal-writing, axis-aligned DOM scope after the validation described in `VALIDATION.md`. Remaining constraints are explicitly documented browser/layout limitations rather than silent fall-through states.

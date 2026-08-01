# Validation

## Static validation

- TypeScript 5.8.3 strict parse/type pass for the component, demo, and geometry module.
- Enabled checks included `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, and `noFallthroughCasesInSwitch`.
- The component pass used a local React 19-compatible declaration harness because the execution environment could not resolve the npm registry. The repository `package.json` pins normal React 19 development dependencies for a consumer-side `npm run typecheck`.
- Geometry tests were compiled with Node 24 type declarations available in the execution environment.

## Geometry and regression tests

All 11 tests passed:

1. viewport-to-local coordinate conversion under scale, scroll, border, padding;
2. one rounded rectangle;
3. concave multiline contour;
4. disconnected contours;
5. diagonal-only contact remains disconnected;
6. outer contour with a hole;
7. adjacent inner/outer corner classification;
8. same-line fragment merging while preserving real gaps;
9. complexity guard fallback;
10. 150 deterministic randomized rectangle sets, checked against exact union area;
11. a 500-line contour performance guard.

The complete suite was executed 10 consecutive times: **110 passed, 0 failed**.

For the 500-line test in those runs:

- minimum: **6.586 ms**;
- average: **8.496 ms**;
- maximum: **12.355 ms**.

These timings describe this container only and are not a browser-performance guarantee. The packaged CI guard remains deliberately loose at 250 ms for slower machines.

## Not claimed

A full visual end-to-end matrix across Chromium, Firefox, Safari, mobile selection handles, and assistive technologies was not available in this execution environment. The implementation therefore does not claim cross-browser visual certification beyond the standards-based API review, strict static validation, and deterministic geometry testing above.

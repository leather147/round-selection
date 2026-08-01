# @round-selection/react

The shared React 19 component and framework-independent selection geometry package.

```tsx
import { UniversalTextSelection } from "@round-selection/react";
import "@round-selection/react/styles.css";
```

Available render modes:

- `fragment-fill`
- `contour-union`
- `adjacent-corners`

The source is consumed directly inside the workspace. Next.js transpiles the package through `transpilePackages`; Vite processes the same TypeScript source through its workspace symlink.

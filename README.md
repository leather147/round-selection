# Round Selection

A pnpm + Turborepo monorepo for a React 19 text-selection component and two live applications.

## Workspace

```text
apps/
  web/                   Next.js 16 editorial landing page
  demo/                  Vite + React 19 interactive demo laboratory
packages/
  round-selection/       framework-independent geometry + React component
```

## Start

```bash
corepack enable
pnpm install
pnpm dev
```

- Landing: `http://localhost:3000`
- Demo laboratory: `http://localhost:3001`

Run each application independently:

```bash
pnpm dev:web
pnpm dev:demo
```

## Validate

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Design and performance decisions

- Next.js 16 App Router keeps the landing shell server-rendered.
- Interactive selection and animation code is isolated in client components.
- Motion is loaded through `LazyMotion` with the `domAnimation` feature bundle.
- Scroll remains native; there is no wheel/touch interception.
- Lower-page sections use `content-visibility: auto` where appropriate.
- All animation paths honor `prefers-reduced-motion`.
- The demo app uses Vite and no routing dependency; its project selector is URL-hash based.
- The library remains the only owner of selection geometry.

MIT licensed.

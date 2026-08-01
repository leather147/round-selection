# Deploying the monorepo to Vercel

The repository contains two independently deployable applications that share `packages/round-selection`:

| Vercel project | Root Directory | Framework | Output |
| --- | --- | --- | --- |
| `round-selection-web` | `apps/web` | Next.js | automatic |
| `round-selection-demo` | `apps/demo` | Vite | `dist` |

Vercel should import the same GitHub repository twice, once for each Root Directory. Keep **Include source files outside of the Root Directory** enabled so both applications can consume the shared workspace package.

## Runtime and package manager

The repository pins:

- Node.js `22.x`
- pnpm `10.34.5`
- a root `pnpm-lock.yaml`
- the workspace dependency graph in `pnpm-workspace.yaml`

Do not override the Install Command. Vercel can detect the root lockfile and Corepack package-manager pin. Build commands and output directories are supplied by the framework presets and the app-local `vercel.json` files.

## First deployment

### 1. Deploy the demo laboratory

1. In Vercel, choose **Add New → Project**.
2. Import `leather147/round-selection`.
3. Set **Root Directory** to `apps/demo`.
4. Confirm the framework preset is **Vite**.
5. Deploy.
6. Copy its production URL, for example `https://round-selection-demo.vercel.app`.

The demo can build without environment variables. Until `VITE_WEB_URL` is configured, its home link safely falls back to the GitHub repository in production.

### 2. Deploy the Next.js landing

1. Import the same repository as a second Vercel project.
2. Set **Root Directory** to `apps/web`.
3. Confirm the framework preset is **Next.js**.
4. Add `NEXT_PUBLIC_DEMO_URL` with the demo production URL.
5. Apply it to **Production**, **Preview**, and **Development** if desired.
6. Deploy.
7. Copy the landing production URL.

### 3. Link the demo back to the landing

In the demo project's Environment Variables, add:

```text
VITE_WEB_URL=https://your-landing-domain.example
```

Apply it to Production and Preview, then redeploy the demo. Vite exposes client-side variables only when their names start with `VITE_`; Next.js exposes client-side values through `NEXT_PUBLIC_`.

## Preview deployments

Using the stable production URLs for both variables is the simplest setup and keeps every preview functional. For branch-to-branch preview pairing, configure Vercel Related Projects after both Vercel project IDs exist. Each app may then reference the matching deployment of the other project.

## Dashboard settings

For both Vercel projects:

- Node.js Version: `22.x` (also enforced by `package.json`)
- Install Command: automatic
- Skip deployment for unaffected projects: enabled
- Include source files outside Root Directory: enabled
- Production Branch: `main`

No private secrets are required. The two URL variables are intentionally public and are embedded in browser bundles.

## CLI workflow

Vercel recommends linking monorepos from the repository root with a current CLI:

```bash
pnpm dlx vercel@latest link --repo
```

To reproduce a linked project's Vercel build locally:

```bash
pnpm dlx vercel@latest pull
pnpm dlx vercel@latest build
```

Run `vercel link` again to switch between the web and demo Vercel projects in the same checkout.

# Native-ported apps (`src/apps/`)

This folder holds the source of small, self-contained interactive projects ("vibe-coded"
demos) that have been folded directly into the blog rather than iframed or hosted elsewhere.
Astro runs Vite under the hood, so each app's entry module is bundled into the site build —
one `npm run build` ships everything, with fingerprinted assets and no iframe.

Each app lives in `src/apps/<name>/` and is mounted at the route `/apps/<name>/` by a page in
`src/pages/apps/<name>/index.astro`. The first one is `hanoi-explorer`.

## Adding a new project

1. **Copy the source.** From the project's repo, copy its `src/` into `src/apps/<name>/`,
   keeping only the files the entry you want actually imports (drop extra HTML entry points and
   their modules). Imports inside the folder are relative, so nothing needs rewriting.

   ```sh
   mkdir -p src/apps/<name>
   cp -r ../<project>/src/* src/apps/<name>/
   ```

2. **Add runtime deps.** Add anything the app imports from `node_modules` (e.g. `d3-force`) to
   the root `package.json`, then `npm install`. `astro build` transpiles with esbuild and does
   **not** type-check, so missing `@types/*` won't break the build — but the runtime dep must be
   installed for the import to resolve.

3. **Make the page.** Create `src/pages/apps/<name>/index.astro`:
   - Wrap the body markup from the project's entry HTML in `AppLayout` (`src/layouts/AppLayout.astro`),
     **not** `BaseLayout`. `AppLayout` is full-bleed and loads no site CSS, so an app with its
     own global styling stays isolated.
   - Mount the logic with one script tag (Vite bundles it):
     ```astro
     <script>
       import '../../../apps/<name>/<entry>';
     </script>
     ```
     If the entry already does `import './styles.css'`, the CSS is pulled in automatically.

4. **Add a card.** Add a frontmatter-only `src/content/projects/<name>.mdx` with
   `link: "/apps/<name>/"`. The `link` field makes the projects-grid card point straight at the
   app and suppresses the generated writeup detail page (`[...slug].astro` skips entries with a
   `link`). If you'd rather have a prose writeup, omit `link`, give the file a body, and set
   `demo: "/apps/<name>/"` instead — then the card opens the writeup and shows a "Live Demo" button.

5. **Check & ship.** `npm run dev` to verify, `npm run build && npm run preview` for the static
   build.

## Gotchas

- **Keep the live app off `/projects/...`.** The projects collection is served by the rest route
  `src/pages/projects/[...slug].astro`, and the writeup already owns `/projects/<name>/`. Put the
  app at `/apps/<name>/` to avoid a route collision.
- **Full-viewport apps use `AppLayout`.** `BaseLayout` wraps content in a narrow `.container`
  with Header/Footer and the site stylesheets — fine for prose, wrong for an app that wants the
  whole screen and brings its own CSS.
- **This only suits Astro/Vite-compatible stacks** (vanilla TS/JS, or a framework you add an
  Astro integration for). For an arbitrary prebuilt bundle, drop its `dist/` into `public/apps/<name>/`
  (set the project's Vite `base` to `/apps/<name>/`) and iframe/link it instead.

# Sway

[![CI](https://github.com/lafittemehdy/sway/actions/workflows/ci.yml/badge.svg)](https://github.com/lafittemehdy/sway/actions/workflows/ci.yml)
[![Deploy Demo](https://github.com/lafittemehdy/sway/actions/workflows/pages.yml/badge.svg)](https://github.com/lafittemehdy/sway/actions/workflows/pages.yml)
[![npm](https://img.shields.io/npm/v/react-sway)](https://www.npmjs.com/package/react-sway)

An npm workspace for [`react-sway`](https://www.npmjs.com/package/react-sway) and its demo app.

**[Live Demo](https://lafittemehdy.github.io/sway/)**

## What is react-sway?

A React component that turns a list of items into a smooth, infinitely scrolling loop. It supports vertical, horizontal, and perspective depth scrolling, auto-scrolls, pauses when users interact, and works with touch, mouse, wheel, keyboard, edge-hover, and external interaction bridges out of the box.

Vertical and horizontal loops use inert duplicate groups. Depth mode renders each direct child once on its own 3D plane, recycling it at zero opacity before it reaches the camera. The application controls image sizes, offsets, tilt, and surrounding UI.

The demo app uses [`@chenglou/pretext`](https://github.com/chenglou/pretext) for measured text layout. Pretext is scoped to documentation UI copy; it is not part of the `react-sway` package runtime contract.

### Features

- Infinite looping scroll on vertical, horizontal, or depth axes with configurable speed
- Perspective camera and depth spacing controls, toward/away directions, and no depth content duplication
- Edge-hover mode that only auto-scrolls while the pointer is at the active axis boundary, with bounded speed amplification by boundary depth
- Click-and-drag, swipe, normalized mouse wheel, and keyboard controls (Space, Arrow keys, Home/End)
- Axis-aware or full-capture wheel ownership for horizontal rails and embedded showcases
- Imperative `ReactSwayHandle` bridge for external drag/drop surfaces that need to route wheel or edge-hover intent into Sway
- Inert duplicate groups and active-only global drag listeners for safer accessibility and lower idle overhead
- Pauses auto-scroll on user interaction
- Responsive to window resizing
- Visibility hook: add a `content-item` class and react-sway toggles a `.visible` class when elements enter the viewport

Check out the [react-sway README](./react-sway/README.md) for full API docs and usage examples.

## Project structure

```
sway/
  docs/          # Demo app source with Pretext-measured showcase copy
  react-sway/    # Publishable npm package
```

## Getting started

Use Node.js 22.22.2+, 24.15+, or 26+ with npm 12.2.2. The root lockfile is
shared by the library and demo. TypeScript stays on 6.0.3 because the current
ESLint TypeScript parser requires TypeScript below 6.1.

```bash
git clone https://github.com/lafittemehdy/sway.git
cd sway
npm install --global npm@12.2.2
npm ci
npm run dev
```

The root manifest is the sole workspace authority. npm links `react-sway/`
directly into the demo dependency graph, and the repository commits exactly one
root `package-lock.json`. The demo runs at `http://localhost:5173` by default.

## Scripts

| Command                   | Description                                                  |
| ------------------------- | ------------------------------------------------------------ |
| `npm run build`           | Build the demo for production                                |
| `npm run build:package`   | Build the publishable package and declarations               |
| `npm run check`           | Verify workspace integrity, lint, test, and build everything |
| `npm run check:workspace` | Validate root manifests, lockfile ownership, and local links |
| `npm run check:package`   | Pack the built library and verify ESM, CJS, and SSR with React 17/18/19 (requires registry access) |
| `npm run dev`             | Start the demo dev server against package source             |
| `npm run lint`            | Lint the complete workspace                                  |
| `npm run preview`         | Preview the production build locally                         |
| `npm run typecheck`       | Typecheck the demo, package, and browser tests                |
| `npm run test:browser`    | Test the built demo in Chromium (install with `npx playwright install chromium`) |
| `npm run test`            | Run the `react-sway` contract and regression tests           |

The development-only `minimatch` override keeps the toolchain on the patched
11.x release while upstream lint dependencies finish updating their ranges.
`npm audit` currently reports no known vulnerabilities.

The playground includes project links, a motion pause control, a depth image gallery, and automatic
pause when the OS requests reduced motion. The vertical stream uses one set of
posts; ReactSway supplies the repetitions needed to fill its viewport.

## CI/CD

This repo uses GitHub Actions for automation:

- **Test** (`ci.yml`) runs lint, type checks, and tests on Node 22, 24, and 26, plus dependency audit, package packing, demo build, and Chromium smoke tests.
- **Deploy Demo** (`pages.yml`) builds and deploys the demo to GitHub Pages when relevant files change on `main`.
- **Publish** (`publish.yml`) publishes `react-sway` to npm when a GitHub release is created.

Deployment uses the Pages workflow only. To deploy the committed `main` branch,
run `gh workflow run pages.yml` or use **Run workflow** in GitHub Actions. The old
`gh-pages` CLI and its vulnerable dependency chain have been removed.

## Contributing

Contributions are welcome! Open an issue or submit a pull request.

## License

[MIT](./LICENSE)

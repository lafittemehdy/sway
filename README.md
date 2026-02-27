# Sway

[![CI](https://github.com/lafittemehdy/sway/actions/workflows/ci.yml/badge.svg)](https://github.com/lafittemehdy/sway/actions/workflows/ci.yml)
[![Deploy Demo](https://github.com/lafittemehdy/sway/actions/workflows/pages.yml/badge.svg)](https://github.com/lafittemehdy/sway/actions/workflows/pages.yml)
[![npm](https://img.shields.io/npm/v/react-sway)](https://www.npmjs.com/package/react-sway)

A monorepo for [`react-sway`](https://www.npmjs.com/package/react-sway) and its demo app.

**[Live Demo](https://lafittemehdy.github.io/sway/)**

## What is react-sway?

A React component that turns a list of items into a smooth, infinitely scrolling loop. It auto-scrolls, pauses when users interact, and works with touch, mouse, wheel, and keyboard out of the box.

Under the hood it duplicates your content with CSS transforms to keep things seamless. The duplicated blocks are wrapped in `<aside>` elements with `aria-hidden="true"` so screen readers and search engines aren't confused.

### Features

- Infinite looping scroll with configurable speed
- Click-and-drag, swipe, mouse wheel, and keyboard controls (Space, ArrowUp/Down, Home/End)
- Pauses auto-scroll on user interaction
- Responsive to window resizing
- Visibility hook: add a `content-item` class and react-sway toggles a `.visible` class when elements enter the viewport

Check out the [react-sway README](./react-sway/README.md) for full API docs and usage examples.

## Project structure

```
sway/
  docs/         # Demo app source
  react-sway/   # The npm package
```

## Getting started

```bash
git clone https://github.com/lafittemehdy/sway.git
cd sway
npm install
npm run dev
```

The demo runs at `http://localhost:5173` by default.

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the demo dev server            |
| `npm run build`     | Build the demo for production        |
| `npm run lint`      | Lint the whole monorepo              |
| `npm run preview`   | Preview the production build locally |
| `npm run deploy`    | Deploy the demo to GitHub Pages      |

## CI/CD

This repo uses GitHub Actions for automation:

- **Test** (`ci.yml`) runs lint and tests on Node 22 and 24 for every push and PR to `main`.
- **Deploy Demo** (`pages.yml`) builds and deploys the demo to GitHub Pages when relevant files change on `main`.
- **Publish** (`publish.yml`) publishes `react-sway` to npm when a GitHub release is created.

## Contributing

Contributions are welcome! Open an issue or submit a pull request.

## License

[MIT](./LICENSE)

# Changelog

## 0.5.1 - 2026-11-14

- Fix public declaration imports for strict NodeNext consumers and verify React version compatibility against packed artifacts.

- Update dependencies and example applications to current compatible stable releases.
- Include contribution guidelines, the Contributor Covenant, and a private security reporting policy in the repository and npm package.
- Update lint, build, DOM testing, and Vite dependencies; retain TypeScript 6 while compiler API tools require it.

## 0.5.0 - 2026-11-09

- Add perspective depth scrolling with toward/away directions and configurable camera distance and plane spacing.
- Mount each depth child once and recycle only at zero opacity without crossing the camera.
- Share wheel, drag, touch, keyboard, pause, and lifecycle behavior across all three axes.
- Add `active` and `reducedMotion` for host lifecycle and accessibility integration; preserve React 17/18/19 and existing planar behavior.
- Add responsive depth documentation and browser coverage, plus geometry and lifecycle regressions.
- Make the ESM build directly importable in Node with React 17, and verify packed ESM/CJS/SSR consumers on React 17/18/19.
- Update development dependencies and npm, test Node 22/24/26, and resolve all known dependency audit findings. Keep TypeScript 6.0.3 for ESLint parser compatibility.

## 0.4.3 - 2026-10-21

- Preserve browser zoom gestures, nested controls, and secondary mouse clicks.
- Stop external edge-hover motion when edge-hover mode is disabled.
- Preserve inert duplicate groups on React 17 and 18 as well as React 19.
- Update the development toolchain; keep TypeScript 6 for parser compatibility.

## 0.4.0

- Added horizontal and vertical axis semantics with page-safe touch behavior.
- Added bounded edge-hover acceleration, configurable zone geometry, and public defaults.
- Added external pointer and wheel routing through `ReactSwayHandle`.
- Added axis-aware and full-capture wheel ownership modes.
- Added a consumer `className` hook and stricter numeric input normalization.
- Corrected the peer contract to React 17 or newer, matching the published JSX runtime imports.
- Improved loop measurement, listener cleanup, reduced-motion behavior, accessibility, and regression coverage.

## 0.3.1

- Updated development dependencies without changing the package runtime contract.

## 0.3.0

- Established the previous public ReactSway package contract.

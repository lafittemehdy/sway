# Sway Monorepo

This repository contains the `react-sway` package and a demo application (Sway) showcasing its capabilities. `react-sway` helps you create smooth, infinitely scrolling content streams with minimal setup.

**See the Demo:** [lafittemehdy.github.io/sway/](https://lafittemehdy.github.io/sway/)

[![pages-build-deployment](https://github.com/lafittemehdy/sway/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/lafittemehdy/sway/actions/workflows/pages/pages-build-deployment)

## Project Structure

This is a monorepo managed with npm workspaces.

*   `react-sway/`: The core `react-sway` npm package.
    *   See [`react-sway/README.md`](./react-sway/README.md) for detailed usage and API documentation.
*   `docs/`: The source code for the demo application (Sway) that uses `react-sway`.

## What's `react-sway`?

React Sway takes your list of items and makes them scroll endlessly. It's designed to be easy to use and performant, with auto-scrolling that pauses when users interact.
It works by duplicating your content to create a seamless loop and uses CSS transforms for smooth animation. The duplicated content is wrapped in `<aside>` elements with `aria-hidden="true"` and `role="presentation"` to ensure good accessibility and helps search engines understand the content structure.

### Core Features of `react-sway`

*   **Smooth Infinite Scroll:** Content loops continuously.
*   **Auto-Scroll:** Scrolls automatically, with configurable speed.
*   **User Friendly Interactions:**
    *   Click and drag to scroll.
    *   Swipe on touch devices.
    *   Mouse wheel support.
    *   Keyboard controls: Spacebar to pause/resume, ArrowUp/ArrowDown to scroll, Home/End to jump.
*   **Responsive:** Adjusts to window resizing.
*   **Lazy Loading Hook:** Add a `content-item` class to your child elements, and `react-sway` will add a `.visible` class when they enter the viewport. Handy for animations or loading content.

For detailed information on how to use `react-sway`, its props, and styling, please see the [**`react-sway` package README**](./react-sway/README.md).

## Running the Demo Project (Sway)

This repo includes a demo app to see `react-sway` in action.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/lafittemehdy/sway.git
    cd sway
    ```

2.  **Install dependencies:**
    (This will install dependencies for both the root and the `react-sway` package)
    ```bash
    npm install
    ```

3.  **Run the demo:**
    ```bash
    npm run dev
    ```
    The demo will usually be available at `http://localhost:5173`.

## Demo Project Scripts

*   `npm run dev`: Start dev server for the demo application.
*   `npm run build`: Build the demo application for production.
*   `npm run lint`: Check code with ESLint for the entire monorepo.
*   `npm run preview`: Serve the production build of the demo locally.
*   `npm run deploy`: Push the `dist` folder (demo build output) to GitHub Pages.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](./LICENSE).

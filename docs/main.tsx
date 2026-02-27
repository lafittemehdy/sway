/**
 * Docs app bootstrap entrypoint.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing #root element in index.html. Unable to mount the docs app.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Shared testing-library setup for Vitest.
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom does not implement matchMedia — provide a default mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

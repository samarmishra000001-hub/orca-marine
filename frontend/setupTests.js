import '@testing-library/jest-dom';
import { vi } from 'vitest';

Element.prototype.scrollIntoView = function() {};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock maplibregl
vi.mock('maplibre-gl', () => {
  return {
    default: {
      supported: () => true,
      Map: vi.fn(() => ({
        addControl: vi.fn(),
        on: vi.fn(),
        remove: vi.fn(),
        setProjection: vi.fn(),
      })),
      NavigationControl: vi.fn(),
      AttributionControl: vi.fn(),
      Popup: vi.fn(),
    }
  };
});


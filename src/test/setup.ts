import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees between tests. Harmless in the node environment.
afterEach(() => {
  cleanup();
});

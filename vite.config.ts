/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { precacheManifest } from './scripts/precache-plugin.mjs';

export default defineConfig({
  plugins: [react(), precacheManifest()],
  test: {
    environment: 'node',
    css: { include: /tokens\.css/ },
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'functions/**/*.test.ts'],
  },
});

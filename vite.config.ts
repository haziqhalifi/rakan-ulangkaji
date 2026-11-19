/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { precacheManifest } from './scripts/precache-plugin.mjs';

// GitHub Pages builds set BASE_PATH=/rakan-ulangkaji/. Cloudflare Pages and local dev use '/'.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const base = env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react(), precacheManifest()],
  test: {
    environment: 'node',
    css: { include: /tokens\.css/ },
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'functions/**/*.test.ts'],
  },
});

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Writes dist/precache-manifest.json (shell files only, lazy chunks excluded)
 * and stamps a build id into dist/sw.js.
 */
export function precacheManifest() {
  let outDir = 'dist';
  let files = [];
  return {
    name: 'rakan-precache-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    generateBundle(_options, bundle) {
      const shell = new Set(['/', '/index.html', '/manifest.webmanifest']);
      const addChunk = (name) => {
        const item = bundle[name];
        if (!item || item.type !== 'chunk' || shell.has('/' + name)) return;
        shell.add('/' + name);
        item.imports.forEach(addChunk); // static imports only, dynamic ones stay lazy
        const css = item.viteMetadata?.importedCss;
        css?.forEach((c) => shell.add('/' + c));
      };
      for (const [name, item] of Object.entries(bundle)) {
        if (item.type === 'chunk' && item.isEntry) addChunk(name);
      }
      files = [...shell].sort();
    },
    closeBundle() {
      const icons = join('public', 'icons');
      const iconFiles = existsSync(icons) ? readdirSync(icons).map((f) => '/icons/' + f) : [];
      const all = [...new Set([...files, ...iconFiles])].sort();
      const buildId = createHash('sha256').update(all.join('|')).update(String(Date.now())).digest('hex').slice(0, 10);
      writeFileSync(join(outDir, 'precache-manifest.json'), JSON.stringify({ buildId, files: all }, null, 2));
      const swPath = join(outDir, 'sw.js');
      if (existsSync(swPath)) {
        writeFileSync(swPath, readFileSync(swPath, 'utf8').replace("'__BUILD_ID__'", "'" + buildId + "'"));
      }
    },
  };
}

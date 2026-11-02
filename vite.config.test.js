import { describe, it, expect } from 'vitest';
import workflow from './.github/workflows/deploy.yml?raw';
import indexHtml from './index.html?raw';
import config from './vite.config.js';

const runLines = workflow
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.startsWith('run:'))
  .map((l) => l.slice(4).trim());

describe('US-138 CI workflow and Pages compatibility', () => {
  it('AC 1: workflow runs npm ci, lint, test:run and build in order', () => {
    expect(runLines).toEqual(['npm ci', 'npm run lint', 'npm run test:run', 'npm run build']);
    expect(workflow).not.toMatch(/continue-on-error/);
  });

  it('AC 2: base path is the repo path and the entry script is base-resolvable', () => {
    expect(config.base).toBe('/wwe-universe/');
    // Vite prefixes root-absolute src/href with `base` at build time; no external or relative-up URLs.
    const urls = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
    for (const url of urls) expect(url.startsWith('/') && !url.startsWith('//')).toBe(true);
  });

  it('AC 3: trigger, permissions, artifact upload and deploy job are unchanged', () => {
    expect(workflow).toMatch(/branches:\n\s+- main\n/);
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('uses: actions/upload-pages-artifact@v3');
    expect(workflow).toContain('path: ./dist');
    expect(workflow).toContain('uses: actions/deploy-pages@v4');
    expect(workflow).toContain('needs: build');
    expect(workflow).toContain('cache: npm');
  });
});

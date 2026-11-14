/** Checks packed ESM, CommonJS, and SSR contracts against supported React majors. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.env.npm_execpath;
assert(npm, 'Run through npm run check:package after building the package');
const directory = mkdtempSync(join(tmpdir(), 'react-sway-'));
const runNpm = (args, cwd) => execFileSync(process.execPath, [npm, ...args], { cwd, encoding: 'utf8', timeout: 120_000 });
try {
  const packed = JSON.parse(runNpm(['pack', '--workspace=react-sway', '--json', `--pack-destination=${directory}`], root))['react-sway'];
  const tarball = join(directory, packed.filename);
  for (const major of [17, 18, 19]) {
    const cwd = join(directory, `react-${major}`);
    mkdirSync(cwd);
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    runNpm(['install', '--no-fund', '--no-audit', tarball, `react@${major}`, `react-dom@${major}`, "typescript@7.0.2", `@types/react@${major}`, `@types/react-dom@${major}`], cwd);
    const declaration = "import { createElement } from 'react'; import { ReactSway } from 'react-sway'; createElement(ReactSway, { axis: 'depth', children: 'Example' });";
    for (const extension of ['mts', 'cts']) writeFileSync(join(cwd, `consumer.${extension}`), declaration);
    writeFileSync(join(cwd, 'tsconfig.json'), JSON.stringify({ compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', target: 'ES2022', strict: true, noEmit: true, types: [] }, include: ['consumer.*ts'] }));
    execFileSync(process.execPath, [join(cwd, 'node_modules/typescript/bin/tsc'), '-p', cwd], { cwd, stdio: 'inherit' });
    writeFileSync(join(cwd, 'probe.mjs'), `
      import assert from 'node:assert/strict';
      import { createRequire } from 'node:module';
      import React from 'react';
      import * as esm from 'react-sway';
      const require = createRequire(import.meta.url);
      const { renderToStaticMarkup } = require('react-dom/server');
      for (const library of [esm, require('react-sway')]) {
        assert.equal(library.DEFAULT_DEPTH_PERSPECTIVE, 800);
        assert.equal(library.DEFAULT_DEPTH_SPACING, 420);
        const child = React.createElement('button', { id: 'identity', key: 'child' }, 'Open');
        const depth = renderToStaticMarkup(React.createElement(library.ReactSway, { axis: 'depth', direction: 'toward', active: false }, child));
        assert.equal((depth.match(/id="identity"/g) || []).length, 1);
        assert(depth.includes('perspective:800px'));
        assert(!depth.includes('data-duplicate'));
        const planar = renderToStaticMarkup(React.createElement(library.ReactSway, { axis: 'horizontal' }, child));
        assert(planar.includes('data-duplicate="true"'));
        assert(planar.includes('inert=""'));
      }
      console.log('React ' + React.version + ': ESM, CJS, depth SSR and planar compatibility passed');
    `);
    process.stdout.write(execFileSync(process.execPath, ['probe.mjs'], { cwd, encoding: 'utf8' }));
  }
} finally {
  assert(dirname(directory) === resolve(tmpdir()) && basename(directory).startsWith('react-sway-'));
  rmSync(directory, { force: true, recursive: true });
}

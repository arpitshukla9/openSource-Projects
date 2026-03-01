const esbuild = require('esbuild');
const path = require('path');

const baseConfig = {
  bundle: true,
  entryPoints: [path.resolve(__dirname, 'src/extension.ts')],
  outfile: path.resolve(__dirname, 'dist/extension.js'),
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'ES2020',
  sourcemap: true,
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  esbuild
    .context(baseConfig)
    .then((ctx) => ctx.watch())
    .catch(() => process.exit(1));
} else {
  esbuild
    .build(baseConfig)
    .catch(() => process.exit(1));
}

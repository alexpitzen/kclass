import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const commonOptions = {
    bundle: true,
    format: 'iife',
    globalName: 'kclass',
    minify: false,
    sourcemap: false,
};

// Build the Preact UI components
await esbuild.build({
    ...commonOptions,
    entryPoints: ['src/kclass.jsx'],
    outfile: 'templates/kclass_preact.js',
    loader: { '.js': 'jsx' },
    jsx: 'automatic',
    jsxImportSource: 'preact',
});

if (isWatch) {
    const ctx = await esbuild.context({
        ...commonOptions,
        entryPoints: ['src/kclass.jsx'],
        outfile: 'templates/kclass_preact.js',
        loader: { '.js': 'jsx' },
        jsx: 'automatic',
        jsxImportSource: 'preact',
    });
    await ctx.watch();
    console.log('Watching for changes...');
}

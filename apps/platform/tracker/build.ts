export {}

const result = await Bun.build({
  entrypoints: ['./tracker/src/index.ts'],
  format: 'esm',
  minify: true,
  naming: 't.js',
  outdir: './public',
  target: 'browser',
})

if (!result.success) {
  console.error('Tracker build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

const file = Bun.file('./public/t.js')
const size = file.size
const sizeKb = (size / 1024).toFixed(2)

// eslint-disable-next-line no-console
console.log(`Tracker built: public/t.js (${sizeKb} KB)`)

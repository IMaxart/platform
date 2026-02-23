# Benchmarks

Performance benchmarks for the IMaxart Analytics platform.

## SDK Bundle Size

Tracked with [size-limit](https://github.com/ai/size-limit) in the SDK package:

```bash
cd packages/analytics
bun run build
bun run size
```

Limits:

- Core (`dist/index.mjs`): < 5 KB gzip
- React (`dist/react.mjs`): < 2 KB gzip

## API Load Tests

Load tests use [k6](https://k6.io/). Install k6 first:

```bash
# macOS
brew install k6

# Docker
docker run --rm -i grafana/k6 run - <benchmarks/collect.js
```

### Collect endpoint

```bash
k6 run benchmarks/collect.js
```

Ramps up to 100 concurrent VUs sending session payloads to `/api/collect`.

### Feature flags endpoint

```bash
k6 run benchmarks/flags.js
```

Tests flag resolution performance under load.

### Custom base URL

```bash
k6 run -e BASE_URL=https://analytics.yourdomain.com benchmarks/collect.js
```

## Lighthouse CI

For tracking Core Web Vitals, use [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci):

```bash
npm install -g @lhci/cli
lhci autorun --config=lighthouserc.json
```

Configure `lighthouserc.json` at the project root to match your deployment URL.

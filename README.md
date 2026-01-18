# manager

## Setup

```bash
cp .example.env .env
# Edit .env with your values
```

## Development

```bash
# Install dependencies
bun install

# Start the API server (runs on port 3000)
bun run src/server/index.ts

# In a separate terminal, start the Vite dev server
bunx vite
```

The Vite dev server proxies `/api` requests to the backend automatically.

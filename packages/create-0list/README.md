# create-0list

CLI to scaffold and deploy [0list](https://0list.d4mr.com) - self-hosted waitlist software for Cloudflare Workers.

## Usage

```bash
# npm
npx create-0list

# pnpm
pnpm create 0list

# bun
bun create 0list

# yarn
yarn create 0list
```

## What it does

1. Clones the 0list repository
2. Sets up upstream remote for easy updates (`git pull upstream main`)
3. Installs dependencies with your preferred package manager
4. Optionally creates a Cloudflare D1 database
5. Configures `wrangler.toml` with your database ID
6. Runs database migrations

## Requirements

- Node.js >= 18
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)

## Features

- **Edge-native**: Runs on Cloudflare Workers in 300+ locations
- **D1 database**: SQLite at the edge, no external database needed
- **Self-hosted**: Your data, your infrastructure
- **Open source**: MIT licensed, fork and customize

## Documentation

Full documentation available at [0list.d4mr.com/docs](https://0list.d4mr.com/docs)

## License

MIT

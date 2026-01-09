<p align="center">
  <img src="https://0list.d4mr.com/og/home.webp" alt="0list - Self-hosted waitlist software" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/d4mr/0list/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/create-0list"><img src="https://img.shields.io/npm/v/create-0list.svg" alt="npm version"></a>
  <a href="https://workers.cloudflare.com/"><img src="https://img.shields.io/badge/runs%20on-Cloudflare%20Workers-F38020.svg" alt="Cloudflare Workers"></a>
</p>

<p align="center">
  <b>Fast, free, and forever yours.</b><br/>
  Deploy your own waitlist to Cloudflare Workers in minutes.
</p>

<p align="center">
  <a href="https://0list.d4mr.com">Website</a> •
  <a href="https://0list.d4mr.com/docs">Documentation</a> •
  <a href="https://0list.d4mr.com/docs/getting-started">Getting Started</a> •
  <a href="https://0list.d4mr.com/docs/api">API Reference</a>
</p>

---

## Quick Start

```bash
npx create-0list
```

The CLI will guide you through:
1. Creating your project
2. Setting up Cloudflare D1 database
3. Running migrations
4. Starting the dev server

That's it. Your waitlist is ready.

<details>
<summary>Other package managers</summary>

```bash
# pnpm
pnpm create 0list

# bun
bun create 0list

# yarn
yarn create 0list
```

</details>

## Why 0list?

Most waitlist solutions are SaaS products that charge per signup, lock you into their platform, and store your user data on their servers.

**0list is different:**

| Feature | 0list | Typical SaaS |
|---------|-------|--------------|
| **Cost** | Free forever | $29-99/mo |
| **Data ownership** | 100% yours | Their servers |
| **Vendor lock-in** | None | High |
| **Customization** | Full source access | Limited |
| **Performance** | Edge (300+ locations) | Single region |

## Features

### Core

- **Edge-native** — Runs on Cloudflare Workers in 300+ locations worldwide. Sub-50ms response times globally.
- **D1 Database** — SQLite at the edge. No external database to provision, manage, or pay for.
- **Self-hosted** — Deploy to your own Cloudflare account. Your data never touches third-party servers.
- **Open source** — MIT licensed. Fork it, modify it, make it yours.

### Admin Dashboard

- **Real-time analytics** — Track signups, confirmations, and conversion rates
- **Traffic sources** — See where your signups are coming from with UTM tracking
- **Multiple waitlists** — Manage unlimited waitlists from one dashboard
- **Export data** — Download your signups as CSV anytime

### Email & Integrations

- **Double opt-in** — Optional email confirmation to verify signups
- **Custom templates** — Fully customizable email templates with React Email
- **Resend integration** — Transactional emails via Resend (or bring your own provider)
- **REST API** — Full API for custom integrations and workflows

### Security

- **Cloudflare Access** — Protect your admin dashboard with zero-trust authentication
- **Rate limiting** — Built-in protection against abuse
- **No tracking** — No analytics, no cookies, no third-party scripts

## Project Structure

```
├── apps/
│   ├── api/          # Hono backend (Cloudflare Workers)
│   ├── web/          # React admin dashboard
│   ├── www/          # Marketing website (Astro)
│   └── public/       # Embeddable signup widget
├── packages/
│   └── create-0list/ # CLI scaffolding tool
```

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](https://0list.d4mr.com/docs/getting-started) | Deploy your first waitlist in 5 minutes |
| [Configuration](https://0list.d4mr.com/docs/configuration) | Environment variables and settings |
| [API Reference](https://0list.d4mr.com/docs/api) | REST API documentation |
| [Email Templates](https://0list.d4mr.com/docs/emails) | Customize confirmation emails |
| [Cloudflare Access](https://0list.d4mr.com/docs/cloudflare-access) | Secure your admin dashboard |

## Development

```bash
# Clone the repo
git clone https://github.com/d4mr/0list.git
cd 0list

# Install dependencies
bun install

# Set up local D1 database
bun run db:migrate:local

# Start dev server
bun dev
```

The dev server runs:
- **API** at `http://localhost:8787`
- **Admin dashboard** at `http://localhost:5173`
- **Marketing site** at `http://localhost:4321`

## Deployment

```bash
# Deploy to Cloudflare Workers
bun run deploy
```

See the [deployment guide](https://0list.d4mr.com/docs/getting-started) for detailed instructions.

## Staying Updated

0list is designed to receive updates easily. When you scaffold with `create-0list`, the upstream remote is configured automatically:

```bash
# Pull latest updates
git pull upstream main

# Resolve any conflicts, then deploy
bun run deploy
```

## Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **Backend**: [Hono](https://hono.dev/)
- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Emails**: [React Email](https://react.email/) + [Resend](https://resend.com/)
- **Marketing**: [Astro](https://astro.build/)

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © [d4mr](https://github.com/d4mr)

---

<p align="center">
  <sub>Built with 🧡 for the Cloudflare ecosystem</sub>
</p>

# Aegis

A security operations themed dashboard web app built with Next.js, TypeScript, Tailwind CSS, and framer-motion. It streams a simulated live attack log feed, runs a threat analysis workflow through the `useAttackAnalysis` hook, and shows the results in an engineer view with a mitigation script plus a CISO style post-mortem.

This is a demo project, not a real SOC tool. Every log line, attack, IP address, and report on screen is generated locally by the app.

## Features

- Simulated live log feed with INFO, WARN, and CRIT lines streaming into a terminal panel.
- A Simulate Attack button (or Ctrl+Shift+D) that moves the dashboard through its idle, analyzing, and mitigated states using the `useAttackAnalysis` hook.
- Threat summary card with attack type, source IP, target node, confidence, and detection time.
- Engineer view with a copyable iptables mitigation command.
- An automated CISO post-mortem report.
- Optional AI threat analysis through a local Ollama instance running the Qwen model, with static fallback behavior when it is offline.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) with React and TypeScript
- Tailwind CSS for styling
- framer-motion for animations
- lucide-react icons and react-syntax-highlighter

## Prerequisites

- Node.js 20.9 or later
- pnpm (the repo ships a pnpm lock file)

## Getting started

Install the dependencies:

```bash
pnpm install
```

Then run the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Production build

```bash
pnpm build
pnpm start
```

To check code quality, run:

```bash
pnpm lint
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | URL of the optional analysis backend polled by `/api/health` and called by `/api/simulate-attack` |

The app works without this backend. Failed requests surface as a dismissible banner and the dashboard keeps running on its own simulation data. For the AI analysis banner to clear, install [Ollama](https://ollama.com/download) and run `ollama run qwen2.5:3b`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server from the repository root (this repo uses pnpm only):

```bash
pnpm --filter emitmail-dashboard dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The dashboard overview lives in `app/(dashboard)/page.tsx`, and the login page in `app/login/page.tsx`. The page auto-updates as you edit the file.

## UI conventions

- Design tokens (Inter font via `next/font`, typography scale, colors, button classes) are defined in `app/globals.css`.
- The documented standards are in the **"EmitMail Dashboard — Implemented Design Standards"** section of the root `Design.md`. Follow them and update both together when a token or component size changes.
- Reuse the shared components in `components/ui` and `components/layout`, and the typography utilities (`text-page-title`, `text-section`, `text-metric`, `text-body`, `text-table`, `text-support`, `text-meta`, `text-label`, `text-nav`, `text-control`). Avoid arbitrary font sizes and one-off spacing or colors.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# ClickGuard Threat Monitoring

A deterministic React prototype for explaining cumulative invalid-traffic decisions. It contains a token package, a reusable UI package with Storybook, and the Vite prototype that consumes `@clickguard/ui` exclusively.

## Run locally

```sh
pnpm install
pnpm dev
```

Storybook runs with `pnpm storybook`. The complete verification suite is `pnpm check`.

## Demo paths

- Click the top **Blocked** visitor to inspect the click-farm journey.
- Open **Needs review** for ambiguous visitors and mitigating evidence.
- Switch **Visitors / Visits**, sort columns, expand a row, or use `/` to focus search.
- Add `?simulate=empty`, `?simulate=error`, or `?simulate=slow` to exercise global states.

## Deployments

- Prototype: https://clickguard-prototype-rho.vercel.app
- Storybook: https://clickguard-storybook-omega.vercel.app

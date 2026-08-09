# Cloudflare cloud automation migration

This site can run its daily update in GitHub Actions and deploy the built
Cloudflare Worker with Wrangler. After this is connected, the morning update no
longer depends on the local Codex desktop app or this computer being awake.

## What the workflow does

1. Runs around 5:15 AM America/Toronto every day.
2. Installs dependencies with pnpm.
3. Runs `pnpm run update:schedule`.
4. Builds the Worker with `pnpm run build`.
5. Commits `app/schedule-data.ts` only when the schedule changed.
6. Deploys with Wrangler.

The workflow is also manually runnable from GitHub Actions.

## Required GitHub secrets

Set these in the GitHub repository under Settings > Secrets and variables >
Actions:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token for deploying Workers.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.
- `CLOUDFLARE_CUSTOM_DOMAIN`: optional. Set to `torontoswim.ca` after the domain
  is managed by the same Cloudflare account.

If `CLOUDFLARE_CUSTOM_DOMAIN` is omitted, Wrangler deploys the Worker without
claiming the custom domain. This is useful for a safe first deployment test.

## Cloudflare domain requirement

To use `torontoswim.ca` as a Cloudflare Worker custom domain, the domain must be
in the same Cloudflare account as the Worker. If the domain is still managed
only at Web Hosting Canada, add the domain to Cloudflare first and update the
nameservers at Web Hosting Canada.

Do not disable the local Codex automation until a manual GitHub Actions run has
successfully deployed and the custom domain has been verified.


# CRM App

Starter monorepo for a company CRM with:

- `client`: Next.js frontend
- `server`: Node.js + Express backend
- `server/prisma`: Prisma schema and database models
- `docs`: product and technical documentation

## Getting started

1. Copy `.env.example` to `.env`
2. Install dependencies in the root, `client`, and `server`
3. Run Prisma migrations from `server`:
   - `npx prisma migrate deploy` (or `npx prisma migrate dev` in local development)
4. Add Google Workspace OAuth variables in `server/.env` for Superadmin integration:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (example: `http://localhost:5000/api/integrations/google/callback`)
   - `GOOGLE_LOGIN_REDIRECT_URI` (example: `http://localhost:5000/api/auth/google/callback`)
   - `CLIENT_URL` (example: `http://localhost:3000`)
5. Start the frontend with `npm run dev:client`
6. Start the backend with `npm run dev:server`

## Suggested first modules

- Authentication and roles
- Leads and pipeline management
- Contacts and companies
- Tasks and follow-ups
- Notes and activity timeline
- Dashboard and reporting

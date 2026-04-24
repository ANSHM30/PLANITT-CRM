# CRM Architecture

## Frontend

- Next.js App Router
- Feature-oriented UI under `components/modules`
- Shared UI primitives in `components/ui`

## Backend

- Express routes call controllers
- Controllers delegate to services
- Prisma handles persistence

## Core CRM domains

- Users
- Leads
- Contacts
- Companies
- Deals
- Tasks
- Activities

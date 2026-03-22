# LifeLine Backend

Secure Express backend for LifeLine Response with JWT auth, RBAC, emergency dispatch APIs, and pluggable persistence for MongoDB or MySQL.

## Features
- JWT authentication with password hashing
- Role-based authorization (`user`, `hospital`, `admin`)
- Security hardening (`helmet`, CORS, rate limit, query/body sanitization)
- Emergency resource assignment (nearest ambulance + suitable hospital)
- MongoDB and MySQL support via `DB_PROVIDER`
- Auto-seeding demo users/hospitals/ambulances

## Quick Start
1. Install dependencies:
   npm install
2. Create env file:
   copy .env.example .env
3. Set DB connection values in `.env`
4. Run development server:
   npm run dev

## Seeded Login Accounts
Password for all seeded users: `Password@123`
- User: `user@resqroute.in`
- Hospital: `hospital@resqroute.in`
- Admin: `admin@resqroute.in`

## API Base URL
`http://localhost:3001/api`

## Core Endpoints
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /hospitals`
- `PATCH /hospitals/:id/beds`
- `GET /ambulances`
- `PATCH /ambulances/:id/status`
- `POST /emergencies`
- `GET /emergencies`
- `GET /emergencies/:id`
- `PATCH /emergencies/:id/status`
- `POST /emergencies/:id/assign`
- `GET /admin/summary`
- `GET /location/geocode?q=<address>`
- `GET /location/reverse?lat=<lat>&lng=<lng>`

## Auth Header
For protected routes use:
Authorization: Bearer <token>

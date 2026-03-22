# ResQRoute

AI-assisted emergency response platform with:
- A React + Vite frontend for User, Hospital, and Admin dashboards
- A secure Express backend with JWT auth, RBAC, geocoding endpoints, and dispatch services

This repository contains both applications:
- Frontend at the repo root
- Backend in lifeline-backend

## Table of Contents

- Overview
- Current Features
- Tech Stack
- Project Structure
- Prerequisites
- Local Setup
- Environment Variables
- Running the Apps
- Available Scripts
- Demo Accounts
- API Overview
- Testing
- Troubleshooting

## Overview

ResQRoute simulates and supports emergency workflow optimization:
- Role-based access for user, hospital, and admin
- Emergency request intake and tracking UI
- Ambulance and hospital selection logic with distance and availability factors
- Geocoding and reverse-geocoding endpoints
- Security-first backend configuration

## Current Features

### Frontend
- Role selection flow with dedicated dashboards:
	- User dashboard
	- Hospital dashboard
	- Admin dashboard
- Protected routes by role
- Emergency request form and status progression UI
- Map integration via React Leaflet
- Location search and reverse geocoding integration hooks
- Analytics visualizations for admin view
- Tailwind + shadcn/ui based component system

### Backend
- Express API mounted under /api
- Health, auth, emergency, hospital, ambulance, admin, and location routes
- JWT authentication and role-based authorization
- Request hardening with helmet, rate limiting, HPP, and sanitization
- Pluggable persistence provider:
	- MongoDB
	- MySQL
- Seed service for demo data/users

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite 5
- React Router
- Tailwind CSS + shadcn/ui
- React Leaflet + Leaflet
- Recharts
- Vitest + Testing Library

### Backend
- Node.js + Express 5
- MongoDB (mongoose) or MySQL (mysql2)
- JWT (jsonwebtoken)
- Zod validation
- Security middleware (helmet, cors, express-rate-limit, hpp, express-mongo-sanitize)

## Project Structure

frontend (root)
- src
	- pages
	- components
	- context
	- data

backend
- lifeline-backend
	- src
		- routes
		- middleware
		- services
		- db
		- config

## Prerequisites

- Node.js 18+ recommended
- npm 9+ (or Bun if preferred for frontend dependencies)
- One database provider:
	- MongoDB, or
	- MySQL

## Local Setup

1. Clone and enter the repository.
2. Install frontend dependencies from repo root:

	 npm install

3. Install backend dependencies:

	 cd lifeline-backend
	 npm install

4. Configure backend environment:

	 copy .env.example .env

5. Update lifeline-backend/.env for your database and JWT secret.

## Environment Variables

Backend environment file: lifeline-backend/.env

Important variables:
- NODE_ENV=development
- PORT=3001
- DB_PROVIDER=mongo or mysql
- MONGO_URI=mongodb://127.0.0.1:27017/lifeline_response
- MYSQL_HOST=localhost
- MYSQL_PORT=3306
- MYSQL_USER=root
- MYSQL_PASSWORD=yourpassword
- MYSQL_DATABASE=lifeline_response
- JWT_SECRET=change-this-super-secret-key
- JWT_EXPIRES_IN=1h
- FRONTEND_ORIGIN=http://localhost:8080,http://localhost:5173

Frontend optional variable (if you want to override default backend URL):
- VITE_API_BASE_URL=http://localhost:3001/api

If VITE_API_BASE_URL is not set, the frontend defaults to http://localhost:3001/api.

## Running the Apps

### Start backend

From lifeline-backend:

npm run dev

Backend default URL:
- http://localhost:3001

### Start frontend

From repository root:

npm run dev

Frontend default URL:
- http://localhost:5173

Run both servers at the same time in separate terminals.

## Available Scripts

### Root (frontend)
- npm run dev: start Vite dev server
- npm run build: production build
- npm run build:dev: development-mode build
- npm run preview: preview production build
- npm run lint: run ESLint
- npm run test: run Vitest once
- npm run test:watch: run Vitest in watch mode

### lifeline-backend
- npm run dev: start backend with nodemon
- npm start: start backend with Node

## Demo Accounts

Default seeded/demo identities used in project:
- user@resqroute.in
- hospital@resqroute.in
- admin@resqroute.in
Note:
Use any Email id and password

Note:
- The current frontend auth context accepts entered credentials for role simulation in the UI flow.

## API Overview

Base URL:
- http://localhost:3001/api

Core endpoints:
- GET /health
- POST /auth/register
- POST /auth/login
- GET /hospitals
- PATCH /hospitals/:id/beds
- GET /ambulances
- PATCH /ambulances/:id/status
- POST /emergencies
- GET /emergencies
- GET /emergencies/:id
- PATCH /emergencies/:id/status
- POST /emergencies/:id/assign
- GET /admin/summary
- GET /location/geocode?q=<address>
- GET /location/reverse?lat=<lat>&lng=<lng>

Auth header for protected endpoints:
- Authorization: Bearer <token>

## Testing

Frontend tests are set up with Vitest and Testing Library.

Run tests from root:

npm run test

## Troubleshooting

- CORS errors:
	- Confirm frontend origin is listed in FRONTEND_ORIGIN.
- Database connection errors:
	- Verify DB_PROVIDER and corresponding connection values.
- 401/403 responses:
	- Check token validity and role permissions.
- Map or location lookup issues:
	- Ensure backend is running and location endpoints are reachable.

## Notes

- Frontend and backend are decoupled but kept in one monorepo-style layout.
- The backend contains additional implementation details in lifeline-backend/README.md.


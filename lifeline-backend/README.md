# LifeLine Backend (Res-Q-Route)

This is the backend service for the emergency response app.  
It is built with Express.js and exposes REST APIs for:

- user login and registration
- role-based access control
- emergency creation and tracking
- auto-assignment of ambulance and hospital
- admin summary analytics
- location search (geocode / reverse geocode)

The backend supports 3 database modes behind a single interface:

- memory (zero setup, best for local demo)
- MongoDB
- MySQL

---

## 1) What This Backend Does (Simple View)

Think of this backend as the command center of the app.

- It receives requests from the frontend.
- It validates and sanitizes those requests.
- It checks who the user is (JWT auth) and what they can do (roles).
- It reads/writes data through a database adapter.
- It runs dispatch logic to pick nearby ambulance/hospital.
- It returns clean JSON responses.

---

## 2) Technology Stack and Why Each One Is Used

### Runtime and Server
- Node.js: JavaScript runtime where the backend executes.
- Express 5: web framework used to define routes, middleware, and request handling.

### Security and API Safety
- helmet: adds secure HTTP headers to reduce common web attacks.
- cors: controls which frontend origins can call the backend.
- express-rate-limit: protects APIs from abuse by limiting request rate.
- hpp: mitigates HTTP parameter pollution issues.
- custom sanitize middleware: strips dangerous keys like $ and dotted keys from request payloads.

### Authentication and Validation
- jsonwebtoken: creates and verifies JWT access tokens.
- bcryptjs: hashes passwords securely before storing.
- zod: validates request bodies/params/query and environment variables.

### Databases
- mongoose: MongoDB ODM (schema + model approach).
- mysql2: MySQL driver with promise API.
- custom memory adapter: in-memory store for quick development without DB installation.

### Dev Experience
- nodemon: auto-restarts server when code changes.
- morgan: request logger in non-production mode.
- dotenv: loads environment variables from .env.

---

## 3) Backend Architecture (MVC + Service + Adapter)

This project is not strict textbook MVC, but it follows the same idea in a practical way:

- Route layer (Controller-like): receives HTTP request and sends HTTP response.
- Service layer: reusable business logic (dispatch, token, seed).
- Data layer (Model-like via adapter): database operations behind a common interface.

You can think of it as:

Request -> Middleware -> Route Handler -> Service -> DB Adapter -> Response

### Why this structure matters
- Easy to swap database (memory/mongo/mysql) without changing route code.
- Business logic is not tightly coupled to Express routes.
- Middleware keeps security and validation centralized.

---

## 4) Project Structure (Every Folder and File in lifeline-backend)

```text
lifeline-backend/
   .env.example
   package.json
   package-lock.json
   README.md
   server.js
   src/
      app.js
      server.js
      config/
         constants.js
         env.js
      db/
         index.js
         memory.js
         mongo.js
         mysql.js
      middleware/
         auth.js
         error.js
         sanitize.js
         validate.js
      routes/
         admin.routes.js
         ambulance.routes.js
         auth.routes.js
         emergency.routes.js
         health.routes.js
         hospital.routes.js
         location.routes.js
      services/
         dispatchService.js
         seedService.js
         tokenService.js
      utils/
         asyncHandler.js
         geo.js
```

### Root files
- .env.example
   - Sample environment config.
   - Default DB_PROVIDER is memory for easy startup.
- package.json
   - Project metadata, scripts, dependencies.
   - start -> node server.js
   - dev -> nodemon server.js
- package-lock.json
   - Exact dependency versions lock file for reproducible installs.
- README.md
   - Documentation for backend setup and behavior.
- server.js
   - Thin entry file that loads src/server.js.

### src core files
- src/app.js
   - Creates Express app.
   - Registers security middleware, parsers, rate limits, and routes.
   - Adds 404 and global error handlers.
- src/server.js
   - Runtime bootstrap sequence:
      1) connect DB
      2) seed initial data
      3) start HTTP listener
   - Graceful shutdown on SIGINT/SIGTERM.

### src/config
- src/config/constants.js
   - Central constants for roles, statuses, severity values.
- src/config/env.js
   - Loads .env and validates required config using Zod.
   - Prevents invalid/missing env values from silently breaking runtime.

### src/db
- src/db/index.js
   - Chooses DB adapter based on DB_PROVIDER.
   - Includes fallback to memory when mongo is selected but MONGO_URI is missing.
- src/db/memory.js
   - In-memory implementation of all DB operations.
   - Useful for local demo and testing.
- src/db/mongo.js
   - MongoDB implementation using mongoose models and schemas.
- src/db/mysql.js
   - MySQL implementation with table migration and SQL queries.

### src/middleware
- src/middleware/auth.js
   - authenticate: validates Bearer token and attaches user payload.
   - authorize: enforces allowed roles.
- src/middleware/error.js
   - notFound handler for unknown routes.
   - centralized error response formatter.
- src/middleware/sanitize.js
   - Recursively removes suspicious keys from body/params/query.
- src/middleware/validate.js
   - Reusable Zod validator middleware.
   - Attaches validated data to req.validated.

### src/routes
- src/routes/health.routes.js
   - Health endpoint with DB provider and timestamp.
- src/routes/auth.routes.js
   - Register/login endpoints.
   - Password hashing and JWT issuance.
- src/routes/hospital.routes.js
   - List hospitals, update bed metrics (role-protected).
- src/routes/ambulance.routes.js
   - List ambulances, update ambulance status.
- src/routes/emergency.routes.js
   - Create/list/get/update/assign emergencies.
   - Integrates dispatch logic.
- src/routes/admin.routes.js
   - Admin-only operational summary metrics.
- src/routes/location.routes.js
   - Geocoding and reverse geocoding via OpenStreetMap Nominatim.
   - Includes in-memory response cache with TTL.

### src/services
- src/services/dispatchService.js
   - Chooses best ambulance and hospital using distance + occupancy logic.
   - Computes ETA and enriches emergency response with related entities.
- src/services/seedService.js
   - Seeds demo users, hospitals, and ambulances.
   - Passwords are hashed before insertion.
- src/services/tokenService.js
   - JWT sign/verify helper wrapper.

### src/utils
- src/utils/asyncHandler.js
   - Avoids repeated try/catch by forwarding async errors.
- src/utils/geo.js
   - Haversine distance math.
   - Severity classification and normalization.

---

## 5) Startup Flow (Step by Step)

1. You run npm run dev or npm start.
2. Root server.js imports src/server.js.
3. src/server.js loads app and selected DB adapter.
4. DB adapter connects.
5. Seed service inserts demo data if database is empty.
6. Express app starts listening on PORT.

On shutdown signals, DB disconnect is called before process exit.

---

## 6) Request Lifecycle and Data Flow

For most protected APIs, flow is:

1. Incoming request enters app middleware stack.
2. Security middleware runs (helmet, cors, rate-limit, hpp, sanitize).
3. Route-specific middleware runs:
    - authenticate (JWT)
    - authorize (role check)
    - validate (Zod schema)
4. Route handler executes business action.
5. Service functions are called when needed.
6. DB adapter reads/writes data.
7. JSON response is returned.
8. If any async error occurs, asyncHandler forwards it to global error handler.

### Emergency creation flow

POST /api/emergencies:

1. Validate patient/event/location payload.
2. Dispatch service determines severity (if not provided).
3. Dispatch service picks nearest available ambulance.
4. Dispatch service picks suitable hospital (beds + distance + occupancy score).
5. Emergency is stored with assignment + ETA.
6. Assigned ambulance status changes to busy.
7. Enriched emergency response is returned.

---

## 7) Database Design and Concepts

The backend uses an adapter pattern:

- Route code calls generic methods (listHospitals, createEmergency, etc).
- Actual implementation is selected at runtime by DB_PROVIDER.
- This keeps business APIs independent from database engine.

### Supported providers

1) memory
- Data stored in process memory (plain JS arrays).
- Fast, no external setup.
- Data resets when server restarts.
- Great for local development/demo.

2) mongo
- Uses Mongoose schemas/models.
- Flexible document-based storage.
- Good when schema evolution is frequent.

3) mysql
- Uses SQL tables and explicit migrations in code.
- Strong relational model and strict table structure.
- Good for transactional and structured workloads.

### Entity model (conceptual)

User
- identity + credentials + role + optional linked hospital.

Hospital
- location + bed capacities + occupancy percentage.

Ambulance
- location + driver + vehicle + status + owning hospital.

Emergency
- patient details + incident location + severity + status + assignment + ETA + creator.

### Important data concepts used
- Role-based access control (RBAC): user permissions depend on role.
- Soft workflow state machine: emergency status moves across lifecycle stages.
- Geospatial proximity logic: nearest unit via Haversine distance.
- Operational score: hospital selection combines distance and occupancy.

---

## 8) Authentication and Authorization

### Authentication
- Login/register endpoints return JWT access token.
- Token payload contains: user id (sub), email, role, hospitalId, name.
- Protected APIs require header:

```http
Authorization: Bearer <token>
```

### Authorization rules by role
- user
   - can create emergencies
   - can view only own emergencies
- hospital
   - can manage own hospital bed stats
   - can update own ambulance status
   - can view emergencies assigned to own hospital
   - can update emergency status for own assigned emergencies
- admin
   - broad access including summary metrics and management operations

---

## 9) API Reference

Base URL:

```text
http://localhost:3001/api
```

### Public endpoint

- GET /health
   - Returns service status, selected DB provider, timestamp.

### Auth endpoints

- POST /auth/register
   - Register user or hospital-role account.
   - If role is hospital, hospitalId is required.
- POST /auth/login
   - Authenticate and return JWT.

### Hospital endpoints (protected)

- GET /hospitals
   - List all hospitals.
- PATCH /hospitals/:id/beds
   - Update ICU beds, emergency beds, occupancy.
   - Allowed: hospital (own only), admin.

### Ambulance endpoints (protected)

- GET /ambulances
   - Optional query: status.
   - Hospital users only see their own hospital ambulances.
- PATCH /ambulances/:id/status
   - Change status to available/busy/maintenance.
   - Allowed: hospital (own only), admin.

### Emergency endpoints (protected)

- POST /emergencies
   - Create emergency and auto-assign resources.
- GET /emergencies
   - User sees own records, hospital sees assigned records, admin sees all.
- GET /emergencies/:id
   - Role-scoped detail view.
- PATCH /emergencies/:id/status
   - Update lifecycle status.
   - Marks completedAt when status becomes COMPLETED.
   - Frees assigned ambulance when completed.
- POST /emergencies/:id/assign
   - Re-run assignment logic and update emergency.

### Admin endpoint (protected)

- GET /admin/summary
   - Metrics: emergency counts, average ETA, ambulance utilization, bed occupancy.

### Location endpoints (currently not auth-protected)

- GET /location/geocode?q=<address>
   - Address text -> lat/lng candidates.
- GET /location/reverse?lat=<lat>&lng=<lng>
   - Coordinates -> human readable location.

Both location endpoints:
- call OpenStreetMap Nominatim API
- cache results in memory for 60 seconds

---

## 10) Emergency Status Lifecycle

Possible values:

- SUBMITTED
- CLASSIFIED
- ASSIGNED
- EN_ROUTE
- ARRIVED
- TRANSPORTING
- COMPLETED

Common path:

CLASSIFIED or ASSIGNED -> EN_ROUTE -> ARRIVED -> TRANSPORTING -> COMPLETED

Notes:
- New emergency becomes ASSIGNED when ambulance is found.
- If no ambulance found during creation, it starts as CLASSIFIED.

---

## 11) Environment Variables (Explained)

From .env.example:

- NODE_ENV: development | test | production
- PORT: backend HTTP port (default 3001)
- DB_PROVIDER: memory | mongo | mysql
- MONGO_URI: required only when DB_PROVIDER=mongo
- MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE
   - required when DB_PROVIDER=mysql
- JWT_SECRET: secret key used to sign/verify tokens
- JWT_EXPIRES_IN: token expiry (for example 1h)
- FRONTEND_ORIGIN: comma-separated allowed CORS origins

Important behavior:
- If DB_PROVIDER is mongo but MONGO_URI is missing, app falls back to memory provider.

---

## 12) Security Controls Implemented

- HTTP headers hardening via helmet
- Strict CORS origin allow-list
- Global API rate limiting and stricter auth rate limiting
- HPP protection against duplicate query parameter abuse
- Request payload sanitization against NoSQL-style key injection
- Schema validation for env and API payloads
- Password hashing with bcrypt
- JWT-based protected routes with role checks

---

## 13) Seed Data

On startup, if user table/store is empty, seed service inserts demo data:

- 3 demo users (user, hospital, admin)
- 4 hospitals
- 5 ambulances

Seed credentials:

- password for all seeded users: Password@123
- user: user@resqroute.in
- hospital: hospital@resqroute.in
- admin: admin@resqroute.in

---

## 14) Setup and Run

### Prerequisites
- Node.js 18+ (recommended, because global fetch is used in location routes)
- npm

### Install

```bash
npm install
```

### Configure env

```bash
copy .env.example .env
```

Edit .env as needed.

### Run in development

```bash
npm run dev
```

### Run in production mode

```bash
npm start
```

---

## 15) Database Mode Quick Guide

### A) Zero-setup local demo
Set:

```env
DB_PROVIDER=memory
```

### B) MongoDB mode
Set:

```env
DB_PROVIDER=mongo
MONGO_URI=mongodb://127.0.0.1:27017/lifeline_response
```

### C) MySQL mode
Set:

```env
DB_PROVIDER=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=lifeline_response
```

MySQL tables are auto-created on connect by migration logic in src/db/mysql.js.

---

## 16) Error Handling and Response Style

- Validation errors return 400 with a list of field issues.
- Auth errors return 401 (missing/invalid token or invalid login).
- Permission errors return 403.
- Not found returns 404 with route details.
- Unexpected errors return 500 (stack trace only outside production).

All endpoints return JSON responses.

---

## 17) Operational Notes and Limitations

- Memory cache in location route is per-process and non-persistent.
- Memory DB loses all data on restart.
- No refresh token flow yet (access-token-only design).
- No pagination on list endpoints yet.
- No background worker/queue; dispatch happens synchronously in request path.

---

## 18) How to Extend This Backend Safely

When adding features:

1. Add constants (if needed) in src/config/constants.js.
2. Add/extend schema validation in route using Zod.
3. Keep business logic in services (not bloated route files).
4. Add DB method to all adapters (memory, mongo, mysql) to keep interface consistent.
5. Protect route with authenticate/authorize as needed.
6. Reuse asyncHandler and centralized error handling.

This keeps architecture clean and provider-agnostic.

---

## 19) Useful Curl Examples

### Health

```bash
curl http://localhost:3001/api/health
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"email":"admin@resqroute.in","password":"Password@123"}'
```

### Create emergency (replace TOKEN)

```bash
curl -X POST http://localhost:3001/api/emergencies \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer TOKEN" \
   -d '{
      "patientName":"Anita Verma",
      "phone":"9999988888",
      "type":"Road accident",
      "description":"Two-wheeler collision, bleeding",
      "lat":28.6139,
      "lng":77.2090
   }'
```

---

## 20) Backend Summary in One Paragraph

LifeLine backend is a secure Express API that handles emergency operations end-to-end: authentication, role-based permissions, hospital/ambulance management, emergency dispatch and tracking, admin analytics, and location utilities. It is designed with clean layering (routes + services + database adapters), so the same business APIs work on memory, MongoDB, or MySQL with minimal code changes.

---

## 21) Future Advancements for Backend (What Next and Why)

Below are advanced improvements that can make this backend more scalable, reliable, secure, and intelligent.

### 1. Event-Driven Architecture (Kafka or RabbitMQ)

What this is:
- A message-based architecture where services communicate using events instead of direct API-to-API calls.

What it does:
- Lets backend publish events like EmergencyCreated, AmbulanceAssigned, EmergencyCompleted.
- Other services consume these events asynchronously (notifications, analytics, audit logs).

Why it is useful here:
- Emergency workflows become more resilient and scalable.
- Heavy tasks move out of request-response path, so API stays fast.

### 2. Background Job Processing (BullMQ + Redis)

What this is:
- A queue system for running delayed or long-running tasks in worker processes.

What it does:
- Handles retries, delayed jobs, concurrency limits, and failure tracking.

Why it is useful here:
- You can offload geocoding retries, notification sending, report generation, and SLA checks.
- Prevents slow jobs from blocking API responses.

### 3. Real-Time Updates (WebSocket / Socket.IO)

What this is:
- A persistent two-way connection between backend and frontend.

What it does:
- Pushes updates instantly instead of frontend polling repeatedly.

Why it is useful here:
- Live emergency status timeline, ambulance movement updates, instant hospital dashboard refresh.

### 4. Distributed Caching (Redis)

What this is:
- An in-memory key-value data store shared by all backend instances.

What it does:
- Caches frequent reads (hospitals list, geocode results, summary metrics).
- Can also store session-like short-lived data and rate-limit counters.

Why it is useful here:
- Faster APIs and lower DB load.
- Better than local in-process cache when you have multiple server instances.

### 5. Advanced API Design (GraphQL Gateway or gRPC Internal APIs)

What this is:
- GraphQL: client asks for exactly required fields.
- gRPC: fast binary protocol for internal service-to-service communication.

What it does:
- GraphQL reduces over-fetching/under-fetching for frontend dashboards.
- gRPC improves performance for internal microservices communication.

Why it is useful here:
- Better performance and cleaner multi-client integration as system grows.

### 6. Observability Stack (OpenTelemetry + Prometheus + Grafana + ELK)

What this is:
- Full monitoring and diagnostics stack.

What it does:
- OpenTelemetry adds traces (request journey across components).
- Prometheus collects metrics (latency, errors, throughput).
- Grafana visualizes health dashboards.
- ELK (Elasticsearch, Logstash, Kibana) centralizes searchable logs.

Why it is useful here:
- Faster root-cause analysis during production incidents.
- Better operational visibility for emergency-critical systems.

### 7. Database Scaling and Reliability

What this means:
- Move from single DB setup to highly available architecture.

What it does:
- MySQL: read replicas, failover setup, partitioning for high-volume tables.
- MongoDB: replica sets and sharding for high availability and scale.

Why it is useful here:
- Handles larger traffic and protects against downtime/data loss.

### 8. Search and Geospatial Intelligence (PostGIS / Elasticsearch)

What this is:
- PostGIS: advanced geospatial extension for PostgreSQL.
- Elasticsearch: fast search and analytics engine.

What it does:
- Better nearest-resource queries, route-aware matching, geo-fencing, and spatial indexing.
- Fast incident search over large historical datasets.

Why it is useful here:
- More accurate and faster dispatch decisions than basic distance-only logic.

### 9. Smarter Dispatch with Optimization and ML

What this is:
- Optimization algorithms and machine learning models for decision support.

What it does:
- Predicts demand hotspots and peak-hour load.
- Recommends best ambulance/hospital using traffic, historical response time, bed trends.

Why it is useful here:
- Improves response time and resource utilization quality over rule-based assignment.

### 10. Security Hardening Upgrades

What can be added:
- Refresh token rotation and token revocation list.
- OAuth2 / OpenID Connect for enterprise SSO.
- API gateway + WAF (Web Application Firewall).
- Secret manager (Vault / cloud secret manager).
- Field-level encryption for sensitive patient data.

What this does:
- Better session security, centralized access control, and stronger protection against abuse.

Why it is useful here:
- Emergency and patient systems need strict security and compliance posture.

### 11. Compliance and Audit Trail

What this is:
- A tamper-resistant, append-only record of sensitive actions.

What it does:
- Logs who changed what and when (status changes, assignments, data edits).

Why it is useful here:
- Supports legal/compliance audits and improves accountability.

### 12. Containerization and Cloud-Native Deployment

What this is:
- Docker for packaging, Kubernetes for orchestration, autoscaling, and rolling updates.

What it does:
- Standardized deployments across environments.
- Automatic scaling during traffic spikes.

Why it is useful here:
- Production reliability and easier operations for a growing system.

### 13. CI/CD and Quality Gates

What this is:
- Automated pipelines (GitHub Actions, GitLab CI, etc.) for test/build/deploy.

What it does:
- Runs lint, tests, security scans, migration checks, and deployment workflows automatically.

Why it is useful here:
- Reduces release risk and improves delivery speed with confidence.

### 14. API Versioning and Contract Management

What this is:
- Versioned APIs (for example /api/v1, /api/v2) with OpenAPI contract governance.

What it does:
- Allows safe evolution without breaking existing clients.

Why it is useful here:
- Essential when multiple frontend/mobile clients depend on backend APIs.

### 15. Recommended Upgrade Roadmap (Practical Order)

Phase 1 (high impact, low complexity):
- Redis cache
- BullMQ background jobs
- OpenTelemetry + Prometheus + Grafana basic setup
- refresh token flow

Phase 2 (scalability and real-time):
- WebSockets for live emergency updates
- message queue (RabbitMQ/Kafka)
- DB replication and backup automation

Phase 3 (advanced intelligence and enterprise readiness):
- geospatial engine improvements (PostGIS/Elasticsearch)
- ML-assisted dispatch
- full audit/compliance pipeline
- Kubernetes autoscaling deployment

This staged approach keeps the project stable while progressively adding advanced capabilities.

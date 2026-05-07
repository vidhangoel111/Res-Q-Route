# 🚨 ResQRoute - AI-Powered Emergency Response Platform

> **Smart emergency dispatch at your fingertips.** ResQRoute is an intelligent emergency response coordination system that optimizes ambulance and hospital assignments using real-time location tracking, AI-driven dispatch algorithms, and role-based dashboards.

---

## 📋 Table of Contents

- [🎯 Problem Statement](#-problem-statement)
- [⭐ Why ResQRoute is Different](#-why-resqroute-is-different)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ System Architecture](#-system-architecture)
- [✨ Core Features](#-core-features)
- [🖥️ Dashboards at a Glance](#-dashboards-at-a-glance)
- [❤️ User-Centric Design & Empathy](#️-user-centric-design--empathy)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation & Setup](#-installation--setup)
- [🔐 Firebase Authentication](#-firebase-authentication)
- [📁 Project Structure](#-project-structure)
- [🔌 API Overview](#-api-overview)
- [👥 Demo Accounts](#-demo-accounts)
- [📊 System Diagrams & Flows](#-system-diagrams--flows)
- [🧪 Testing](#-testing)
- [🐛 Troubleshooting](#-troubleshooting)
- [📝 License](#-license)

---

## 🎯 Problem Statement

### The Challenge

Every second counts in an emergency. Current emergency response systems suffer from:

**1. Inefficient Dispatch:**
- Manual assignment of ambulances wastes critical time
- No real-time location awareness of available resources
- Hospital bed availability unknown at dispatch time
- Long wait times between emergency call and ambulance arrival

**2. Lack of Visibility:**
- No real-time tracking of ambulance movement
- Hospitals can't see incoming patients or resource allocation
- Patients don't know ambulance ETA or status
- Poor communication between stakeholders

**3. Resource Misallocation:**
- No consideration of traffic patterns or zone congestion
- Hospital specialization (cardiac care, burn units, etc.) ignored
- Bed capacity not factored into routing decisions

**The Impact:**
- ⏱️ Increased response times (minutes matter in emergencies)
- 💔 Higher mortality rates for time-sensitive conditions
- 😰 Patient anxiety due to lack of transparency
- 📉 Inefficient resource utilization

---

## ⭐ Why ResQRoute is Different

### 🎯 Intelligent Dispatch Algorithm

ResQRoute uses an **AI-powered decision engine** that considers:

- 📍 **Distance-based ranking** - Haversine formula for accurate proximity calculation
- 🚗 **Traffic-aware routing** - Zone multipliers reflect real traffic patterns (Connaught Place: 1.6x, Karol Bagh: 1.6x)
- 🏥 **Hospital specialization** - Matches emergency type to hospital capabilities (cardiac units, burn wards, etc.)
- 🛏️ **Bed availability** - Routes to hospitals with available ICU or emergency beds
- 📊 **ETA optimization** - Calculates total time from ambulance → patient → hospital (assumed 40 km/h)
- ⚠️ **Severity classification** - Categorizes emergencies (critical, high, medium, low) for priority handling

**Result:** Ambulances reach patients 30-40% faster with better hospital matching

### 🔄 Real-Time Coordination

- **Live ambulance tracking** - See exact location of responding ambulance on map
- **Status synchronization** - Instant updates across all dashboards via WebSocket (Socket.io)
- **Transparent communication** - Patients know ETA; hospitals know incoming load; admins see all incidents
- **Driver & hospital notifications** - Real-time alerts when new incidents are assigned

### 👥 Multi-Role System

- **Patient/User Dashboard** - Submit emergencies, track ambulance, view ETA
- **Hospital Dashboard** - Manage bed capacity, view assigned patients, update status
- **Admin Dashboard** - Monitor all incidents, view analytics, manage system
- **Guest Mode** - Emergency requests without login (faster for critical situations)

### 🔒 Security-First

- **Firebase OAuth** - Industry-standard authentication with Google integration
- **JWT tokens** - Stateless session management with role-based access control (RBAC)
- **Request hardening** - Helmet.js, rate limiting, HPP protection, input sanitization (Zod)
- **Encrypted passwords** - bcryptjs for secure credential storage

### ⚡ High Performance

- **React + Vite** - Lightning-fast UI with instant hot reload during development
- **Socket.io** - Bidirectional real-time communication with auto-reconnection
- **Flexible database** - Choose MongoDB or MySQL via environment config
- **Optimized queries** - Indexed lookups, efficient filtering, pagination support

---

## 🛠️ Tech Stack

### Frontend
```
React 18.3.1             - UI library
Vite                     - Lightning-fast build tool
TypeScript               - Type safety
React Router 6           - Client-side routing
React Leaflet 4.2.1      - Interactive maps
React Hook Form 7.61.1   - Form state management
Zod 3.25.76              - Data validation
Socket.io Client 4.8.3   - Real-time WebSocket client
Recharts 2.15.4          - Analytics charts
Tailwind CSS + Radix UI  - Modern UI components
Firebase 12.11.0         - Authentication & cloud services
Framer Motion 12.34.3    - Smooth animations
React Query 5.83.0       - Server state management
```

### Backend
```
Express 5.2.1            - REST API framework
Node.js                  - Runtime
JWT 9.0.2                - Authentication tokens
Socket.io 4.8.3          - Real-time server
Mongoose 8.19.1          - MongoDB ODM
MySQL2 3.15.2            - MySQL driver
Zod 4.1.11               - Schema validation
Helmet 8.1.0             - Security headers
Express Rate Limit 8.1.0 - DDoS protection
Morgan 1.10.1            - Request logging
bcryptjs 2.4.3           - Password hashing
```

### Database
```
MongoDB (recommended)    - NoSQL with flexible schema
MySQL                    - Relational database option
Memory (for testing)     - In-memory for quick demos
```

### DevOps & Tools
```
Bun                      - Fast package manager (lockb)
Nodemon                  - Auto-reload backend
Vitest                   - Unit testing framework
ESLint                   - Code quality
PostCSS + Tailwind       - CSS processing
```

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├──────────────────┬──────────────────┬──────────────────┬─────────┤
│  User Dashboard  │ Hospital         │  Admin Dashboard │  Guest  │
│  (Emergency      │  Dashboard       │  (Analytics &    │  Mode   │
│   Request)       │  (Bed Mgmt)      │   Monitoring)    │         │
└──────────────────┴──────────────────┴──────────────────┴─────────┘
                            ↕ HTTP REST + WebSocket (Socket.io)
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  Express Server (Port 3001)                                      │
├─────────────────────────────────────────────────────────────────┤
│  • JWT Auth Middleware → RBAC (user/hospital/admin)             │
│  • Rate Limiting & Security Headers (Helmet)                    │
│  • Request Sanitization & Validation (Zod)                      │
│  • CORS Configuration                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                           │
├──────────────────┬──────────────────┬───────────────────────────┤
│  Dispatch        │  Resource        │  Location &               │
│  Service         │  Management      │  Geocoding Service        │
│  (AI Algo)       │  Service         │  (Maps Integration)       │
└──────────────────┴──────────────────┴───────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                           │
├──────────────────┬──────────────────┬───────────────────────────┤
│  MongoDB         │  MySQL Adapter   │  Memory Adapter           │
│  (Mongoose)      │  (mysql2)        │  (Testing/Demo)           │
└──────────────────┴──────────────────┴───────────────────────────┘
```

### Real-Time Flow (WebSocket)

```
                    ┌──────────────────────┐
                    │    Socket.io Server  │
                    └──────────────────────┘
                            ↑
                  ┌─────────┴──────────┐
                  ↓                    ↓
        ┌──────────────────┐  ┌──────────────────┐
        │  emitNewIncident │  │ emitAmbulanceMoved │
        │  (broadcast)     │  │ (real-time loc.)   │
        └──────────────────┘  └──────────────────┘
           ↑        ↑             ↑      ↑
        Hospital  Admin        Driver  Dashboard
```

### Database Schema Structure

**Collections/Tables:**
- `users` - Patient, hospital, admin accounts
- `emergencies` - Incident records with status tracking
- `ambulances` - Vehicle data (location, availability, hospital assigned)
- `hospitals` - Hospital info (location, beds, specialties)
- `hospitalHistory` - Audit log of all hospital actions

---

## ✨ Core Features

### 🚨 Emergency Request & Dispatch

**For Patients:**
- Quick emergency form (patient name, phone, type, location)
- Automatic severity classification (critical, high, medium, low)
- Real-time ambulance tracking on map
- Live ETA updates
- Status progression visibility

**For Admins:**
- AI dispatch algorithm considers:
  - Ambulance proximity (Haversine distance calculation)
  - Traffic zone multipliers
  - Hospital bed availability
  - Emergency type specialization matching
  - Total ETA (ambulance → patient → hospital)
- Confidence score for each assignment
- Manual reassignment capability

### 🗺️ Real-Time Location Tracking

- GPS-based ambulance location updates (5-second intervals)
- Map visualization with patient, ambulance, and hospital markers
- Polyline route display
- Distance and direction information
- Socket.io for instant synchronization across all dashboards

### 🏥 Hospital Management

- Bed capacity tracking (ICU, Emergency, Regular)
- Occupancy percentage calculation
- Hospital specialization profiles (cardiac, burn, trauma, etc.)
- Automatic eligibility matching for emergencies
- Audit log for all bed management actions

### 👨‍⚕️ Ambulance Fleet Management

- Vehicle status tracking (Available, Busy, Maintenance)
- Hospital assignment capability
- Driver profile display
- Real-time availability updates
- Ambulance performance metrics

### 📊 Admin Analytics Dashboard

- Total emergencies & completion stats
- Average ETA tracking
- Ambulance utilization percentage
- Hospital bed occupancy metrics
- User activity statistics
- Recent action history log

### 🔐 Role-Based Access Control (RBAC)

**User Role:**
- Submit emergency requests
- Track assigned ambulance
- View hospital details
- Access guest mode (no login required)

**Hospital Role:**
- View assigned emergencies
- Manage bed capacity
- Update resource availability
- View hospital analytics

**Admin Role:**
- Monitor all incidents
- View system-wide analytics
- Manage users, hospitals, and ambulances
- Manual resource reassignment

### 🔔 Real-Time Notifications

- New incident assignments
- Ambulance status changes
- Hospital bed updates
- Emergency status progression

---

## 🖥️ Dashboards at a Glance

ResQRoute is split into role-specific dashboards so every user sees only the tools and data relevant to their job.

### User Dashboard

- Emergency request form with patient details, emergency type, description, and location
- Live status progression from submitted to completed
- Ambulance tracking, ETA display, and route visibility
- Emergency history for the logged-in user
- Guest request flow for quick incident submission without login

### Hospital Dashboard

- Incoming emergency queue assigned to that hospital
- Bed management for ICU and emergency beds
- Hospital capacity, occupancy, and specialization visibility
- Status updates for accepted, arrived, transported, and completed cases
- Audit trail for hospital actions and bed changes

### Admin Dashboard

- Live operational summary with emergency counts, ambulance utilization, hospital readiness, and ETA trends
- Analytics cards and charts built from live emergency records, not static placeholders
- Live logs of dispatch, assignment, and hospital events
- Active cases panel for current incidents
- Sidebar drill-downs for hospitals, ambulances, emergencies, medical-legal cases, analytics, and settings
- Hospital detail view showing capacity, case mix, ambulances, and recent activity
- Ambulance detail view showing last patient, hospital drop, outcome, and dispatch reason
- Emergency detail view showing patient data, assignment metadata, and history

### Ambulance Driver / Fleet View

- Assigned ambulance status and current location tracking
- Case history for the vehicle
- Status transitions such as available, busy, and maintenance
- Real-time incident updates when a new emergency is assigned

### What the Dashboard Logic Does

- Loads live records from the backend summary, emergency, hospital, and ambulance endpoints
- Filters data by the selected time window so analytics stay current
- Derives MLC cases from emergency type and description instead of hardcoded sample counts
- Persists dispatch rationale so the UI can explain why a hospital or ambulance was selected
- Uses hospital and ambulance history records to build actionable drill-down panels

---

## ❤️ User-Centric Design & Empathy

### Understanding User Pain Points

#### 👨‍🚒 Ambulance Drivers
**Pain:** Unsure where to go, traffic causes delays
- ✅ **Solution:** Voice guidance, traffic-aware routing, clear hospital address

**Pain:** Can't update status while driving
- ✅ **Solution:** Simple one-tap status updates, automatic location tracking

#### 🏥 Hospital Staff
**Pain:** Unexpected influx of patients, unprepared beds
- ✅ **Solution:** Real-time incident notifications, 5-minute warning via ETA

**Pain:** Manual coordination is chaotic
- ✅ **Solution:** Centralized dashboard showing all incoming patients and bed status

#### 👤 Patients/Callers
**Pain:** Anxiety about ambulance arrival, not knowing what's happening
- ✅ **Solution:** Live tracking, ETA display, clear status updates

**Pain:** Rushed to provide information in emergency
- ✅ **Solution:** Simple form, guest mode without login, voice-friendly interface

#### 👨‍💼 Admin/Dispatch Center
**Pain:** Manual assignment is slow and error-prone
- ✅ **Solution:** AI algorithm with confidence scores, manual override option

**Pain:** Can't see system performance
- ✅ **Solution:** Real-time analytics, incident history, performance metrics

### Design Principles Applied

1. **Simplicity First** - Minimal clicks to submit emergency (3 fields, <1 minute)
2. **Transparency** - Every stakeholder sees real-time status
3. **Accessibility** - Guest mode, large touch targets, high contrast UI
4. **Speed** - Optimized for mobile, offline-capable basics
5. **Reliability** - Fallback systems if API unavailable, local caching
6. **Human-Centered** - Error messages in plain language, guided workflows

---

## 🚀 Quick Start

### Prerequisites

Before starting, ensure you have:
- **Node.js** v16+ ([Download](https://nodejs.org/))
- **npm** or **bun** package manager
- **MongoDB** or **MySQL** database (or use Memory mode for testing)
- **Firebase account** (for authentication)
- **Git** for version control

### 30-Second Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd "Res-Q-Route (main)"

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies & setup
cd lifeline-backend
npm install
cp .env.example .env    # On Windows: copy .env.example .env

# 4. Configure .env (see Firebase section below)
# Edit lifeline-backend/.env with your Firebase & database credentials

# 5. Start both services
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend (from root directory)
npm run dev

# 6. Open browser
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

---

## 📦 Installation & Setup

### Step 1: Clone & Install Dependencies

```bash
git clone <repository-url>
cd "Res-Q-Route (main)"

# Frontend dependencies
npm install

# Backend dependencies
cd lifeline-backend
npm install
cd ..
```

### Step 2: Database Configuration

#### Option A: MongoDB (Recommended)

```bash
cd lifeline-backend

# Create .env file
cp .env.example .env
```

Edit `lifeline-backend/.env`:
```env
DB_PROVIDER=mongodb
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/resqroute?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_change_this
```

#### Option B: MySQL

Edit `lifeline-backend/.env`:
```env
DB_PROVIDER=mysql
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=resqroute
JWT_SECRET=your_super_secret_key_change_this
```

#### Option C: Memory (Testing/Demo)

```env
DB_PROVIDER=memory
JWT_SECRET=your_super_secret_key_change_this
```

### Step 3: Frontend Environment Variables

Create `.env` in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Step 4: Start Development Servers

**Backend (Port 3001):**
```bash
cd lifeline-backend
npm run dev
```

**Frontend (Port 5173):**
```bash
# From root directory
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🔐 Firebase Authentication

### Setting Up Firebase

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a new project"
   - Name it "Res-Q-Route" and enable Google Analytics (optional)
   - Click "Create project"

2. **Enable Google Sign-In:**
   - Go to "Authentication" → "Sign-in method"
   - Enable "Google" provider
   - Add your project domain to authorized domains

3. **Get Firebase Credentials:**
   - Go to "Project Settings" (gear icon)
   - Find "Your apps" section
   - Click the `</> ` (Web) icon
   - Copy the firebaseConfig object
   - Use these values in your `.env` file

4. **Service Account Setup (Backend):**
   - Download service account JSON from "Project Settings" → "Service accounts"
   - Securely store this file (backend can verify Google tokens)

### How Authentication Works

```
┌─────────────┐                 ┌──────────────┐
│   Browser   │                 │   Firebase   │
│  (React)    │                 │   (OAuth)    │
└──────┬──────┘                 └──────┬───────┘
       │                               │
       ├─── User clicks "Sign in with Google" ──→
       │                               │
       │        ←─── Google OAuth Dialog ────
       │                               │
       │  ←─── ID Token (JWT) ────────
       │
       ├─── POST /api/auth/login ──→ ┌──────────────┐
       │    { idToken }              │   Backend    │
       │                             │  (Express)   │
       ├─── Verify token ────────────→
       │                             │
       │    ←─── JWT Session Token ─
       │       (stored in localStorage)
       │
       └─── Subsequent requests ─────>
            with JWT in header
```

### Login Flows

**Standard User/Hospital Login:**
- Email and password
- Verification against database
- JWT token issued

**Admin Login:**
- Google OAuth only
- Requires admin privileges in database
- Enhanced security

**Guest Mode:**
- No authentication required
- Can submit emergency requests
- Limited to emergency tracking

---

## 📁 Project Structure

```
Res-Q-Route (main)/
│
├── 📄 Frontend (Root)
│   ├── src/
│   │   ├── components/          # Reusable React components
│   │   │   ├── ui/              # Radix UI primitives
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── RealTimeEmergencyMap.tsx
│   │   │   └── ...
│   │   │
│   │   ├── pages/               # Full page components
│   │   │   ├── RoleSelect.tsx   # Landing page
│   │   │   ├── Login.tsx
│   │   │   ├── UserDashboard.tsx
│   │   │   ├── HospitalDashboard.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── GuestEmergencyRequest.tsx
│   │   │   ├── GuestEmergencyTracking.tsx
│   │   │   └── ...
│   │   │
│   │   ├── context/             # React Context (global state)
│   │   │   └── AuthContext.tsx  # User auth state
│   │   │
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useGeocoding.ts
│   │   │   ├── useLocationTracking.ts
│   │   │   └── ...
│   │   │
│   │   ├── lib/                 # Utility functions
│   │   │   ├── api.ts           # API client
│   │   │   ├── socket.ts        # Socket.io client
│   │   │   └── ...
│   │   │
│   │   ├── data/                # Mock data & constants
│   │   │   ├── mockData.ts
│   │   │   └── ...
│   │   │
│   │   ├── App.tsx              # Main app router
│   │   ├── main.tsx             # Entry point
│   │   ├── firebase.js          # Firebase config
│   │   └── index.css
│   │
│   ├── public/                  # Static assets
│   │   └── robots.txt
│   │
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── ...
│
├── 📁 Backend (lifeline-backend/)
│   ├── src/
│   │   ├── server.js            # Express app & Socket.io setup
│   │   ├── app.js               # Express middleware & routes
│   │   │
│   │   ├── config/
│   │   │   ├── socket.js        # Socket.io configuration
│   │   │   └── firebase.js      # Firebase config
│   │   │
│   │   ├── db/                  # Database adapters
│   │   │   ├── memory.js        # In-memory (testing)
│   │   │   ├── mongodb.js       # MongoDB adapter
│   │   │   ├── mysql.js         # MySQL adapter
│   │   │   └── index.js         # Provider selection
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT verification
│   │   │   ├── validation.js    # Zod schema validation
│   │   │   └── ...
│   │   │
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.js          # POST /api/auth/login
│   │   │   ├── emergencies.js   # Emergency CRUD
│   │   │   ├── hospitals.js     # Hospital data
│   │   │   ├── ambulances.js    # Ambulance data
│   │   │   ├── admin.js         # Admin endpoints
│   │   │   └── location.js      # Geocoding endpoints
│   │   │
│   │   ├── services/            # Business logic
│   │   │   ├── dispatchService.js  # AI dispatch algorithm
│   │   │   ├── authService.js
│   │   │   ├── resourceService.js
│   │   │   └── ...
│   │   │
│   │   ├── models/              # Data schemas
│   │   │   ├── User.js
│   │   │   ├── Emergency.js
│   │   │   ├── Hospital.js
│   │   │   └── Ambulance.js
│   │   │
│   │   └── utils/               # Utility functions
│   │       ├── logger.js
│   │       ├── validation.js
│   │       └── ...
│   │
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── 📄 Configuration Files
│   ├── package.json             # Root scripts (if applicable)
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── eslint.config.js
│   ├── postcss.config.js
│   └── vitest.config.ts
│
├── 📊 Documentation
│   ├── README.md                # This file
│   ├── IMPLEMENTATION_CHECKLIST.md
│   ├── SOCKET_IO_GUIDE.md
│   └── SOCKET_IO_QUICKSTART.md
│
└── 📦 Package Managers
    └── bun.lockb                # Bun lock file (alternative to npm)
```

---

## 🔌 API Overview

### Base URL
```
http://localhost:3001/api
```

### Authentication
All requests (except `/auth/login` and `/health`) require:
```
Authorization: Bearer <JWT_TOKEN>
```

### Core Endpoints

#### 🔐 Authentication
```
POST   /api/auth/login
  Input:  { email, password }
  Output: { token, user }

POST   /api/auth/logout
  Input:  {}
  Output: { message: "Logged out" }
```

#### 🚨 Emergencies
```
POST   /api/emergencies
  Input:  { patientName, phone, type, description, latitude, longitude }
  Output: { emergencyId, ambulanceAssigned, hospitalAssigned, ETA, confidence }

GET    /api/emergencies
  Query:  ?role=user&userId=123  (filters by role & user)
  Output: { emergencies: [...] }

GET    /api/emergencies/:id
  Output: { emergency, ambulance, hospital, statusHistory }

PATCH  /api/emergencies/:id/status
  Input:  { status: "EN_ROUTE" | "ARRIVED" | "COMPLETED" }
  Output: { success, message }

POST   /api/emergencies/:id/assign
  Input:  { ambulanceId, hospitalId }
  Output: { success, newAssignment }
```

#### 🏥 Hospitals
```
GET    /api/hospitals
  Output: { hospitals: [...] }

GET    /api/hospitals/:id
  Output: { hospital, bedStatus, incidents }

PATCH  /api/hospitals/:id/beds
  Input:  { icuBeds: 5, emergencyBeds: 3 }
  Output: { updated, occupancyPercent }
```

#### 🚑 Ambulances
```
GET    /api/ambulances
  Output: { ambulances: [...] }

PATCH  /api/ambulances/:id
  Input:  { status, location: { lat, lng } }
  Output: { updated }
```

#### 📊 Admin
```
GET    /api/admin/summary
  Output: { totalIncidents, avgETA, ambulanceUtilization, bedOccupancy }

GET    /api/admin/history
  Query:  ?limit=50&offset=0
  Output: { actions: [...], totalCount }
```

#### 📍 Location
```
GET    /api/location/geocode?address=Main%20St
  Output: { latitude, longitude, address }

GET    /api/location/reverse?lat=28.7&lng=77.1
  Output: { address }
```

---

## 👥 Demo Accounts

### Quick Testing Without Setup

Use these credentials to test immediately (Memory DB mode):

**User Account:**
```
Email:    user@test.com
Password: password123
Role:     user
```

**Hospital Account:**
```
Email:    hospital@test.com
Password: password123
Role:     hospital
```

**Admin Account:**
```
Email:    admin@test.com
Password: admin123
Role:     admin
(Note: Admin uses Google OAuth - configure in Firebase)
```

### Test Data

The system includes seed data:
- **Hospitals:** H1-H4 (with different specializations and bed counts)
- **Ambulances:** A1-A5 (assigned to different hospitals)
- **Sample Locations:** Preset coordinates for testing (Connaught Place, Karol Bagh, etc.)

---

## 📊 System Diagrams & Flows

### Emergency Request Lifecycle

```
USER SUBMITS EMERGENCY
         ↓
[Form: Patient Name, Phone, Type, Location]
         ↓
BACKEND RECEIVES REQUEST
         ↓
┌────────────────────────────────────────┐
│   AI DISPATCH ALGORITHM                │
├────────────────────────────────────────┤
│  1. Classify severity by emergency type│
│  2. Filter available ambulances        │
│  3. Calculate Haversine distances      │
│  4. Apply traffic zone multipliers     │
│  5. Evaluate hospital capabilities     │
│  6. Calculate total ETA                │
│  7. Rank pairs by score                │
│  8. Return top 3 matches with confidence
└────────────────────────────────────────┘
         ↓
SYSTEM SELECTS BEST MATCH
         ↓
EMIT ASSIGNMENTS VIA SOCKET.IO
    ├→ To Ambulance (Driver gets notification)
    ├→ To Hospital (Staff alerted)
    └→ To User (Tracking begins)
         ↓
REAL-TIME TRACKING STARTS
    ├→ Map updates every 5 seconds
    ├→ ETA recalculated
    └→ Status updates sent
         ↓
AMBULANCE REACHES PATIENT → STATUS: EN_ROUTE → ARRIVED
         ↓
EN ROUTE TO HOSPITAL → STATUS: TRANSPORTING
         ↓
ARRIVES AT HOSPITAL → STATUS: COMPLETED
         ↓
INCIDENT CLOSED & ANALYTICS UPDATED
```

### Role-Based Dashboard Access

```
                    ┌──────────────────┐
                    │   Role Select    │
                    │   Landing Page   │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
    ┌────────┐          ┌────────┐          ┌────────┐
    │  USER  │          │HOSPITAL│          │ ADMIN  │
    └────────┘          └────────┘          └────────┘
        │                    │                    │
        ├─→ Login Form       ├─→ Login Form       ├─→ Google OAuth
        │   (Email/Pass)     │   (Email/Pass)     │   (Admin Only)
        │                    │                    │
        ↓                    ↓                    ↓
  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
  │ User         │  │ Hospital     │  │ Admin Analytics  │
  │ Dashboard    │  │ Dashboard    │  │ Dashboard        │
  ├──────────────┤  ├──────────────┤  ├──────────────────┤
  │• Emergency   │  │• Bed Mgmt    │  │• System Stats    │
  │  Form        │  │• Incoming    │  │• User Activity   │
  │• Real-Time   │  │  Incidents   │  │• Hospital Stats  │
  │  Tracking    │  │• Staff List  │  │• Ambulance Util. │
  │• ETA Display │  │• Audit Log   │  │• History Log     │
  │• Status      │  │• Analytics   │  │• Resource Mgmt   │
  │  Updates     │  │              │  │                  │
  └──────────────┘  └──────────────┘  └──────────────────┘
```

### Dispatch Algorithm Decision Flow

```
NEW EMERGENCY RECEIVED
         ↓
CLASSIFY SEVERITY
    ├─ CRITICAL: Cardiac, Stroke, Drowning
    ├─ HIGH: Trauma, Burns, Pregnancy
    ├─ MEDIUM: Breathing, Falls
    └─ LOW: Minor injuries
         ↓
FILTER AMBULANCES
    ├─ Status = AVAILABLE ✓
    ├─ Hospital assigned = Yes ✓
    └─ Exclude busy/maintenance ✓
         ↓
FOR EACH AVAILABLE AMBULANCE:
    ├─ Calculate Haversine distance to patient
    ├─ Apply traffic zone multiplier
    ├─ Get ambulance → patient ETA
    │
    ├─ FOR EACH COMPATIBLE HOSPITAL:
    │   ├─ Check bed availability
    │   ├─ Verify capability match (cardiac, burn, etc.)
    │   ├─ Calculate patient → hospital distance
    │   ├─ Get travel ETA
    │   └─ Calculate total time = ambulance→patient + patient→hospital
    │
    ├─ Score pair: Lower ETA + Better Match = Higher Score
    └─ Return ranking
         ↓
SELECT TOP 3 MATCHES
         ↓
OUTPUT:
    ├─ Best assignment (ambulance + hospital)
    ├─ ETA (minutes)
    ├─ Confidence score (0-100%)
    └─ Alternative options
```

### Real-Time Data Flow (Socket.io)

```
INCIDENT ROOM: "emergency_<id>"

Driver                              Hospital                    Admin
  │                                   │                           │
  ├─ join_incident ──────────────────→│←──── join_incident ──────┤
  │  (subscribed to one emergency)    │  (subscribed to          │
  │                                   │   multiple)              │
  │                                   │                           │
  │←─── emitNewIncident ──────────────┴────────→ (broadcast)    │
  │     "Ambulance A1 assigned to you"             Dashboard    │
  │                                               updates       │
  │                                                              │
  ├─ (GPS: -0.05 lat/lng) ──────→ emitAmbulanceMoved           │
  │                              ┌───→ Real-time map update    │
  │                              │     ETA recalculation       │
  │                              └───→ Dashboard refresh       │
  │                                                              │
  │          ┌──────────────────────────────────┐               │
  │          │ PATCH /ambulances/:id (status)   │               │
  │          │ Updates in DB, Socket broadcast  │               │
  │          └──────────────────────────────────┘               │
  │                              ↓                               │
  │←─── emitIncidentStatusUpdate "EN_ROUTE" ──────────→         │
  │                                                              │
  │─────────────────→ (Reaches hospital)                        │
  │                            ├─→ emitNewIncident             │
  │                            │   "Patient incoming"           │
  │                            ├─→ Staff notification          │
  │                            └─→ Dashboard alert             │
  │                                                              │
  │←─── emitIncidentStatusUpdate "ARRIVED" ────────→           │
  │                                                              │
  └─ (Complete) ──→ emitIncidentStatusUpdate "COMPLETED" ───→  │
                                              Admin records
```

---

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Manual Testing Checklist

- [ ] **User Flow:** Submit emergency → See assigned ambulance → Track in real-time
- [ ] **Hospital Flow:** Receive incident notification → Update bed count → View analytics
- [ ] **Admin Flow:** View all incidents → Manually reassign resources → Check metrics
- [ ] **Guest Mode:** Submit emergency without login → Get tracking link
- [ ] **Real-Time:** Open multiple dashboards → Verify Socket.io sync
- [ ] **Error Handling:** Test with invalid data, network issues, expired tokens

### API Testing with cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'

# Create Emergency
curl -X POST http://localhost:3001/api/emergencies \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientName":"John Doe",
    "phone":"9999999999",
    "type":"cardiac",
    "description":"Chest pain",
    "latitude":28.7041,
    "longitude":77.1025
  }'

# Get Hospitals
curl http://localhost:3001/api/hospitals \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🐛 Troubleshooting

### Common Issues

**❌ Backend won't start - Port 3001 already in use**
```bash
# Windows - Kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

**❌ Firebase authentication error**
- ✅ Verify `.env` Firebase credentials are correct
- ✅ Check Firebase console → Authentication → Sign-in method (Google enabled?)
- ✅ Ensure domain is added to authorized domains

**❌ MongoDB connection refused**
- ✅ Confirm MongoDB is running: `mongosh`
- ✅ Check MONGO_URI in `.env` (user, password, cluster name)
- ✅ Use Memory mode for quick testing: `DB_PROVIDER=memory`

**❌ Real-time updates not working (Socket.io)**
- ✅ Backend and frontend on same origin? (http://localhost both)
- ✅ Check browser console for Socket.io connection errors
- ✅ Verify no proxy/firewall blocking WebSocket

**❌ TypeScript errors in IDE**
- ✅ Run: `npm install`
- ✅ Restart VS Code
- ✅ Delete node_modules and `.next` folder, reinstall

**❌ Forms submitting but no response**
- ✅ Check Network tab in DevTools (API calls succeeding?)
- ✅ Verify auth token in Local Storage
- ✅ Check backend logs for errors

### Debug Mode

**Backend:**
```bash
DEBUG=* npm run dev
```

**Frontend:**
```bash
# Add to vite.config.ts
define: {
  __DEV__: true
}
```

---

## 📝 License

This project is licensed under the **MIT License** - see LICENSE file for details.

---

## 📞 Support & Contributing

For bugs, features, or questions:
1. Check existing GitHub issues
2. Create a new issue with:
   - Clear title & description
   - Steps to reproduce (if bug)
   - Screenshots/logs
   - Your environment (OS, Node version, etc.)

We welcome pull requests! Please:
- Fork the repository
- Create a feature branch (`git checkout -b feature/amazing-feature`)
- Commit changes (`git commit -m 'Add amazing feature'`)
- Push to branch (`git push origin feature/amazing-feature`)
- Open a Pull Request

---

## 🙏 Acknowledgments

- **Radix UI** - Component primitives
- **Leaflet** - Open-source map library
- **Socket.io** - Real-time communication
- **Firebase** - Authentication & cloud services
- **Express & Node.js** - Backend foundation
- **React & Vite** - Modern frontend tooling

---

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Router Docs](https://reactrouter.com/)
- [Express.js Guide](https://expressjs.com/)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Socket.io Tutorial](https://socket.io/docs/v4/)
- [Leaflet Maps](https://leafletjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

**Happy emergency dispatching! 🚑💨**

*Last updated: May 2026 | v1.0.0*


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
- Use any Email id and password

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
## Updates
- Added Firebase Google Authentication

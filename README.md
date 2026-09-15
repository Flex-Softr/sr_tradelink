# SR Tradelink (এস আর ট্রেডলিংক)

A modern, full-featured enterprise management and inventory system for **SR Tradelink**, featuring a customer-facing digital storefront, comprehensive administrative dashboard, customer transaction ledger, sales analytics reporting with PDF/Excel exports, and role-based user management.

---

## Table of Contents

- [Overview](#overview)
- [Architecture & System Design](#architecture--system-design)
- [Tech Stack](#tech-stack)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Database Setup](#installation--database-setup)
- [Starting Systems & Execution Modes](#starting-systems--execution-modes)
  - [1. Development Mode](#1-development-mode)
  - [2. Production Mode (Standard)](#2-production-mode-standard)
  - [3. Standalone Mode (Optimized Node Server)](#3-standalone-mode-optimized-node-server)
  - [4. Docker Container Mode](#4-docker-container-mode)
- [NPM Scripts Reference](#npm-scripts-reference)
- [Project Directory Structure](#project-directory-structure)

---

## Overview

SR Tradelink is designed to streamline trading and wholesale operations through two main interfaces:

1. **Public Storefront**: Fast, responsive landing page showcasing company brand, product catalog, company details, and inquiry channels.
2. **Administrative Dashboard**:
   - **Products Management**: Catalog CRUD, inventory tracking, unit conversions (`KG`, `G`, `L`, `ML`, `PIECE`, `BOX`, `BAG`), and pricing.
   - **Customers & Ledger**: Customer directory (Retail / Wholesale / VIP) with individual financial ledgers tracking Sales, Payments, and Outstanding Dues.
   - **Sales Analytics & Reporting**: Centralized sales overview with date filtering, daily trends, collection rates, and instant PDF/Excel exports.
   - **User Management**: Role-based access control (`admin`, `user`) with Argon2 password hashing and credentials authentication.
   - **Modern Header**: Responsive navigation featuring a compact circular user menu dropdown and `nowrap` text layout.

---

## Architecture & System Design

The application is built on the **Next.js App Router** architecture with server actions and RESTful API routes, backed by **Prisma ORM** connecting to **MongoDB**.

```mermaid
flowchart TD
    subgraph Client["Client Tier"]
        Browser["Web Browser / Mobile Client"]
    end

    subgraph AppServer["Next.js Application Tier (Node.js)"]
        Middleware["NextAuth Middleware (Proxy / Protection)"]

        subgraph Routes["Routing & Presentation"]
            Storefront["Public Storefront (/ & /login)"]
            Dashboard["Admin Dashboard (/dashboard/*)"]
            UserMenu["User Dropdown & Header Nav"]
        end

        subgraph LogicTier["Server Layer"]
            ServerActions["Server Actions (src/actions/*)"]
            APIRoutes["REST API Endpoints (/api/*)"]
            AuthEngine["NextAuth (Argon2 Credentials)"]
            ExportEngines["PDF (jsPDF) & Excel (xlsx) Engines"]
        end

        subgraph DataAccess["Data Access Layer"]
            PrismaClient["Prisma ORM Client"]
        end
    end

    subgraph DatabaseTier["Database Tier"]
        MongoDB[("MongoDB Database")]
    end

    Browser --> Middleware
    Middleware --> Storefront
    Middleware --> Dashboard
    Dashboard --> UserMenu

    Storefront --> ServerActions
    Dashboard --> ServerActions
    Dashboard --> APIRoutes

    ServerActions --> AuthEngine
    ServerActions --> ExportEngines
    ServerActions --> PrismaClient
    APIRoutes --> PrismaClient

    PrismaClient --> MongoDB
```

### Architectural Highlights

- **Server-First Architecture**: Next.js App Router utilizes Server Components for optimal SEO and performance, coupled with Client Components for interactive UI widgets.
- **Unified Standalone Output**: Built with `output: "standalone"` to automatically bundle all server dependencies into a minimal runtime directory (`.next/standalone`), reducing Docker image size and deployment footprint.
- **Security & RBAC**: NextAuth session management with Argon2id cryptographic password hashing, role enforcement, and protected dashboard routing.
- **Export Pipeline**: Client/server utilities for generating branded PDF financial statements and Excel workbooks with automated formatting and Bangla script support.

---

## Tech Stack

| Domain                  | Technologies                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| **Framework**           | Next.js 16 (App Router, Turbopack)                                   |
| **Language**            | TypeScript 5 (Strict Mode)                                           |
| **Frontend UI**         | React 19, Tailwind CSS v4, Remix Icons (`@remixicon/react`), Base UI |
| **Database & ORM**      | MongoDB, Prisma ORM (v6)                                             |
| **Authentication**      | NextAuth.js v4, Argon2 (`argon2id`)                                  |
| **Exports & Reporting** | jsPDF, html2canvas, SheetJS (`xlsx`)                                 |
| **Package Manager**     | npm                                                                  |
| **Containerization**    | Docker (Alpine Node 22 Multi-stage), Docker Compose                  |

---

## Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
# Database Connection URL (MongoDB)
DATABASE_URL="mongodb://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secure-random-secret-key"

# Optional Seed Credentials
SEED_ADMIN_EMAIL="admin@srtradelink.com"
SEED_ADMIN_PASSWORD="Admin@YourSecurePassword123"

# Optional Server Binding (Production / Standalone)
PORT=3000
HOSTNAME="0.0.0.0"
```

### Variable Reference

| Variable              | Required | Description                                                    | Example                                             |
| --------------------- | -------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `DATABASE_URL`        | **Yes**  | MongoDB connection string for Prisma.                          | `mongodb+srv://user:pass@cluster.mongodb.net/sr_db` |
| `NEXTAUTH_URL`        | **Yes**  | Canonical URL for NextAuth authentication redirects.           | `http://localhost:3000` (or your domain)            |
| `NEXTAUTH_SECRET`     | **Yes**  | Cryptographic key for encrypting JWT tokens and sessions.      | `openssl rand -base64 32`                           |
| `SEED_ADMIN_EMAIL`    | No       | Initial admin email created by `npm run db:seed`.              | `admin@srtradelink.com`                             |
| `SEED_ADMIN_PASSWORD` | No       | Initial admin password created by `npm run db:seed`.           | `Admin@123456`                                      |
| `PORT`                | No       | Port on which the standalone server listens (Default: `3000`). | `3000`                                              |
| `HOSTNAME`            | No       | Network interface for standalone server (Default: `0.0.0.0`).  | `0.0.0.0`                                           |

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x+` (Node 22 LTS recommended)
- **npm**: `v10.x+`
- **MongoDB**: Local MongoDB server or MongoDB Atlas cluster instance

### Installation & Database Setup

1. **Clone the repository and install dependencies**:

   ```bash
   git clone <repo-url>
   cd sr_tradelink
   npm install
   ```

2. **Configure environment variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URL and secrets
   ```

3. **Generate Prisma Client and push schema**:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Seed initial administrative user and product data**:
   ```bash
   npm run db:seed
   ```

---

## Starting Systems & Execution Modes

### 1. Development Mode

Runs Next.js development server with hot-module replacement (HMR) powered by Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

### 2. Production Mode (Standard)

Standard Next.js build and production server:

```bash
# Build the application
npm run build

# Start production server
npm start
```

---

### 3. Standalone Mode (Optimized Node Server)

The project is configured with `output: "standalone"`. This produces a minimal standalone Node server located in `.next/standalone`.

A helper script ([`start-standalone.sh`](./start-standalone.sh)) automatically syncs static assets and boots the standalone server:

```bash
# Step 1: Compile production build
npm run build

# Step 2: Start standalone server
npm run start:standalone

# Or run directly with custom port/host:
PORT=8080 HOSTNAME=0.0.0.0 ./start-standalone.sh
```

---

### 4. Docker Container Mode

Multi-stage Alpine Linux Docker build with production-grade security (non-root `nextjs` user) and minimal standalone output.

#### Using Docker Compose (Recommended)

```bash
# Build and run container in background
docker compose up --build -d

# View application logs
docker compose logs -f
```

#### Using Docker CLI directly

```bash
# Build Docker image
npm run docker:build
# or: ./docker-build.sh

# Run container
npm run docker:run
```

---

## NPM Scripts Reference

| Command                    | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`              | Starts local Next.js development server with Turbopack.                      |
| `npm run build`            | Compiles optimized Next.js production build and generates standalone bundle. |
| `npm run start`            | Runs standard Next.js production server.                                     |
| `npm run start:standalone` | Syncs static assets and boots the Next.js standalone Node server.            |
| `npm run db:seed`          | Seeds database with initial admin user and default products.                 |
| `npm run db:sync-legacy`   | Migrates and syncs all legacy MongoDB data (clients, partys, products, txs). |
| `npm run lint`             | Analyzes code for ESLint rule violations.                                    |
| `npm run format`           | Auto-formats code with Prettier.                                             |
| `npm run format:check`     | Checks code formatting against Prettier standards.                           |
| `npm run docker:build`     | Builds the production Docker image (`sr_tradelink:latest`).                  |
| `npm run docker:run`       | Runs the Docker container with environment file `.env`.                      |

---

## Project Directory Structure

```
sr_tradelink/
├── prisma/
│   ├── schema.prisma          # Database models (User, Customer, Product, Transaction)
│   └── seed.ts                # Database seed script for admin & initial products
├── public/
│   └── images/                # Static public images & brand assets
├── src/
│   ├── actions/               # Next.js Server Actions (products, customers, transactions, users)
│   ├── app/
│   │   ├── (dashboard)/       # Authenticated Admin Dashboard route group
│   │   │   └── dashboard/
│   │   │       ├── customers/ # Customer directory & individual ledger view
│   │   │       ├── products/  # Product management
│   │   │       ├── sales/     # Centralized sales analytics & reporting
│   │   │       └── users/     # Administrative user management
│   │   ├── (site)/            # Public website route group (Home, Login)
│   │   ├── api/               # Next.js REST API routes (auth, customers, transactions, users)
│   │   ├── layout.tsx         # Root layout with font and session providers
│   │   └── globals.css        # Global CSS with Tailwind CSS v4 styling
│   ├── components/
│   │   ├── auth/              # Login form component
│   │   ├── dashboard/         # Dashboard views (Sales, Customers, Products, Users)
│   │   ├── home/              # Landing page sections (Hero, About, Products, Contact)
│   │   ├── layout/            # Navigation bars, UserDropdown, Footer
│   │   ├── providers/         # NextAuth SessionProvider wrapper
│   │   └── ui/                # Reusable UI components (buttons, dialogs, cards, badges)
│   ├── data/                  # Static product fallbacks
│   ├── lib/                   # Utility libraries (prisma, auth, password, pdf-export, sheet-export)
│   └── types/                 # TypeScript custom types & NextAuth module augmentation
├── Dockerfile                 # Multi-stage production container definition
├── docker-compose.yml         # Container orchestration configuration
├── next.config.ts             # Next.js config (standalone output, remote image patterns)
├── package.json               # NPM dependencies and script tasks
└── start-standalone.sh        # Standalone server startup script
```

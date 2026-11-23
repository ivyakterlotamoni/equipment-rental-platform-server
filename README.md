# Equipment Rental Platform — Server

## Project Overview
This is the backend API for the Equipment Rental Platform. It provides authentication, equipment management, booking management, payment processing, and admin dashboard functionality.

## Live API
https://equipment-rental-platform-server.onrender.com

## Technology Stack
- Node.js
- Express.js
- TypeScript
- MongoDB
- Better Auth
- JWT
- Stripe
- JOSE

## Key Features
- User authentication and authorization
- Role-based access control
- Customer, Owner, and Admin permissions
- Equipment CRUD operations
- Equipment approval and rejection
- Booking creation and management
- Booking availability validation
- Stripe Checkout integration
- Stripe webhook payment verification
- Payment transaction records
- Admin dashboard APIs
- Protected API routes

## Installation

Clone the repository:

```bash
git clone https://github.com/ivyakterlotamoni/equipment-rental-platform-server.git
```

Navigate to the project folder:

```bash
cd equipment-rental-platform-server
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=equipment_admin
BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

Never commit your actual credentials or `.env` file to GitHub.

## Run Locally

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Start Production Server

```bash
npm start
```

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API status |
| GET | `/api/equipment` | Get approved equipment |
| POST | `/api/equipment` | Add equipment |
| GET | `/api/equipment/my-equipment` | Get owner's equipment |
| GET | `/api/bookings/my-bookings` | Get customer bookings |
| POST | `/api/bookings` | Create booking |
| POST | `/api/payments/create-checkout-session` | Create Stripe checkout |
| GET | `/api/admin/overview` | Admin dashboard overview |
| GET | `/api/admin/equipment` | Get all equipment |
| GET | `/api/admin/bookings` | Get all bookings |
| GET | `/api/admin/payments` | Get all payments |

Protected endpoints require authentication and appropriate user roles.

## Deployment
The backend is deployed using Render and uses MongoDB for database storage.

## Frontend Repository
https://github.com/ivyakterlotamoni/equipment-rental-platform-client

## Author
Ivy Akter Lota
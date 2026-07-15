# Expense Manager - Backend (Node.js + Express + MongoDB)

Complete REST API backend for the Expense Manager Android app.

## Tech Stack
- Node.js + Express.js
- MongoDB + Mongoose
- JWT authentication
- bcryptjs for password hashing

## Folder Structure
```
backend/
├── config/           # DB connection
├── controllers/       # Route handler logic
├── middleware/        # Auth guard, error handler
├── models/            # Mongoose schemas
├── routes/            # Express routers
├── services/          # Business logic (dashboard totals calculation)
├── utils/              # Helpers (JWT, response formatting)
├── uploads/            # Static file storage (future use)
├── app.js              # Express app setup
├── server.js           # Entry point
├── package.json
├── .env.example
└── README.md
```

## Setup Instructions

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```
```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/expense_manager
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=30d
```
For MongoDB Atlas, use your connection string instead:
`mongodb+srv://<user>:<password>@cluster0.mongodb.net/expense_manager`

### 3. Create the first Admin user
There's no public signup route (by design). Create the first admin directly in MongoDB, e.g. via `mongosh`:
```js
use expense_manager
db.users.insertOne({
  name: "Admin",
  email: "admin@example.com",
  // password below is bcrypt hash of "admin123" - generate your own with bcryptjs
  password: "$2a$10$examplehashreplacewithrealone",
  role: "admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```
Or simpler: temporarily add a throwaway script that calls `User.create({...})` with a plain password (the pre-save hook hashes it automatically), run it once, then delete it.
Once you have one admin, use `POST /api/auth/register` (admin-only) to create all other members.

### 4. Run the server
```bash
npm run dev     # with nodemon (auto-reload)
npm start       # production
```
Server runs at `http://localhost:5000`.

---

## API Reference

All responses follow this shape:
```json
{ "success": true|false, "message": "string", "data": {} }
```
All protected routes require header: `Authorization: Bearer <token>`

### Auth
| Method | Route | Access | Body |
|---|---|---|---|
| POST | /api/auth/login | Public | `{ email, password }` |
| POST | /api/auth/register | Admin | `{ name, email, password, role }` |
| GET | /api/auth/me | Private | - |

### Categories
| Method | Route | Access | Body |
|---|---|---|---|
| GET | /api/categories | Private | - (returns each category with daily/monthly/overall totals) |
| GET | /api/categories/:id | Private | - (returns category + expenses grouped by date) |
| POST | /api/categories | Admin | `{ name }` |
| PUT | /api/categories/:id | Admin | `{ name?, isActive? }` (rename and/or enable-disable) |
| DELETE | /api/categories/:id | Admin | - (blocked with 400 if expenses exist) |

### Expenses
| Method | Route | Access | Body |
|---|---|---|---|
| GET | /api/expenses?category=&from=&to= | Private | - |
| GET | /api/expenses/:id | Private | - |
| POST | /api/expenses | Private | `{ category, date, itemName, quantity?, price, purchasedBy, notes? }` |
| PUT | /api/expenses/:id | Private | any of the above fields |
| DELETE | /api/expenses/:id | Private | - |

### Personal Expenses
| Method | Route | Access | Body |
|---|---|---|---|
| GET | /api/personal-expenses | Private | - (member sees own, admin sees all) |
| GET | /api/personal-expenses/:id | Private | - |
| POST | /api/personal-expenses | Private | `{ date, itemName, quantity?, price, notes? }` |
| PUT | /api/personal-expenses/:id | Private | - |
| DELETE | /api/personal-expenses/:id | Private | - |

### Payments
| Method | Route | Access | Body |
|---|---|---|---|
| GET | /api/payments | Private | - |
| GET | /api/payments/:id | Private | - |
| POST | /api/payments | Private | `{ user? (admin only), amount, date, notes? }` |
| PUT | /api/payments/:id | Private | - |
| DELETE | /api/payments/:id | Private | - |

### Reports (Dashboard)
| Method | Route | Access | Notes |
|---|---|---|---|
| GET | /api/reports | Private | Returns `grandTotal`, `categoryTotals[]`, `activeMemberCount`, `perMemberShare`, `memberShares[]`. Recalculated live on every call. |

### Archive
| Method | Route | Access | Body |
|---|---|---|---|
| POST | /api/archive | Admin | `{ month, year }` - snapshots current dashboard totals |
| GET | /api/archive | Private | - list of all archived snapshots |

### Members (bonus - needed for "Active Members" logic)
| Method | Route | Access | Body |
|---|---|---|---|
| GET | /api/users | Admin | - |
| PUT | /api/users/:id | Admin | `{ name?, isActive?, role? }` |
| DELETE | /api/users/:id | Admin | - |

---

## Business Rules Implemented
- Category **cannot be deleted** if any expense exists under it (`400 Bad Request`).
- Disabling a category (`isActive: false`) blocks new expenses from being added to it, but keeps historical data intact.
- **Grand Total** = sum of `overallTotal` across all active categories.
- Grand Total is divided equally among all users where `isActive: true` — this happens live inside `GET /api/reports`, so it always reflects the current state (no caching), satisfying the "instantly recalculates" requirement.
- Expenses are grouped by date with a daily total when fetching a single category (`GET /api/categories/:id`).

## HTTP Status Codes Used
`200` OK · `201` Created · `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `500` Internal Server Error

## Security Notes
- Passwords are hashed with bcrypt (never stored in plain text).
- JWT expires based on `JWT_EXPIRES_IN` (default 30 days).
- Admin-only routes are protected by the `adminOnly` middleware.

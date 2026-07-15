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
Use the public signup route — **no manual DB insert needed**:
```
POST /api/auth/signup
{ "name": "Admin", "email": "admin@admin.com", "password": "admin123" }
```
**Special rule:** signing up with the exact email `admin@admin.com` automatically creates that account with `role: "admin"`. Any other email signs up as a regular `role: "member"`.

Once you have an admin account, you can either let other members self-signup via `/api/auth/signup` (they'll get `role: "member"`), or the admin can create them via `POST /api/auth/register`.

### 4. Create default categories (Dukaan, Roti)
Run the seed script once — it creates "Dukaan" and "Roti" categories automatically (safe to re-run, skips ones that already exist):
```bash
node seed.js
```
Admin can always add more categories later from the app (unlimited custom categories are supported).

### 5. Run the server
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
| POST | /api/auth/signup | Public | `{ name, email, password }` → `admin@admin.com` auto-becomes `role: "admin"`, everyone else becomes `role: "member"` |
| POST | /api/auth/login | Public | `{ email, password }` |
| POST | /api/auth/register | Admin | `{ name, email, password, role }` - admin manually creates a member/admin |
| GET | /api/auth/me | Private | - |

### Categories
| Method | Route | Access | Body |
|---|---|---|---|
| GET | /api/categories | Private | - each category includes raw totals AND net totals (after personal-expense deduction) AND `perMemberShare` (that category's net total ÷ active members) |
| GET | /api/categories/:id | Private | - same totals + expenses grouped by date |
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
| POST | /api/personal-expenses | Private | `{ date, itemName, quantity?, price, notes?, category? }` - if `category` is set, this amount is subtracted from that category's shared total before splitting |
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
| GET | /api/reports | Private | Recalculated **live** on every call (no caching). Returns: |

```json
{
  "grandTotal": 43800,
  "categoryTotals": [
    {
      "categoryId": "...",
      "categoryName": "Grocery",
      "dailyTotal": 500,
      "monthlyTotal": 12000,
      "overallTotal": 12000,
      "personalDeduction": 800,
      "netDailyTotal": 500,
      "netMonthlyTotal": 11200,
      "netOverallTotal": 11200,
      "perMemberShare": 2800
    }
  ],
  "activeMemberCount": 4,
  "perMemberShare": 10950,
  "memberShares": [
    {
      "userId": "...",
      "name": "Ali",
      "email": "ali@example.com",
      "share": 10950,
      "totalPaid": 8000,
      "balanceDue": 2950
    }
  ]
}
```
- `overallTotal` = raw sum of all expenses ever added to this category
- `personalDeduction` = sum of personal expenses tagged to this category (already paid for by an individual member)
- `netOverallTotal` = `overallTotal - personalDeduction` → this is the amount actually shared
- `perMemberShare` (inside `categoryTotals`) = that category's `netOverallTotal` ÷ `activeMemberCount` — **each category is individually divided among all active members**
- Top-level `grandTotal` = sum of every category's `netOverallTotal`
- Top-level `perMemberShare` = `grandTotal ÷ activeMemberCount`
- `totalPaid` = sum of that member's entries in `payments` collection
- `balanceDue` = `share - totalPaid` → **positive = still owes this amount, negative = has overpaid / in credit**

### Archive
| Method | Route | Access | Body |
|---|---|---|---|
| POST | /api/archive | Admin | `{ month, year }` - snapshots current dashboard totals |
| GET | /api/archive | Private | - list of all archived snapshots |

### Members (needed for "Active Members" division logic)
| Method | Route | Access | Body |
|---|---|---|---|
| GET | /api/users | Admin | - list all members |
| POST | /api/users | Admin | `{ name, email, password, role? }` - **Add Member** directly (admin action, no signup flow needed) |
| PUT | /api/users/:id | Admin | `{ name?, isActive?, role? }` |
| DELETE | /api/users/:id | Admin | - |

---

## Business Rules Implemented
- **Signup rule:** `POST /api/auth/signup` with email exactly `admin@admin.com` → account created with `role: "admin"`. Any other email → `role: "member"`. No manual DB seeding required.
- **Admin can add members directly:** `POST /api/users` (admin-only) creates a member account instantly — no signup flow needed for them.
- Category **cannot be deleted** if any expense exists under it (`400 Bad Request`).
- Disabling a category (`isActive: false`) blocks new expenses from being added to it, but keeps historical data intact.
- **Every category is individually divided among active members:** each category's `netOverallTotal` ÷ `activeMemberCount` = that category's `perMemberShare`.
- **Personal expenses reduce their linked category's total:** if a `PersonalExpense` has a `category` set, its amount is subtracted from that category's daily/monthly/overall totals (down to a floor of 0) before the category is split — since that portion was already covered personally by one member, it shouldn't be shared by everyone.
- **Grand Total** = sum of `netOverallTotal` (i.e. already net of personal-expense deductions) across all active categories.
- **Per Person Division** = Grand Total ÷ count of users where `isActive: true`. Recalculated live on every `GET /api/reports` / `GET /api/categories` call — no caching, no stored/stale totals.
- **Payments → Balance:** each member's `totalPaid` (sum of their `payments` documents) is subtracted from their `share` to produce `balanceDue` (positive = owes, negative = overpaid), also computed live.
- **Personal Expenses not linked to a category** are scoped purely per member (a member sees only their own; admin sees everyone's) and never affect any shared total.
- **Monthly Archive** (`POST /api/archive`) takes a point-in-time snapshot of the current Grand Total, every category's raw/net total, personal deduction, per-category share, and every member's share/paid/balanceDue — so historical months stay fixed even as new expenses are added later.
- Expenses are grouped by date with a daily total when fetching a single category (`GET /api/categories/:id`).
- **Instant recalculation:** because nothing is cached, adding/editing/deleting any Expense, Category, Personal Expense, Payment, or Member is reflected on the very next `GET /api/reports` (or `GET /api/categories`) call — no restart or manual refresh trigger needed.

## HTTP Status Codes Used
`200` OK · `201` Created · `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `500` Internal Server Error

## Security Notes
- Passwords are hashed with bcrypt (never stored in plain text).
- JWT expires based on `JWT_EXPIRES_IN` (default 30 days).
- Admin-only routes are protected by the `adminOnly` middleware.

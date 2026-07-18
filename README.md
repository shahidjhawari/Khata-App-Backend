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
| GET | /api/categories | Private | - each category includes `dailyTotal`/`monthlyTotal`/`overallTotal` (raw, unaffected by personal expenses), `perMemberShare` (overallTotal ÷ **included** members only), plus `includedMembers`/`excludedMembers` name lists |
| GET | /api/categories/:id | Private | - same totals + expenses grouped by date |
| POST | /api/categories | Admin | `{ name }` |
| PUT | /api/categories/:id | Admin | `{ name?, isActive? }` (rename and/or enable-disable) |
| PUT | /api/categories/:id/exclude-member | Admin | `{ userId }` - remove this member from this category's split (e.g. someone who doesn't eat Roti) |
| PUT | /api/categories/:id/include-member | Admin | `{ userId }` - add a previously-excluded member back in |
| DELETE | /api/categories/:id | Admin | - (blocked with 400 if expenses exist) |

### Expenses (category/shared expenses - admin-managed)
| Method | Route | Access | Body |
|---|---|---|---|
| GET | /api/expenses?category=&from=&to= | Private | - any logged-in member can view |
| GET | /api/expenses/:id | Private | - |
| POST | /api/expenses | **Admin** | `{ category, date, itemName, quantity?, price, purchasedBy, notes? }` |
| PUT | /api/expenses/:id | **Admin** | any of the above fields — edit an item the admin added |
| DELETE | /api/expenses/:id | **Admin** | - delete an item the admin added |

### Personal Expenses
| Method | Route | Access | Body |
|---|---|---|---|
| GET | /api/personal-expenses/summary | Private | Admin: list of all active members with their `dailyTotal`/`monthlyTotal`/`overallTotal` for personal expenses — **use this to power the "Personal Expense" entry screen (tap a member to add their expense)**. Member: sees only their own totals in the same shape. |
| GET | /api/personal-expenses?user=&lt;id&gt; | Private | Admin: list one member's personal expenses (after tapping them from the summary list). Member: always scoped to self, `?user=` is ignored. |
| GET | /api/personal-expenses/:id | Private | - |
| POST | /api/personal-expenses | Private | `{ date, itemName, quantity?, price, notes?, category?, user? }` — `category` is an **optional label only** (for the member's own filtering/reference), it has no effect on any shared category total. `user` is **admin-only**: set it to add this expense on behalf of a specific member (e.g. after tapping them in the list). Omit `user` (or if you're a regular member) to add it for yourself. |
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
  "grandTotal": 44300,
  "sharedCategoryTotal": 43800,
  "grandPersonalTotal": 500,
  "categoryTotals": [
    {
      "categoryId": "...",
      "categoryName": "Roti",
      "dailyTotal": 100,
      "monthlyTotal": 2000,
      "overallTotal": 2000,
      "perMemberShare": 666.67,
      "includedMembers": [{ "userId": "...", "name": "Ali" }, { "userId": "...", "name": "Umar" }],
      "excludedMembers": [{ "userId": "...", "name": "Basit" }]
    }
  ],
  "activeMemberCount": 3,
  "memberShares": [
    {
      "userId": "...",
      "name": "Ali",
      "email": "ali@example.com",
      "categoryShare": 10950,
      "personalTotal": 500,
      "share": 11450,
      "totalPaid": 8000,
      "balanceDue": 3450
    }
  ]
}
```
- `overallTotal` = raw sum of all expenses ever added to this category — **personal expenses never reduce this**, they're a completely separate ledger.
- **Per-category member exclusion:** each category has its own `includedMembers`/`excludedMembers`. `perMemberShare` = `overallTotal ÷ includedMembers.length` — e.g. if Basit is excluded from "Roti" (doesn't eat it), Roti's total is divided only between Ali and Umar, not Basit.
- `sharedCategoryTotal` = sum of every category's `overallTotal` (the pool that gets divided among included members)
- `grandPersonalTotal` = sum of every personal expense from every member (never divided — always attributed 100% to whoever spent it, and never subtracted from any category)
- Top-level `grandTotal` = `sharedCategoryTotal + grandPersonalTotal` — the full picture of everything the household has spent, with no double-counting (each rupee is counted in exactly one place: either as part of a shared category, or as one member's personal expense)
- Per member: `categoryShare` = sum of that member's `perMemberShare` across every category they're included in; `personalTotal` = that member's own personal expenses (added in full, never divided among others); `share` = `categoryShare + personalTotal` = what they owe in total
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
- **Only the admin manages category (shared) expenses:** `POST`/`PUT`/`DELETE /api/expenses` all require `role: "admin"` — members can view (`GET`) but not add/edit/delete shared entries. The admin can edit or delete any item they (or any admin) added.
- Category **cannot be deleted** if any expense exists under it (`400 Bad Request`).
- Disabling a category (`isActive: false`) blocks new expenses from being added to it, but keeps historical data intact.
- **Per-category member exclusion:** admin can remove any specific member from any specific category's split (`PUT /api/categories/:id/exclude-member`) — e.g. a member who doesn't eat Roti can be excluded from the Roti category only, while still being included in Grocery, Rent, etc. That category's `perMemberShare` then divides only among the remaining included members. Works on existing categories at any time — exclusions/inclusions take effect immediately on the next calculation.
- **Personal expenses are a fully separate ledger — no double-counting:** a `PersonalExpense` never reduces or otherwise touches any category's shared total. Its amount is counted exactly once: fully against the member who spent it (`personalTotal`), and once into the overall `grandTotal`. It is never divided among other members.
- **Grand Total** = `sharedCategoryTotal` (sum of every category's raw total) + `grandPersonalTotal` (sum of every personal expense from every member) — every rupee counted exactly once.
- **Per Person amount owed** = `categoryShare` (sum of their per-category shares, respecting exclusions) + `personalTotal` (their own personal expenses, in full). Recalculated live on every `GET /api/reports` / `GET /api/categories` call — no caching, no stored/stale totals.
- **Payments → Balance:** each member's `totalPaid` (sum of their `payments` documents) is subtracted from their `share` to produce `balanceDue` (positive = owes, negative = overpaid), also computed live.
- **Monthly Archive** (`POST /api/archive`) takes a point-in-time snapshot of the current Grand Total, every category's total with included/excluded member names, and every member's category share + personal total + balance — so historical months stay fixed even as new expenses are added later.
- Expenses are grouped by date with a daily total when fetching a single category (`GET /api/categories/:id`) — each new expense added appears in the date's item list, building a running history, with dates sorted newest-first.
- **Instant recalculation:** because nothing is cached, adding/editing/deleting any Expense, Category, Personal Expense, Payment, Member, or category member exclusion is reflected on the very next `GET /api/reports` (or `GET /api/categories`) call — no restart or manual refresh trigger needed.

## HTTP Status Codes Used
`200` OK · `201` Created · `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `500` Internal Server Error

## Security Notes
- Passwords are hashed with bcrypt (never stored in plain text).
- JWT expires based on `JWT_EXPIRES_IN` (default 30 days).
- Admin-only routes are protected by the `adminOnly` middleware.

# SafeRoute BD 🛡️

**Smart Community Safety & Incident Management System — Bangladesh**

> *Report. Track. Stay Safe.*

---

## Project Structure

```
SafeRoute BD/
├── frontend/           ← HTML / CSS / JS pages
│   ├── index.html          Landing page
│   ├── register.html       User registration
│   ├── login.html          Login page
│   ├── user-dashboard.html Public user dashboard
│   ├── admin-dashboard.html Admin control panel
│   ├── css/style.css       Global stylesheet
│   └── js/
│       ├── register.js     Registration logic
│       └── login.js        Login logic
│
└── backend/            ← Node.js + Express API
    ├── server.js           Entry point
    ├── .env.example        Environment template → copy to .env
    ├── package.json
    ├── config/db.js        Oracle DB connection pool
    ├── routes/auth.js      POST /register, POST /login
    ├── middleware/
    │   └── authMiddleware.js  JWT verification
    └── db/schema.sql       Oracle schema (run once)
```

---

## Quick Start

### 1. Set up Oracle Database

Run `backend/db/schema.sql` in SQL*Plus or SQL Developer:
```sql
@schema.sql
```

### 2. Configure environment

```bash
cd backend
copy .env.example .env
# Edit .env with your Oracle DB credentials and a JWT secret
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Start the backend

```bash
npm start
# → Running at http://localhost:3000
# → Health check: http://localhost:3000/api/health
```

### 5. Open the frontend

Open `frontend/index.html` in your browser, or use [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET`  | `/api/health` | Server health check |

### Register payload
```json
{
  "full_name": "Rahim Ahmed",
  "email": "rahim@example.com",
  "phone": "01700000000",
  "password": "SecurePass1!",
  "role": "PUBLIC_USER"
}
```

### Login payload
```json
{
  "email": "rahim@example.com",
  "password": "SecurePass1!"
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, Vanilla CSS, Vanilla JS |
| Backend | Node.js 18+, Express 4 |
| Database | Oracle DB (SEQUENCE + TRIGGER) |
| Auth | JSON Web Tokens (JWT) |
| Passwords | bcryptjs (salt rounds: 12) |

---

## Design

- **Primary**: `#0D1B2A` deep navy
- **Accent**: `#1DBF8A` teal
- **Font**: Inter (Google Fonts)
- Glassmorphism card design
- Mobile responsive
- Animated gradient background

---

*Built for Bangladesh 🇧🇩 — SafeRoute BD*

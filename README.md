# ECE Budget Portal

Initial prototype of the ECE Budget Portal developed to facilitate budget tracking and management activities within the ECE department.

## Features

- Budget Dashboard
  - Displays accumulated income, expenditure, and inventory summary.
  - Navigation for the three ECE budget modules.

- Institute's Accumulated Income
  - Track ECE accumulated budget heads in the shared Excel-template format.
  - Maintain sanctioned amount, description, utilised amount, remaining amount, and purchases-for details.
  - Admin users can upload supporting invoice/document files.

- Expenditure Budget
  - Track 2026-27 expenditure particulars in the shared Excel-template format.
  - Maintain budget, utilized amount, remaining amount/balance, date, status, and invoice details.
  - Admin users can approve/reject pending expenditure rows.

- Inventory Management
  - Maintain a list of purchased items and resources.
  - Monitor quantity, location, purchase amount, and invoice proof.

- Role-Based Access
  - Admin users can create, edit, delete, approve/reject, and upload invoices.
  - Viewer users can review, filter, and export records without update controls.

- Reporting Tools
  - Search, financial-year filtering, date/category/status filters where applicable.
  - CSV export for accumulated budget, expenditure, and inventory registers.

## Tech Stack

- React
- Vite
- React Router DOM
- Node.js backend API
- JSON file persistence for local development
- CSS

## Project Structure

```
src/
├── pages/
│   ├── Dashboard.jsx
│   ├── AddExpense.jsx
│   ├── Invoices.jsx
│   └── Inventory.jsx
├── App.jsx
├── main.jsx
└── data.js

server/
├── server.js
├── db.json
└── uploads/
```

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/theharshaverma/ECE-Budget-Portal.git
```

2. Navigate to the project directory:

```bash
cd ECE-Budget-Portal
```

3. Install dependencies:

```bash
npm install
```

4. Start the backend API server:

```bash
npm run api
```

The API runs at:

```txt
http://127.0.0.1:4000
```

5. In another terminal, start the frontend development server:

```bash
npm run dev
```

Demo login accounts:

```txt
Admin:  admin / admin123
Viewer: viewer / viewer123
```

## API Overview

```txt
POST /api/auth/login
GET  /api/me

GET  /api/income
POST /api/income
PUT  /api/income/:id
DELETE /api/income/:id

GET  /api/expenses
POST /api/expenses
PUT  /api/expenses/:id
DELETE /api/expenses/:id

GET  /api/inventory
POST /api/inventory
PUT  /api/inventory/:id
DELETE /api/inventory/:id

POST /api/uploads
GET  /uploads/:fileName
```

## Production Handover

See [docs/IT_HANDOVER.md](docs/IT_HANDOVER.md) for deployment notes,
environment variables, API routes, suggested database tables, and storage
requirements.

## Status

This repository currently contains a working local prototype with a Node.js API. The JSON storage can later be replaced with PostgreSQL/MySQL when deployment requirements are finalized

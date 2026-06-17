# ECE Budget Portal

Initial prototype of the ECE Budget Portal developed to facilitate budget tracking and management activities within the ECE department.

## Features

- Budget Dashboard
  - Displays accumulated income, expenditure, and inventory summary.
  - Navigation for the three ECE budget modules.

- Institute's Accumulated Income
  - Track institute grants, recoveries, overheads, and income references.
  - Admin users can upload supporting invoice/document files.

- Expenditure Budget
  - Add and track departmental expenses.
  - Maintain vendor, status, amount, date, and invoice details.

- Inventory Management
  - Maintain a list of purchased items and resources.
  - Monitor quantity, location, purchase amount, and invoice proof.

- Role-Based Access
  - Admin users can create records and upload invoices.
  - Viewer users can review records without update controls.

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

GET  /api/expenses
POST /api/expenses

GET  /api/inventory
POST /api/inventory

POST /api/uploads
GET  /uploads/:fileName
```

## Status

This repository currently contains a working local prototype with a Node.js API. The JSON storage can later be replaced with PostgreSQL/MySQL when deployment requirements are finalized.

# ECE Budget Portal IT Handover

## Current Application

The project contains:

- React/Vite frontend
- Node.js local API prototype
- Role-based login for admin/viewer
- CRUD APIs for income, expenditure, and inventory
- Invoice upload support
- Local JSON persistence for development

The local JSON backend is intended as a development prototype. For production,
IT should replace it with managed database and storage services.

## Local Commands

```bash
npm install
npm run api
npm run dev
npm run build
npm run lint
```

## Environment Variables

```txt
VITE_API_BASE_URL=https://your-production-api.example.edu
API_PORT=4000
AUTH_SECRET=<long random secret>
```

## Demo Users

Development-only credentials:

```txt
admin / admin123
viewer / viewer123
```

These should be removed before production.

## API Routes

```txt
POST /api/auth/login
GET  /api/me

GET    /api/income
POST   /api/income
PUT    /api/income/:id
DELETE /api/income/:id

GET    /api/expenses
POST   /api/expenses
PUT    /api/expenses/:id
DELETE /api/expenses/:id

GET    /api/inventory
POST   /api/inventory
PUT    /api/inventory/:id
DELETE /api/inventory/:id

POST /api/uploads
GET  /uploads/:fileName
```

## Suggested Database Tables

### users

- id
- username/email
- name
- role: admin/viewer
- password_hash or external_auth_id
- created_at
- updated_at

### income_records

- id
- source
- reference
- date
- amount
- invoice_id
- notes
- created_by
- created_at
- updated_by
- updated_at

### expenditure_records

- id
- head
- vendor
- date
- amount
- status
- invoice_id
- created_by
- created_at
- updated_by
- updated_at

### inventory_items

- id
- item
- category
- quantity
- location
- purchase_date
- amount
- invoice_id
- created_by
- created_at
- updated_by
- updated_at

### invoices

- id
- original_file_name
- storage_key
- mime_type
- size_bytes
- uploaded_by
- uploaded_at

### audit_logs

- id
- user_id
- action
- entity_type
- entity_id
- old_value
- new_value
- created_at

## Production Requirements

- Replace JSON storage with PostgreSQL/MySQL.
- Store passwords with hashing, or integrate institute SSO.
- Store invoice files in IT-managed storage.
- Restrict invoice download access to authenticated users.
- Enable HTTPS.
- Configure database and file backups.
- Use a process manager such as PM2, systemd, or Docker.
- Add server-side request validation and structured logging.
- Remove demo credentials before launch.

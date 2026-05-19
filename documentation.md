# GK Health Care Backend — Sprint Documentation

Single source of truth for everything built sprint by sprint. After each sprint, append the new section here.

Stack: Node.js + Express + MongoDB/Mongoose + Zod + bcryptjs + JWT + ExcelJS + Winston. Modular monolith, flow: Route → Middleware → Validation → Controller → Service → Model → MongoDB.

Standard responses:

```json
// success
{ "success": true, "message": "...", "data": {}, "meta": {} }
// error
{ "success": false, "message": "...", "errors": [] }
```

Base URL: `http://localhost:5002/api/v1` (port 5002). Protected routes need `Authorization: Bearer <token>`.

---

## Sprint 0 — Project Setup and Foundation

### Goal
Bootstrap the Express server with config, middleware, error handling, helpers, and a health check.

### Final folder structure (post Sprint 0)

```
Backend/
├── .env.example
├── .gitignore
├── package.json
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    │   ├── db.js
    │   ├── env.js
    │   └── logger.js
    ├── middlewares/
    │   └── errorHandler.js
    ├── modules/
    │   └── health/
    │       ├── health.controller.js
    │       └── health.routes.js
    ├── routes/
    │   └── index.js
    └── utils/
        ├── ApiError.js
        ├── ApiResponse.js
        └── asyncHandler.js
```

### What was wired
- **env** — centralized loader, warns on missing `MONGODB_URI` / `JWT_SECRET`. Defaults: `PORT=5002`, `API_PREFIX=/api/v1`.
- **MongoDB** — `connectDB()` / `disconnectDB()` with connection-event logging.
- **Logger** — Winston; pretty in dev, JSON in prod; `.stream` for Morgan.
- **Security & middleware** — Helmet, CORS (list or `*`), compression, JSON/urlencoded body parsers (10 MB), Morgan.
- **Errors** — `notFoundHandler` + `errorHandler` normalize Zod, Mongoose validation/cast, duplicate-key, JWT errors.
- **Helpers** — `ApiError` (static factories: badRequest/unauthorized/forbidden/notFound/conflict/unprocessable/internal), `ApiResponse` (ok/created/noContent), `asyncHandler`.
- **Graceful shutdown** — SIGINT/SIGTERM + unhandled-rejection handlers close HTTP + Mongo cleanly.

### Scripts
```bash
npm install
npm run dev     # nodemon
npm start
```

### Health check
`GET /api/v1/health` → returns `{ status, uptimeSeconds, timestamp, db, env, version }`.

---

## Sprint 1 — Auth, Users, Roles, RBAC

### Goal
Login flow, dynamic roles, module-wise permissions, full user CRUD, seed first admin.

### Modules added
```
src/constants/{modules.js, status.js}
src/middlewares/{auth.js, validate.js}
src/modules/auth/{auth.routes,auth.controller,auth.service,auth.validation}.js
src/modules/users/{user.model,user.routes,user.controller,user.service,user.validation}.js
src/modules/roles/{role.model,role.routes,role.controller,role.service,role.validation}.js
src/scripts/seed.js
```

### APP_MODULES (canonical 22 keys)
`dashboard, customers, customer_contacts, customer_machines, leads, tasks, products, spare_parts, installation_reports, service_reports, preventive_maintenance_reports, inspection_reports, incident_reports, quotations, payments, outstandings, expenses, notifications, users, roles, locations, settings`.

Each stored permission record is `{ moduleKey, moduleName, read, write }`. `moduleName` is auto-filled from the catalog by the Role pre-validate hook.

### Status enums
- `USER_STATUS`: `Active | Inactive | Blocked`
- `ROLE_STATUS`: `Active | Inactive`

### Models (key fields)
**User**: `name, mobileNumber (unique), email, password (select:false, bcrypt), roleId, department, designation, profileImage, fcmTokens (stripped from JSON), lastLoginAt, passwordResetRequired, status, isDeleted-free (users use status), audit fields`.

**Role**: `roleName (unique), description, isSuperAdmin (seed-only), status, permissions[], audit fields`. Virtual `isActive` getter. Method `hasPermission(moduleKey, action)`.

### Permission rules
- Write requires read — enforced 3x: Zod, Mongoose pre-validate hook, runtime `hasPermission`.
- Super Admin bypasses all `checkPermission` checks.
- Inactive user OR inactive role blocks login AND blocks every protected route (auth middleware re-checks status on every request).
- Super Admin role cannot be modified or have its status changed; `isSuperAdmin` cannot be set via API.

### Auth API

#### POST /auth/login
```json
{ "mobileNumber": "9999999999", "password": "Admin@123" }
```
Response (custom envelope per API_CONTRACTS — top-level `token`):
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token",
  "refreshToken": "jwt_refresh",
  "data": {
    "_id": "...", "name": "...", "mobileNumber": "...", "email": "...",
    "department": "...", "designation": "...", "status": "Active",
    "passwordResetRequired": false,
    "role": { "_id": "...", "roleName": "...", "isSuperAdmin": true, "status": "Active", "permissions": [...] }
  }
}
```

#### GET /auth/me — current user (standard envelope)
#### PATCH /auth/change-password — body `{ oldPassword, newPassword }`

### User API
```
POST   /users                       create
GET    /users?page&limit&search&roleId&status
GET    /users/:id
PUT    /users/:id                   partial update
PATCH  /users/:id/status            { "status": "Active|Inactive|Blocked" }
PATCH  /users/:id/reset-password    { "newPassword": "..." }   (sets passwordResetRequired:true)
```

### Role API
```
POST   /roles                       create (perm matrix in body)
GET    /roles?page&limit&search&status   meta.modules = APP_MODULES catalog
GET    /roles/:id
PUT    /roles/:id
PATCH  /roles/:id/status            { "status": "Active|Inactive" }
```

Permission body shape:
```json
{ "moduleKey": "customers", "moduleName": "Customers / Hospitals", "read": true, "write": true }
```
`moduleName` is optional in requests; server fills it from the catalog. Duplicates per role are rejected.

### Seed
```bash
npm run seed
```
Idempotent. Creates Super Admin role + first admin user.

Defaults (override via env `SEED_ADMIN_NAME / SEED_ADMIN_MOBILE / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD`):

| Field | Value |
|---|---|
| Mobile | `9999999999` |
| Email | `admin@gkhealthcare.local` |
| Password | `Admin@123` (change immediately) |
| Role | Super Admin (bypass) |

### Reconciliation note (done after Sprint 1)
- Renamed `role.name → roleName`, `user.role → roleId`, `isActive → status` enum.
- Added missing user fields (`department`, `profileImage`, `fcmTokens`, `passwordResetRequired`).
- Login response reshaped to match API_CONTRACTS.
- Permissions now persist `moduleName`.
- Scaffolded `src/services/`, `src/templates/`, `src/jobs/`, `tests/`, `uploads/` for future sprints.

---

## Sprint 2 — Customers, Customer Contacts, Locations

### Goal
Hospital/customer management with state/city masters and per-customer contacts.

### Modules added
```
src/constants/{customerTypes.js, regex.js}
src/utils/codeGenerator.js                    (atomic counter-backed code generator)
src/modules/counters/counter.model.js
src/modules/locations/{state.model,city.model,location.routes,location.controller,location.service,location.validation}.js
src/modules/customers/{customer.model,customer.routes,customer.controller,customer.service,customer.validation}.js
src/modules/customerContacts/{customerContact.model,customerContact.routes,customerContact.controller,customerContact.service,customerContact.validation}.js
```

### Shared regexes
- `PHONE_IN = /^[6-9]\d{9}$/`
- `PINCODE_IN = /^[1-9][0-9]{5}$/`
- `EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/`
- `OBJECT_ID = /^[a-f\d]{24}$/i`

### Customer types
`Hospital | Dialysis Center | Clinic | Distributor | Other`

### Atomic code generator
`nextCode(key, prefix, pad=5)` uses a `counters` collection (`_id` = key, `seq` int) with `$inc + upsert` so concurrent requests get distinct codes. Used in Sprint 2 for `CUST-00001…` and reused in Sprint 3 for `PROD-…`, `SPR-…`.

### Models
**Customer**: `customerCode (unique, auto), customerName, phone, email, hospitalName, gstin, address, stateId+stateName, cityId+cityName, pincode, customerType, assignedTo, totalOutstanding, status, isDeleted+deletedAt+deletedBy, audit`.

**CustomerContact**: `customerId, name, phone, email, position, department, remarks, status, isDeleted+deletedAt+deletedBy, audit`.

**State**: `name (unique), code, country (default India), status, audit`.

**City**: `name + stateId (compound unique), stateName (denormalized), status, audit`.

### Soft delete pattern
`DELETE` flips `isDeleted: true`, sets `deletedAt` / `deletedBy`, forces `status: "Inactive"`. All GET/PUT queries filter `isDeleted: false`. Same pattern is applied to all subsequent business records.

### Denormalization
When `stateId` / `cityId` are submitted on customer create/update, the service looks them up and stores `stateName` / `cityName` alongside. Mismatched city↔state rejected with 400.

### Locations API
```
GET  /locations/states[?search&status]
POST /locations/states              { name, code?, country?, status? }
GET  /locations/cities[?stateId&search&status]
POST /locations/cities              { name, stateId, status? }
```

### Customers API
```
POST   /customers
GET    /customers?page&limit&search&status&stateId&cityId&customerType&assignedTo
GET    /customers/:id
PUT    /customers/:id
DELETE /customers/:id     (soft delete)
```

Sample create body:
```json
{
  "customerName": "Mr. Ramesh", "phone": "9876543210", "email": "ramesh@hospital.com",
  "hospitalName": "Sri Lakshmi Dialysis Center", "gstin": "29ABCDE1234F1Z5",
  "address": "No 25, Main Road, Rajajinagar", "stateId": "...", "cityId": "...",
  "pincode": "560010", "customerType": "Dialysis Center", "assignedTo": "<userId>"
}
```

### Customer contacts API
```
POST   /customer-contacts
GET    /customer-contacts/customer/:customerId
PUT    /customer-contacts/:id
DELETE /customer-contacts/:id      (soft delete)
```

### RBAC keys used
`locations` read/write, `customers` read/write, `customer_contacts` read/write.

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| customers | `customerCode` unique | code lookup |
| customers | `hospitalName`, `assignedTo`, `status`, `isDeleted` | list filters |
| customers | text on `customerName,hospitalName,phone,email,customerCode` | future $text search |
| customercontacts | `customerId`, `status`, `isDeleted` | sub-list lookups |
| cities | `(stateId, name)` unique | dedup per state |
| cities | `stateId`, `status` | dropdown queries |
| states | `name` unique, `status` | dropdowns |
| counters | `_id` (built-in) | sequence atomicity |

---

## Sprint 3 — Products, Spare Parts, Customer Machines (+ Excel import)

### Goal
Catalog of products and spare parts, installed-machine tracking per customer, Excel import skeleton.

### Modules added
```
src/constants/productTypes.js                 PRODUCT_TYPES, MACHINE_STATUSES, MACHINE_SERVICE_TYPES
src/middlewares/upload.js                     excelUpload (memory, 10 MB, mime-filtered)
src/middlewares/errorHandler.js               UPDATED — clean MulterError mapping (413 LIMIT_FILE_SIZE, etc.)
src/services/excelService.js                  parseFirstSheet(buffer) → { headers, rows }
src/modules/products/{product.model,...}.js   (+ importFromExcel)
src/modules/spareParts/{sparePart.model,...}.js (+ importFromExcel)
src/modules/customerMachines/{customerMachine.model,...}.js
```

### Codes & enums
- `productCode` auto: `PROD-00001…` (counter key `product`)
- `partCode` auto: `SPR-00001…` (counter key `sparePart`)
- `PRODUCT_TYPES`: `Dialysis Machine | Accessory | Service Item | Other`
- `MACHINE_STATUSES`: `Installed | Active | Under Maintenance | Decommissioned | Returned`
- `MACHINE_SERVICE_TYPES`: `Warranty | AMC | Out of Warranty`

### Models
**Product**: `productCode, productName, productType, category, manufacturer, modelNumber, description, price, gstPercentage (0-100), hsnCode, warrantyMonths, status, soft-delete fields, audit`.

**SparePart**: `partCode, partName, compatibleMachine, category, manufacturer, rate, gstPercentage, stockQuantity, description, status, soft-delete fields, audit`.

**CustomerMachine**: `customerId, productId, machineName, modelNumber, manufacturer, serialNumber (partial-unique when present), soldDate, installationDate, warrantyStartDate/EndDate, amcStartDate/EndDate, machineStatus, serviceType, lastServiceDate, nextServiceDueDate, remarks, status, soft-delete fields, audit`.

Service-history auto-updates (`lastServiceDate`, `nextServiceDueDate` set from report creation) come in Sprint 7.

### APIs
```
# Products
POST   /products
GET    /products?page&limit&search&status&productType&category
GET    /products/:id
PUT    /products/:id
DELETE /products/:id                       (soft delete)
POST   /products/import-excel              multipart/form-data field "file"

# Spare parts
POST   /spare-parts
GET    /spare-parts?page&limit&search&status&category&compatibleMachine
GET    /spare-parts/:id
PUT    /spare-parts/:id
DELETE /spare-parts/:id                    (soft delete)
POST   /spare-parts/import-excel           multipart/form-data field "file"

# Customer machines
POST   /customer-machines
GET    /customer-machines?page&limit&search&customerId&productId&machineStatus&serviceType&status&dueBefore
GET    /customer-machines/customer/:customerId
GET    /customer-machines/:id
PUT    /customer-machines/:id
DELETE /customer-machines/:id              (soft delete)
```

### RBAC keys used
`products` read/write, `spare_parts` read/write, `customer_machines` read/write.

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| products | `productCode` unique | code lookup |
| products | `productName`, `productType`, `category`, `status`, `isDeleted` | filters |
| products | text on `productCode,productName,manufacturer,modelNumber` | future $text |
| spareparts | `partCode` unique | code lookup |
| spareparts | `partName`, `compatibleMachine`, `category`, `status`, `isDeleted` | filters |
| spareparts | text on `partCode,partName,manufacturer,compatibleMachine` | future $text |
| customermachines | `customerId`, `productId`, `machineStatus`, `status`, `isDeleted`, `nextServiceDueDate` | per-customer + service-due |
| customermachines | `serialNumber` partial-unique (when non-empty) | serial dedup |

### Excel import skeleton

#### Endpoint
```
POST /products/import-excel          form field: file (.xlsx, ≤ 10 MB)
POST /spare-parts/import-excel       form field: file (.xlsx, ≤ 10 MB)
```

#### Response
```json
{
  "success": true,
  "message": "Import completed",
  "data": {
    "total": 12,
    "created": 10,
    "skipped": 2,
    "errors": [
      { "row": 4, "errors": [{ "path": "productType", "message": "Invalid enum value..." }] },
      { "row": 9, "errors": [{ "path": "price", "message": "Expected number, received nan" }] }
    ]
  }
}
```

#### Expected Excel formats

Header row is **row 1**, exact column names (case-sensitive). Extra columns ignored, empty rows skipped.

**Products** — `products.xlsx`

| productName | productType | category | manufacturer | modelNumber | description | price | gstPercentage | hsnCode | warrantyMonths |
|---|---|---|---|---|---|---|---|---|---|
| Dialysis Machine DM-500 | Dialysis Machine | Standard | GK Medical | DM-500 | Standard model | 450000 | 12 | 9018 | 24 |
| Blood Tubing Set | Accessory | Consumable | Acme | BTS-01 | Single use | 250 | 5 | 9018 | 0 |

**Spare parts** — `spare-parts.xlsx`

| partName | compatibleMachine | category | manufacturer | rate | gstPercentage | stockQuantity | description |
|---|---|---|---|---|---|---|---|
| Dialyzer F8 | DM-500 | Consumable | Fresenius | 1500 | 12 | 100 | High-flux dialyzer |
| Membrane Filter | DM-500 | Consumable | Acme | 850 | 12 | 50 | Replacement filter |

Rules:
- `productType` must be one of the enum values.
- Numeric columns parsed via `z.coerce.number()` — spreadsheet number cells work directly.
- `productCode` / `partCode` are generated server-side — do **not** include them in the import.
- Rows that fail Zod validation are skipped and counted in `skipped`; details land in `errors`.
- Same parser will accept .xls (legacy) and tolerates `application/octet-stream` mimetype that some browsers send.

---

## Sprint 4 — Leads & Follow-ups (+ Convert to Customer)

### Goal
Sales lead capture, status pipeline, follow-up trail, and one-shot conversion of a lead into a customer record.

### Modules added
```
src/constants/leadEnums.js                LEAD_STATUSES, LEAD_TYPES, LEAD_TERMINAL_STATUSES,
                                          FOLLOWUP_OUTCOMES, FOLLOWUP_CHANNELS
src/modules/leads/lead.model.js
src/modules/leads/leadFollowUp.model.js
src/modules/leads/lead.validation.js
src/modules/leads/lead.service.js
src/modules/leads/lead.controller.js
src/modules/leads/lead.routes.js
```

### Enums
- `LEAD_STATUSES`: `New | Contacted | Qualified | Proposal Sent | Negotiation | Won | Lost | Converted | Dropped`
- `LEAD_TYPES`: `Hot | Warm | Cold`
- `LEAD_TERMINAL_STATUSES`: `Converted | Won | Lost | Dropped` (block follow-up additions)
- `FOLLOWUP_OUTCOMES`: `Interested | Not Interested | Call Back | No Response | Wrong Number | Other`
- `FOLLOWUP_CHANNELS`: `Call | Visit | Email | WhatsApp | SMS | Other`

### Models
**Lead**: `leadName, hospitalName, contactPersonName, phone (required, PHONE_IN), alternatePhone, email, source, leadType, leadValue, requirementType, interestedProduct, city, state, address, followUpDate, assignedTo, status (default New), remarks, convertedCustomerId, convertedAt, convertedBy, soft-delete fields, audit`.

Per the spec, `city` and `state` on Lead are plain **strings**, not refs to State/City masters. They are used as-is and only get resolved to `stateId/cityId` at convert-to-customer time when the caller supplies them.

**LeadFollowUp**: `leadId, followUpDate (required), channel, contactedPerson, notes, outcome, nextFollowUpDate, performedBy, audit`. Compound index `(leadId, followUpDate desc)`.

### Status pipeline rules
- New leads default to `status: "New"`.
- Manual status updates allowed to any value **except** `Converted` — that is reserved for the convert flow.
- Once `Converted`, the lead is immutable (no further PUT, no further status change, no follow-ups).
- Other terminal states (`Won/Lost/Dropped`) block new follow-ups but stay editable in case the user mis-set the status.

### Convert-to-customer
- Atomic where supported: starts a Mongo session and runs the customer insert + lead update inside one transaction. Falls back to two ordered writes on standalone Mongo (no replica set).
- Body supplies what Lead doesn't carry — `customerType` (required), plus optional `stateId`, `cityId`, `gstin`, `pincode`, `assignedTo`, and override fields (`customerName`, `hospitalName`, `phone`, `email`, `address`) if you want to correct data before persisting the customer.
- Lead → Customer mapping with override precedence:
  | Customer field | Source |
  |---|---|
  | `customerName` | `body.customerName` ‖ `lead.contactPersonName` ‖ `lead.leadName` |
  | `hospitalName` | `body.hospitalName` ‖ `lead.hospitalName` ‖ `lead.leadName` |
  | `phone` | `body.phone` ‖ `lead.phone` |
  | `email` | `body.email` ‖ `lead.email` |
  | `address` | `body.address` ‖ `lead.address` |
  | `stateId/Name`, `cityId/Name` | resolved from `body.stateId`/`body.cityId` (city↔state validated) |
  | `pincode`, `gstin` | from body |
  | `customerType` | from body (required) |
  | `assignedTo` | `body.assignedTo` ‖ `lead.assignedTo` |
- After successful customer creation: lead `status = "Converted"`, `convertedCustomerId`, `convertedAt`, `convertedBy` set.
- Idempotency: a second call returns `409 Conflict — Lead is already converted`.

### Audit log hook
Audit utility is a **Sprint 10 deliverable**, so service.js exposes a no-op `audit()` function and calls it at every state-changing point:
`LEAD_CREATED`, `LEAD_UPDATED`, `LEAD_STATUS_CHANGED`, `LEAD_DELETED`, `FOLLOWUP_ADDED`, `LEAD_CONVERTED`. Sprint 10 replaces the no-op with a real recorder — call sites are already in place.

### APIs
```
POST   /leads
GET    /leads?page&limit&search&status&leadType&assignedTo&source
              &dateField=createdAt|followUpDate&fromDate&toDate
GET    /leads/:id
PUT    /leads/:id                          (blocked when Converted)
PATCH  /leads/:id/status                   { status, remarks? }   (status ≠ Converted)
DELETE /leads/:id                          (soft delete)

POST   /leads/:id/followups                { followUpDate, channel?, contactedPerson?,
                                              notes?, outcome?, nextFollowUpDate? }
GET    /leads/:id/followups

POST   /leads/:id/convert-to-customer      { customerType, stateId?, cityId?, gstin?,
                                              pincode?, assignedTo?, customerName?,
                                              hospitalName?, phone?, email?, address? }
```

### RBAC keys used
- All lead routes: `leads` read/write.
- `POST /leads/:id/convert-to-customer` additionally requires `customers` write (chained `checkPermission` calls). Super Admin bypasses both.

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| leads | `assignedTo`, `status`, `leadType`, `hospitalName`, `isDeleted`, `convertedCustomerId` | list filters / lookups |
| leads | text on `leadName, hospitalName, contactPersonName, phone, email` | future $text search |
| leadfollowups | `(leadId, followUpDate desc)` | per-lead chronological list |

### Validation schema (Zod, lead.validation.js)

```js
// lead create
{
  leadName: string(2..200),                         // required
  hospitalName?: string(<=200),
  contactPersonName?: string(<=150),
  phone: PHONE_IN,                                   // required, /^[6-9]\d{9}$/
  alternatePhone?: PHONE_IN | '',
  email?: emailString | '',
  source?: string(<=100),
  leadType?: 'Hot'|'Warm'|'Cold',
  leadValue?: number >= 0,
  requirementType?: string(<=150),
  interestedProduct?: string(<=200),
  city?: string(<=100),
  state?: string(<=100),
  address?: string(<=500),
  followUpDate?: ISO date,
  assignedTo?: objectId,
  status?: LEAD_STATUSES,
  remarks?: string(<=2000)
}

// lead update          partial of create
// updateStatus         { status: LEAD_STATUSES, remarks?: string }
// listQuery            { page, limit, search?, status?, leadType?, assignedTo?,
//                        source?, dateField? in ['createdAt','followUpDate'],
//                        fromDate?, toDate? }
// createFollowUp       { followUpDate (required), channel?, contactedPerson?,
//                        notes?, outcome?, nextFollowUpDate? }
// convertToCustomer    { customerType (required, CUSTOMER_TYPES),
//                        stateId?, cityId?, pincode?, gstin?, assignedTo?,
//                        customerName?, hospitalName?, phone?, email?, address? }
```

### API examples

#### Create lead
```http
POST /leads
{
  "leadName": "Dialysis Machine Inquiry",
  "hospitalName": "City Dialysis Center",
  "contactPersonName": "Mr. Kumar",
  "phone": "9876543210",
  "alternatePhone": "9876543211",
  "email": "lead@example.com",
  "source": "Referral",
  "leadType": "Hot",
  "leadValue": 500000,
  "requirementType": "Dialysis Machine",
  "interestedProduct": "Dialysis Machine DM-500",
  "city": "Bengaluru",
  "state": "Karnataka",
  "address": "Main Road",
  "followUpDate": "2026-05-15",
  "assignedTo": "<userId>",
  "remarks": "Interested in 2 machines"
}
```

#### List with date filter
```http
GET /leads?status=New&leadType=Hot&assignedTo=<userId>
        &dateField=followUpDate&fromDate=2026-05-01&toDate=2026-05-31&page=1&limit=20
```

#### Status update
```http
PATCH /leads/:id/status
{ "status": "Qualified", "remarks": "Decision-maker confirmed budget." }
```
Trying to set `Converted` here is rejected:
```json
{ "success": false, "message": "Use POST /leads/:id/convert-to-customer to convert a lead", "errors": [] }
```

#### Add follow-up
```http
POST /leads/:id/followups
{
  "followUpDate": "2026-05-15T10:30:00Z",
  "channel": "Call",
  "contactedPerson": "Mr. Kumar",
  "notes": "Asked for quotation; sending DM-500 + warranty terms.",
  "outcome": "Interested",
  "nextFollowUpDate": "2026-05-22"
}
```
`nextFollowUpDate` is mirrored onto the parent `lead.followUpDate` for easy list display.

#### List follow-ups
```http
GET /leads/:id/followups
```
Returns most-recent-first, populated with `performedBy: { name, mobileNumber }`.

#### Convert to customer
```http
POST /leads/:id/convert-to-customer
{
  "customerType": "Dialysis Center",
  "stateId": "<stateId>",
  "cityId":  "<cityId>",
  "pincode": "560010",
  "gstin": "29ABCDE1234F1Z5"
}
```
Response (201):
```json
{
  "success": true,
  "message": "Lead converted to customer",
  "data": {
    "lead": { "_id": "...", "status": "Converted", "convertedCustomerId": "...", "convertedAt": "..." },
    "customer": {
      "_id": "...", "customerCode": "CUST-00007",
      "customerName": "Mr. Kumar", "hospitalName": "City Dialysis Center",
      "phone": "9876543210", "email": "lead@example.com",
      "stateId": "...", "stateName": "Karnataka",
      "cityId":  "...", "cityName":  "Bengaluru",
      "pincode": "560010", "customerType": "Dialysis Center",
      "status": "Active", ...
    }
  }
}
```

### Behaviour notes
- The convert flow uses `nextCode('customer', 'CUST', 5)` for the new customer code, so it shares the same monotonic sequence as direct customer creation.
- If the deployment is a standalone Mongo (no replica set), `session.startTransaction()` throws; the service catches that and falls back to ordered non-transactional writes. In an Atlas / replica-set deployment, the two writes are atomic.

---

## Sprint 5 — Task Management

### Goal
Assignable tasks for sales/technicians with status flow, my-tasks listing, and persisted notification records on assignment.

### Modules added
```
src/constants/taskEnums.js               TASK_TYPES, TASK_PRIORITIES, TASK_STATUSES, TASK_TERMINAL_STATUSES
src/modules/notifications/notification.model.js     (minimal — full module in Sprint 10)
src/services/notificationService.js                  create(), taskAssigned(), taskStatusChanged()
src/modules/tasks/task.model.js
src/modules/tasks/task.validation.js
src/modules/tasks/task.service.js
src/modules/tasks/task.controller.js
src/modules/tasks/task.routes.js
```

### Enums
- `TASK_TYPES`: `Installation | Service | Preventive Maintenance | Inspection | Incident | Follow-up | Sales | Other`
- `TASK_PRIORITIES`: `Low | Medium | High | Urgent` (default `Medium`)
- `TASK_STATUSES`: `Open | Assigned | In Progress | Completed | Closed | Cancelled`
- `TASK_TERMINAL_STATUSES`: `Completed | Closed | Cancelled` (used for overdue filter and future report-locking)

### Task number generation
Reuses the shared atomic counter:
```js
const taskNumber = await nextCode('task', 'TASK', 5);  // TASK-00001, TASK-00002, ...
```
Counter key `task` is registered in the `counters` collection on first call. Monotonic across all task creations regardless of concurrency.

### Model — Task
`taskNumber (unique, auto), taskTitle, taskType (enum), customerId, leadId, customerMachineId, assignedTo, assignedBy, priority (enum), dueDate, taskStatus (enum, default Open), description, remarks, completionDate, relatedReportId (loose ObjectId, no ref — Sprint 7 reports add this), soft-delete fields, audit`.

### Auto-behaviour rules
- **Create with assignee** → `taskStatus` defaults to `Assigned` (not `Open`) and `assignedBy` is set to `req.user._id`.
- **Reassign via PUT** → service detects assignee change, updates `assignedBy`, bumps `Open` → `Assigned`, and triggers a new `TASK_ASSIGNED` notification.
- **Status to Completed/Closed/Cancelled** → `completionDate` auto-set to now if the caller didn't supply one.
- **Status change** → if there's an assignee other than the actor, send a `TASK_STATUS_CHANGED` notification.

### Notifications (persisted, Sprint 10 adds delivery)
Each event writes a `Notification` document via `notificationService`:
| Trigger | Type | Recipient | Title |
|---|---|---|---|
| Task created with assignee | `TASK_ASSIGNED` | assignee | `New task assigned: <taskTitle>` |
| Task reassigned | `TASK_ASSIGNED` | new assignee | same |
| Task status changed | `TASK_STATUS_CHANGED` | assignee | `Task TASK-NNNNN → <status>` |

Notification writes are best-effort — failures are logged and do not roll back the originating task action.

`Notification` shape: `userId, type, title, message, entityType ("Task"), entityId, data {taskNumber, priority, dueDate, oldStatus, newStatus, ...}, isRead, readAt, triggeredBy, timestamps`. Compound index `(userId, isRead, createdAt desc)`. Sprint 10 layers mark-read APIs and FCM push on top of this same schema.

### APIs
```
POST   /tasks                              create (assignee triggers notification)
GET    /tasks?page&limit&search&taskStatus&taskType&priority
              &assignedTo&assignedBy&customerId&leadId&customerMachineId
              &dueFrom&dueTo&overdue=true
GET    /tasks/my-tasks?<same filters, but assignedTo is forced to caller>
GET    /tasks/:id
PUT    /tasks/:id                          reassignment auto-bumps status & notifies
PATCH  /tasks/:id/status                   { taskStatus, remarks?, completionDate? }
```

`my-tasks` is registered **before** `/:id` in `task.routes.js` so Express doesn't try to treat `"my-tasks"` as an id. It requires only `tasks` **read** permission — the service hard-codes `assignedTo = req.user._id` so users can never see anyone else's tasks via this route.

### RBAC keys used
- All task routes: `tasks` read/write.
- `my-tasks`: `tasks` read only. Super Admin bypasses.

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| tasks | `taskNumber` unique | code lookup |
| tasks | `taskType`, `taskStatus`, `priority`, `dueDate`, `assignedTo`, `customerId`, `leadId`, `customerMachineId`, `isDeleted` | list filters / my-tasks |
| tasks | text on `taskNumber, taskTitle, description` | future $text search |
| notifications | `userId`, `type`, `isRead`, `(userId, isRead, createdAt desc)` | unread queue per user |

### Validation schema (Zod summary)
```js
// create
{
  taskTitle: string(2..200),         // required
  taskType: TASK_TYPES,              // required
  customerId?: objectId,
  leadId?: objectId,
  customerMachineId?: objectId,
  assignedTo?: objectId,
  priority?: TASK_PRIORITIES,
  dueDate?: date,
  taskStatus?: TASK_STATUSES,        // server defaults Open or Assigned
  description?: string(<=2000),
  remarks?: string(<=2000),
  relatedReportId?: objectId
}

// update          partial of create
// updateStatus    { taskStatus (required), remarks?, completionDate? }
// listQuery       { page, limit, search?, taskStatus?, taskType?, priority?,
//                   assignedTo?, assignedBy?, customerId?, leadId?,
//                   customerMachineId?, dueFrom?, dueTo?, overdue? }
// myTasksQuery    listQuery without assignedTo / assignedBy
```

### API examples

#### Create task with assignment (one shot)
```http
POST /tasks
{
  "taskTitle": "Install dialysis machine",
  "taskType": "Installation",
  "customerId": "<customerId>",
  "customerMachineId": "<machineId>",
  "assignedTo": "<technicianUserId>",
  "priority": "High",
  "dueDate": "2026-05-20",
  "description": "Install machine at hospital"
}
```
Response (201):
```json
{
  "success": true,
  "message": "Task created",
  "data": {
    "_id": "...", "taskNumber": "TASK-00001",
    "taskTitle": "Install dialysis machine", "taskType": "Installation",
    "taskStatus": "Assigned", "priority": "High",
    "assignedTo": "...", "assignedBy": "...",
    "dueDate": "2026-05-20T00:00:00.000Z",
    "customerId": "...", "customerMachineId": "...",
    "createdAt": "...", "updatedAt": "..."
  }
}
```
A `Notification` doc with `type: "TASK_ASSIGNED"` is written for the assignee.

#### List with filters
```http
GET /tasks?page=1&limit=20&taskStatus=Assigned&priority=High&assignedTo=<userId>
        &dueFrom=2026-05-01&dueTo=2026-05-31
```

#### Overdue tasks
```http
GET /tasks?overdue=true
```
Returns tasks where `dueDate < now` AND `taskStatus` is not terminal (`Completed/Closed/Cancelled`).

#### My tasks
```http
GET /tasks/my-tasks?taskStatus=In%20Progress
```
The service forces `assignedTo = req.user._id`. A caller cannot widen this via `?assignedTo=...`.

#### Reassign (writes a new TASK_ASSIGNED notification)
```http
PUT /tasks/:id
{ "assignedTo": "<newUserId>" }
```

#### Update status
```http
PATCH /tasks/:id/status
{ "taskStatus": "Completed", "remarks": "Installed and signed off by hospital." }
```
`completionDate` is auto-set to now since none was supplied. A `TASK_STATUS_CHANGED` notification is written for the assignee if they're not the actor.

### Audit log hooks
Service calls a no-op `audit(...)` at every state-changing point. Sprint 10 replaces the no-op with the real recorder.
Events emitted: `TASK_CREATED`, `TASK_UPDATED`, `TASK_STATUS_CHANGED`.

---

## Sprint 6 — Uploads, S3, PDF Foundation

### Goal
Generic file upload to S3-compatible storage, Puppeteer/Handlebars-based PDF generation, and a report-number utility — all the infrastructure later report sprints depend on.

### Modules added
```
src/config/env.js                 UPDATED  s3 block (S3_* env vars), forcePathStyle, publicBaseUrl
src/middlewares/upload.js         UPDATED  + genericUpload, UPLOAD_MODULE_MIMES, assertAllowedForModule
src/services/s3Service.js         NEW      putObject/deleteObject/buildPublicUrl/buildKey/isConfigured
src/services/pdfService.js        NEW      renderHtml/htmlToPdf/renderToPdf + Handlebars helpers
src/utils/reportNumber.js         NEW      nextReportNumber (monthly), nextFlatNumber, REPORT_PREFIXES
src/modules/uploads/{upload.routes,upload.controller,upload.service,upload.validation}.js
src/modules/pdf/{pdf.routes,pdf.controller,pdf.validation}.js
src/templates/sample.hbs          NEW      sample template used by /pdf/test
package.json                      UPDATED  + @aws-sdk/client-s3, handlebars
.env.example                      UPDATED  S3_* + optional PUPPETEER_EXECUTABLE_PATH
```

### S3 / object-storage env vars
```env
S3_REGION=ap-south-1
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=                 # optional — for Cloudflare R2 / DO Spaces / MinIO
S3_PUBLIC_BASE_URL=          # optional — CDN base; falls back to bucket URL
S3_FORCE_PATH_STYLE=false    # true for MinIO / some on-prem S3
```

If `S3_BUCKET` + credentials are unset, `s3Service.isConfigured()` returns `false` and any call to `putObject` throws `ApiError.internal`. The `/pdf/test` endpoint detects this and falls back to streaming the PDF.

### Upload module

#### Allowed mime per module (`UPLOAD_MODULE_MIMES`)
| module | Accepts | Max size |
|---|---|---|
| `signatures` | jpeg/png/webp | 5 MB |
| `photos` | jpeg/png/webp | 5 MB |
| `profiles` | jpeg/png/webp | 5 MB |
| `products` | jpeg/png/webp | 5 MB |
| `bills` | jpeg/png/webp + pdf | image 5 / pdf 15 MB |
| `reports` | application/pdf | 15 MB |
| `imports` | xlsx / xls / octet-stream | 10 MB |

Module is validated by Zod (enum of `UPLOAD_MODULE_MIMES` keys). Per-module mime/size is enforced by `assertAllowedForModule(file, moduleKey)` in the controller after multer lands the file in memory.

#### Endpoint
```
POST /api/v1/uploads/single
Authorization: Bearer <token>
Content-Type: multipart/form-data
  file:    <binary>            (required)
  module:  signatures|photos|profiles|bills|reports|imports|products
```

#### Response
```json
{
  "success": true,
  "message": "File uploaded",
  "data": {
    "key": "signatures/2026/05/9f1c2…-customer-sign.png",
    "fileUrl": "https://cdn.example.com/signatures/2026/05/9f1c2…-customer-sign.png",
    "mimeType": "image/png",
    "size": 73214,
    "originalName": "customer-sign.png"
  },
  "meta": {}
}
```

#### S3 key layout
`<module>/<YYYY>/<MM>/<uuid>-<sanitized-original-name>`. Year + month bucketing keeps the key namespace browsable; uuid guarantees uniqueness; original name is sanitized (`[^a-zA-Z0-9._-]` → `-`, capped at 120 chars).

#### Public URL resolution
1. If `S3_PUBLIC_BASE_URL` is set → `${publicBase}/${key}`.
2. Else if `S3_ENDPOINT` is set → path-style or virtual-hosted depending on `S3_FORCE_PATH_STYLE`.
3. Else default `https://${bucket}.s3.${region}.amazonaws.com/${key}`.

### PDF service

#### Architecture
- **Handlebars** compiles `.hbs` templates from `src/templates/`. Compiled templates are cached in memory after first load.
- **Puppeteer** boots a single headless Chromium per process (`getBrowser()` lazy singleton). Each PDF render gets a fresh `page`, then closes it. `closeBrowser()` is registered on `beforeExit`.
- Pass `PUPPETEER_EXECUTABLE_PATH` env if Chromium is installed at a non-default location (e.g. inside a minimal Docker image).

#### API
```js
const pdf = require('../services/pdfService');

// Compile + render to HTML
const html = await pdf.renderHtml('quotation', { customer, items, totals });

// HTML → PDF buffer
const buffer = await pdf.htmlToPdf(html, { format: 'A4' });

// One-shot
const buffer = await pdf.renderToPdf('quotation', data);
```

Default PDF options: `format: 'A4'`, `printBackground: true`, margins `{ top:15mm, right:12mm, bottom:15mm, left:12mm }`.

#### Built-in Handlebars helpers
| Helper | Usage | Output |
|---|---|---|
| `formatDate` | `{{formatDate someDate}}` | `dd-MM-yyyy` |
| `formatDate "datetime"` | `{{formatDate at "datetime"}}` | locale `en-IN` datetime |
| `currency` | `{{currency 12345}}` | `₹12,345.00` (Intl `en-IN`, INR) |
| `eq` | `{{#if (eq status "Active")}}` | boolean |
| `inc` | `{{inc @index}}` | 1-based index |

### Sample template
`src/templates/sample.hbs` — A4 layout with header bar, customer block, items table, totals, remarks, footer. Used by `/pdf/test`. Drop more `.hbs` files in `src/templates/` and reference them by basename (e.g. `quotation.hbs` → template name `"quotation"`).

### `POST /api/v1/pdf/test` — sample PDF endpoint

- **Auth**: `authenticate` + `superAdminOnly` (test-only — keeps it out of regular use).
- **Body**:
```json
{
  "template": "sample",       // default "sample"
  "data": { ... },            // merged into a built-in default payload
  "upload": false,            // true → push to S3, return URL
  "filename": "my-test.pdf"   // optional filename for download / S3 key
}
```
- **Default behaviour** (`upload=false` or S3 not configured): streams the PDF back with `Content-Type: application/pdf` and `Content-Disposition: inline`.
- **With `upload=true` and S3 configured**: uploads under `reports/<YYYY>/<MM>/...pdf` and returns the standard upload envelope.

### Report-number utility (`src/utils/reportNumber.js`)
Two patterns are supported via the shared atomic counter:

#### Monthly-resetting per-kind sequence
```js
const { nextReportNumber } = require('./utils/reportNumber');
const num = await nextReportNumber('service');   // SVC-2605-00001
```
Counter key embeds year+month so each calendar month restarts at 1 per kind.

Prefixes (`REPORT_PREFIXES`):
| Kind | Prefix |
|---|---|
| `installation` | `INST` |
| `service` | `SVC` |
| `preventiveMaintenance` | `PM` |
| `inspection` | `INSP` |
| `incident` | `INC` |
| `quotation` | `QTN` |

#### Flat (non-resetting) sequence
```js
const { nextFlatNumber } = require('./utils/reportNumber');
const qno = await nextFlatNumber('quotation');   // QTN-00001, QTN-00002, ...
```
Use this when the sequence shouldn't reset (typical for legal-document numbering like invoices and quotations). Sprint 8 (quotations) will pick `nextFlatNumber('quotation')`.

### RBAC
- `/uploads/single`: `authenticate` only — uploads are cross-cutting infrastructure. The calling feature gates the upload through its own permission (e.g. expenses-write must succeed before its UI calls /uploads/single).
- `/pdf/test`: `authenticate` + `superAdminOnly`. Real per-report PDF endpoints in Sprint 7+ require the relevant report module's `read` permission.

### Cross-sprint impact
- Existing **Excel import endpoints** (`/products/import-excel`, `/spare-parts/import-excel`) still use `excelUpload` from the same middleware, unchanged.
- Future report sprints (Sprint 7+) will call `renderToPdf` → `s3.putObject(..., moduleKey: "reports")` and store `pdfUrl` on the report document.
- `nextCode` from `codeGenerator.js` remains the entry point for non-report sequences (customers, products, tasks, etc.). Report numbers should go through `reportNumber.js` so the monthly-roll-over convention stays consistent.

### Smoke test
```bash
# Upload a signature
curl -X POST http://localhost:5002/api/v1/uploads/single \
  -H "Authorization: Bearer $TOKEN" \
  -F "module=signatures" \
  -F "file=@/path/to/sign.png"

# Generate sample PDF (streams to file)
curl -X POST http://localhost:5002/api/v1/pdf/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --output sample.pdf

# Generate sample PDF and upload to S3
curl -X POST http://localhost:5002/api/v1/pdf/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"upload":true,"filename":"sample-test"}'
```

---

## Sprint 7 — Installation, Service, and Preventive Maintenance Reports

### Goal
Three technician-facing report types, each generating a PDF on creation, posting it to S3, and updating the related customer machine.

### Modules added
```
src/constants/reportEnums.js                                      REPORT_STATUSES, MACHINE_CONDITIONS, CHECKLIST_STATUSES, REPORT_KINDS, REPORT_KIND_TO_MODULE_KEY
src/modules/reports/shared/reportCommon.js                        commonReportFields, sparePartUsedSchema
src/modules/reports/shared/reportPipeline.js                      resolveContext, enrichSpareParts, generateAndAttachPdf, updateMachineFromReport
src/modules/reports/shared/report.{routes,controller,service,validation}.js   aggregate GET /reports + GET /reports/:id
src/modules/reports/installation/installationReport.{model,validation,service,controller,routes}.js
src/modules/reports/service/serviceReport.{model,validation,service,controller,routes}.js
src/modules/reports/preventiveMaintenance/pmReport.{model,validation,service,controller,routes}.js
src/templates/installation-report.hbs
src/templates/service-report.hbs
src/templates/pm-report.hbs
src/routes/index.js                                                UPDATED — mounts /reports/* in sub-path-first order
```

### Enums
- `REPORT_STATUSES`: `Draft | Submitted | Approved | Cancelled` (default `Draft`).
- `MACHINE_CONDITIONS` (PM): `Good | Average | Poor`.
- `CHECKLIST_STATUSES` (PM): `OK | Issue | NA`.
- `REPORT_KINDS`: `installation`, `service`, `preventive-maintenance`.
- `REPORT_KIND_TO_MODULE_KEY`: maps the URL/query `type` value → RBAC module key.

### Common report fields (every report carries these)
`reportNumber (unique, auto), reportDate (default now), customerId + hospitalName (denorm), customerMachineId + machineName + serialNumber (denorm), technicianId + technicianName (denorm; default = req.user), customerSignatureUrl, technicianSignatureUrl, pdfUrl, status (default Draft), soft-delete (isDeleted/deletedAt/deletedBy), audit (createdBy/updatedBy + timestamps)`.

Compound index `(customerId, customerMachineId, reportDate desc)` on each collection for the typical "history for this machine" lookup.

### Report-number format
Generated via `nextReportNumber(kind)` from Sprint 6, so all three follow the monthly-resetting pattern:
- Installation → `INST-<YYMM>-<NNNNN>`
- Service → `SVC-<YYMM>-<NNNNN>`
- Preventive Maintenance → `PM-<YYMM>-<NNNNN>`

Counter key per kind is `report:<kind>:<YYMM>`. Sequence resets at the start of each calendar month per kind.

### Per-report extras

**Installation** — `installationDate (required), warrantyStartDate, warrantyEndDate, amcStartDate, amcEndDate, machineStatus (MACHINE_STATUSES, default 'Installed'), engineerRemarks`.

**Service** — `serviceType (MACHINE_SERVICE_TYPES), complaintReported, diagnosis, workDone, sparePartsUsed [{sparePartId?, partCode, partName, quantity, rate}], machineStatusAfterService (MACHINE_STATUSES), nextServiceDate, customerRemarks, technicianRemarks`.

**Preventive Maintenance** — `checklistItems [{item, status: OK|Issue|NA, notes}], machineCondition (Good|Average|Poor), sparePartsUsed (same shape as service), nextMaintenanceDate, remarks`.

### Side-effects on `CustomerMachine` after creation
| Report kind | Updates applied to the linked machine |
|---|---|
| Installation | `installationDate`, `warrantyStart/EndDate`, `amcStart/EndDate`, `machineStatus` (default `Installed`) |
| Service | `lastServiceDate = reportDate`, `nextServiceDueDate = nextServiceDate`, `machineStatus = machineStatusAfterService` |
| Preventive Maintenance | `lastServiceDate = reportDate`, `nextServiceDueDate = nextMaintenanceDate` |

Implemented in `reportPipeline.updateMachineFromReport(machineId, updates, actorId)` — each report service calls it after persistence and PDF generation.

### Spare-parts enrichment (service + PM)
Callers can pass either a master ref or full data:
```json
{ "sparePartId": "<id>", "quantity": 2 }                                                       // server fills code/name/rate from SparePart
{ "partCode": "SPR-00001", "partName": "Dialyzer F8", "quantity": 2, "rate": 1500 }            // explicit data
```
`reportPipeline.enrichSpareParts(lines)` looks up the SparePart docs in one batch query and fills missing `partCode/partName/rate`.

### PDF generation pipeline
On `create`, the per-kind service:
1. `resolveContext` — loads customer + machine + technician, validates they exist and the machine belongs to the customer, returns denormalized `{ hospitalName, machineName, serialNumber, technicianName }`.
2. (Service/PM only) `enrichSpareParts` — fills missing master fields.
3. `nextReportNumber(kind)` — atomic monthly sequence.
4. `Report.create(...)` — persists Draft report with all common + kind-specific fields.
5. `generateAndAttachPdf({ report, template, context })` — best-effort: renders the kind's `.hbs` template, runs `pdfService.renderToPdf`, pushes to S3 at `reports/<YYYY>/<MM>/<reportNumber>.pdf`, sets `report.pdfUrl`, saves. **Failures (S3 not configured, Puppeteer error, etc.) are logged but do not roll back the report — the document persists with empty `pdfUrl`.**
6. `updateMachineFromReport` — applies machine side-effects.

### Handlebars templates
- `installation-report.hbs` — header, customer block, machine block, installation/warranty/AMC table, engineer remarks, dual signature panel, footer.
- `service-report.hbs` — header, combined customer+machine, complaint / diagnosis / work-done narrative blocks, spare-parts table, next service due, customer & technician remarks, signature panel.
- `pm-report.hbs` — header, customer+machine+condition, checklist table with colour-coded status badges (OK/Issue/NA), spare-parts table, remarks, signature panel.

Each template renders dual signature boxes that show the uploaded signature image when `customerSignatureUrl` / `technicianSignatureUrl` are present. Signature URLs come from `POST /uploads/single` with `module=signatures` (Sprint 6).

### APIs

#### Create endpoints
```
POST /api/v1/reports/installation
POST /api/v1/reports/service
POST /api/v1/reports/preventive-maintenance
```

Each requires write on its own RBAC module (`installation_reports` / `service_reports` / `preventive_maintenance_reports`). Super Admin bypasses.

#### Aggregate read endpoints
```
GET /api/v1/reports?type=installation|service|preventive-maintenance
                  [&page&limit&search&status&customerId&customerMachineId
                   &technicianId&fromDate&toDate]
GET /api/v1/reports/:id
```

- `type` is **required** on the list endpoint. RBAC is enforced dynamically via `checkReadForReportType` — requires read on the module that matches `type`.
- `GET /reports/:id` doesn't know the kind up front, so it tries all three collections in turn and then enforces the matching module's read permission inside the controller. Returns the report with an extra `type` field tagging the kind.

### RBAC keys used
- `installation_reports` read/write
- `service_reports` read/write
- `preventive_maintenance_reports` read/write

### API examples

#### Create installation report
```http
POST /reports/installation
Authorization: Bearer <token>

{
  "customerId": "<customerId>",
  "customerMachineId": "<machineId>",
  "technicianId": "<techUserId>",                // optional — defaults to req.user
  "installationDate": "2026-05-11",
  "warrantyStartDate": "2026-05-11",
  "warrantyEndDate":   "2028-05-11",
  "amcStartDate": "2028-05-12",
  "amcEndDate":   "2029-05-12",
  "machineStatus": "Installed",
  "engineerRemarks": "Installed and tested at hospital.",
  "customerSignatureUrl": "https://cdn.example.com/signatures/2026/05/...png",
  "technicianSignatureUrl": "https://cdn.example.com/signatures/2026/05/...png"
}
```
Response (201): the persisted report including `reportNumber` (`INST-2605-00001`) and `pdfUrl` (set if S3 is configured).

#### Create service report
```http
POST /reports/service
{
  "customerId": "<customerId>",
  "customerMachineId": "<machineId>",
  "serviceType": "Warranty",
  "complaintReported": "Machine intermittently halts dialysis cycle.",
  "diagnosis": "Faulty pressure sensor.",
  "workDone": "Replaced sensor, recalibrated, run-tested 30 mins.",
  "sparePartsUsed": [
    { "sparePartId": "<sparePartId>", "quantity": 1 },
    { "partCode": "SPR-00007", "partName": "Pressure Tube", "quantity": 2, "rate": 250 }
  ],
  "machineStatusAfterService": "Active",
  "nextServiceDate": "2026-08-12",
  "customerRemarks": "Tested OK, satisfied.",
  "technicianRemarks": "Recommend full PM in next visit."
}
```

#### Create PM report
```http
POST /reports/preventive-maintenance
{
  "customerId": "<customerId>",
  "customerMachineId": "<machineId>",
  "checklistItems": [
    { "item": "Check water pressure", "status": "OK" },
    { "item": "Inspect blood pump",   "status": "OK" },
    { "item": "Conductivity reading", "status": "Issue", "notes": "Slightly high; recalibrated." },
    { "item": "Heater test",          "status": "OK" }
  ],
  "machineCondition": "Good",
  "sparePartsUsed": [{ "sparePartId": "<id>", "quantity": 1 }],
  "nextMaintenanceDate": "2026-08-11",
  "remarks": "Routine PM completed."
}
```

#### List + filter
```http
GET /reports?type=service&customerId=<id>&fromDate=2026-05-01&toDate=2026-05-31&page=1&limit=20
```
Response: paginated list of service reports with populated customer/machine/technician summaries; each item carries `type: "service"`.

#### Get by id
```http
GET /reports/<reportId>
```
Returns the document with `type` tag and full populated context. 404 if not found, 403 if the caller's role lacks read on that kind.

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| installationreports | `reportNumber` unique | code lookup |
| installationreports | `(customerId, customerMachineId, reportDate desc)` | history per machine |
| installationreports | `customerId`, `customerMachineId`, `technicianId`, `status`, `isDeleted` | filters |
| servicereports | same 3 indexes | history + filters |
| preventivemaintenancereports | same 3 indexes | history + filters |

### Behaviour notes
- **Backdating OK** — `reportDate` defaults to now if not supplied; callers can pass an earlier date for offline-collected reports.
- **Signature URLs** are not validated against S3 — callers must upload via `/uploads/single?module=signatures` first and pass the returned `fileUrl`.
- **Machine ↔ customer mismatch** is rejected at create time (`customerMachineId does not belong to this customer`).
- **PDF render failures** never break the create flow. If S3 isn't configured (`s3Service.isConfigured()` false), the warning is logged and `pdfUrl` stays empty. To regenerate later, a future sprint can add `POST /reports/:id/regenerate-pdf` that calls `generateAndAttachPdf` on the existing doc.
- **No update/delete endpoints yet** for reports per the spec — only `POST` create and `GET` read are exposed. A follow-up sprint can add `PUT`, `PATCH /:id/status` (Draft → Submitted → Approved), and soft-`DELETE` when the workflow is defined.

---

## Sprint 8 — Inspection, Incident Reports & Quotations

### Goal
Two more report types (inspection, incident) on the shared Sprint 7 pipeline, plus the quotation module with line-item calculation and PDF generation.

### Modules added
```
src/constants/reportEnums.js                                           UPDATED  +INSPECTION, +INCIDENT in REPORT_KINDS & REPORT_KIND_TO_MODULE_KEY
src/constants/quotationEnums.js                                        NEW      QUOTATION_STATUSES, QUOTATION_TERMINAL_STATUSES, QUOTATION_ITEM_TYPES
src/services/quotationCalc.js                                          NEW      calcQuotation, calcItem, round2 (pure maths)
src/modules/reports/shared/report.{service,validation}.js              UPDATED  MODEL_FOR_KIND + listQuery type enum extended
src/modules/reports/inspection/inspectionReport.{model,validation,service,controller,routes}.js
src/modules/reports/incident/incidentReport.{model,validation,service,controller,routes}.js
src/modules/quotations/quotation.{model,validation,service,controller,routes}.js
src/templates/inspection-report.hbs
src/templates/incident-report.hbs
src/templates/quotation.hbs
src/routes/index.js                                                    UPDATED  +/reports/inspection, +/reports/incident, +/quotations
```

### Inspection Report
Reuses `commonReportFields` from Sprint 7 + adds: `issueObserved, machineCondition (Good/Average/Poor), recommendation, requiredSpareParts [{sparePartId?, partCode, partName, quantity, rate}], technicianRemarks`.

- Report number: `INSP-<YYMM>-<NNNNN>` via `nextReportNumber('inspection')`.
- Spare-parts enrichment shares `enrichSpareParts` with service/PM reports.
- **No machine side-effects** — inspection captures condition without touching `lastServiceDate` etc. (Recommendations and required-parts can drive a follow-up service report in a later sprint.)
- PDF template: `inspection-report.hbs` — narrative blocks for issue/recommendation, required-parts table, signature panel.

### Incident Report
Reuses `commonReportFields` + adds: `incidentDate (required), issueDescription, rootCause, actionTaken, sparePartsUsed (same shape as service/PM), pendingAction, technicianRemarks`.

- Report number: `INC-<YYMM>-<NNNNN>` via `nextReportNumber('incident')`.
- **No automatic machine side-effects** — incidents may or may not change machine status; capture is in the narrative. Manual `PUT /customer-machines/:id` if status needs to flip.
- Compound index `(customerId, customerMachineId, reportDate desc)` + standalone `incidentDate desc` for incident-specific reporting.
- PDF template: `incident-report.hbs` — red header (visual cue), narrative blocks for description/root cause/action/pending, spares table, signature panel.

### Aggregate `/reports` updates
`REPORT_KINDS` now has `INSPECTION` and `INCIDENT`. `MODEL_FOR_KIND` in `report.service.js` registers the two new collections, and the listQuery `type` enum accepts them. `GET /reports?type=inspection|incident` and `GET /reports/:id` cross-collection lookups both now find the new kinds and enforce the matching module's read permission.

### Quotation module

#### Enums
- `QUOTATION_STATUSES`: `Draft | Sent | Accepted | Rejected | Converted` (default `Draft`).
- `QUOTATION_TERMINAL_STATUSES`: `Accepted | Rejected | Converted` — block edits to items / freight.
- `QUOTATION_ITEM_TYPES`: `Product | Spare Part | Service`.

#### Model — Quotation
`quotationNumber (unique, auto), quotationDate (default now), customerId, leadId, hospitalName (denorm), items[], freightCharges, subTotal, gstTotal, grandTotal, terms, status, pdfUrl, sentAt, acceptedAt, rejectedAt, convertedAt, soft-delete fields, audit`.

Embedded `quotationItemSchema`: `itemType, itemId (loose), name, quantity, rate, discount, gstPercentage, gstAmount, total`.

#### Quotation calculation (`src/services/quotationCalc.js`)

Pure function, no DB calls. Feed raw items + freight, get back enriched items + totals.

**Per-line maths**:
```js
lineSubTotal = max(0, (quantity * rate) - discount)
gstAmount    = lineSubTotal * (gstPercentage / 100)
total        = lineSubTotal + gstAmount
```

**Per-quotation maths**:
```js
subTotal   = Σ lineSubTotal
gstTotal   = Σ gstAmount
grandTotal = subTotal + gstTotal + freightCharges
```

All numbers are rounded to 2 decimals via a `round2()` helper to avoid float drift. Discounts are clamped at 0 (can't exceed the line value). GST percentage is clamped to `[0, 100]`. Freight is clamped to `>= 0`.

Reusable from anywhere:
```js
const { calcQuotation } = require('./services/quotationCalc');
const { items, subTotal, gstTotal, freightCharges, grandTotal } = calcQuotation({
  items: rawItems,
  freightCharges: 500,
});
```

The service recalculates on every create AND every `PUT /:id` that touches `items` or `freightCharges`, so stored totals are always consistent with the items they describe.

#### Quotation number
Flat sequence via `nextFlatNumber('quotation')` → `QTN-00001`, `QTN-00002`, … (does NOT reset monthly — invoices/quotations want a continuous sequence for legal/accounting reasons).

#### PDF generation
Renders `quotation.hbs` and uploads to S3 at `reports/<YYYY>/<MM>/<quotationNumber>.pdf`. Best-effort: failure logs a warning and leaves `pdfUrl` empty without rolling back the quotation. PDF is regenerated on every `PUT` so the file always reflects the latest item list.

Template highlights: company header, customer block, items table (9 columns incl. discount, gst%, gst amount, line total), totals box, terms section, status pill.

#### Status flow & edit rules
- Free-form on create / update for `status`, but the service stamps `sentAt`/`acceptedAt`/`rejectedAt`/`convertedAt` automatically on transitions.
- `PUT /:id` is blocked when the quotation is in any terminal status (`Accepted | Rejected | Converted`) — locks the document once it's gone past Draft/Sent.
- `Converted` is reserved as a marker for downstream order/invoice creation in a later sprint; setting it via `PATCH /:id/status` is allowed now but no order is created automatically.

#### APIs
```
POST   /api/v1/quotations
GET    /api/v1/quotations?page&limit&search&status&customerId&leadId&fromDate&toDate
GET    /api/v1/quotations/:id
PUT    /api/v1/quotations/:id          (blocked when terminal)
PATCH  /api/v1/quotations/:id/status   { status, remarks? }
```

#### RBAC keys
- Inspection: `inspection_reports` read/write
- Incident: `incident_reports` read/write
- Quotations: `quotations` read/write

### API examples

#### Inspection report
```http
POST /reports/inspection
Authorization: Bearer <token>

{
  "customerId": "<customerId>",
  "customerMachineId": "<machineId>",
  "issueObserved": "Slight vibration during dialysis cycle.",
  "machineCondition": "Average",
  "recommendation": "Replace blood pump bearings during next PM.",
  "requiredSpareParts": [
    { "sparePartId": "<id>", "quantity": 2 }
  ],
  "technicianRemarks": "No immediate risk, schedule PM in 2 weeks.",
  "customerSignatureUrl": "https://cdn.example.com/signatures/...",
  "technicianSignatureUrl": "https://cdn.example.com/signatures/..."
}
```

#### Incident report
```http
POST /reports/incident
{
  "customerId": "<customerId>",
  "customerMachineId": "<machineId>",
  "incidentDate": "2026-05-12T10:30:00Z",
  "issueDescription": "Machine shut down mid-dialysis with E-027 fault.",
  "rootCause": "Pressure sensor failure due to internal short.",
  "actionTaken": "Replaced sensor; reseated cabling; ran full diagnostic.",
  "sparePartsUsed": [
    { "sparePartId": "<id>", "quantity": 1 }
  ],
  "pendingAction": "Send replaced sensor to manufacturer for RCA.",
  "technicianRemarks": "Patient was safely disconnected. No injury."
}
```

#### Create quotation
```http
POST /quotations
{
  "customerId": "<customerId>",
  "leadId": "<leadId>",
  "items": [
    {
      "itemType": "Product",
      "itemId": "<productId>",
      "name": "Dialysis Machine DM-500",
      "quantity": 1,
      "rate": 450000,
      "discount": 10000,
      "gstPercentage": 12
    },
    {
      "itemType": "Spare Part",
      "name": "Dialyzer F8",
      "quantity": 10,
      "rate": 1500,
      "discount": 0,
      "gstPercentage": 12
    }
  ],
  "freightCharges": 2500,
  "terms": "Payment: 50% advance, balance against delivery.\nValidity: 30 days."
}
```

Response (201) includes auto-calculated:
```json
{
  "quotationNumber": "QTN-00001",
  "items": [
    { "itemType": "Product",    "name": "Dialysis Machine DM-500",
      "quantity": 1,  "rate": 450000, "discount": 10000, "gstPercentage": 12,
      "gstAmount": 52800, "total": 492800 },
    { "itemType": "Spare Part", "name": "Dialyzer F8",
      "quantity": 10, "rate": 1500,   "discount": 0,     "gstPercentage": 12,
      "gstAmount": 1800,  "total": 16800 }
  ],
  "subTotal": 455000,
  "gstTotal": 54600,
  "freightCharges": 2500,
  "grandTotal": 512100,
  "pdfUrl": "https://cdn.example.com/reports/2026/05/QTN-00001.pdf",
  "status": "Draft"
}
```

#### List + filter
```http
GET /quotations?status=Sent&customerId=<id>&fromDate=2026-05-01&toDate=2026-05-31&page=1&limit=20
```

#### Update (re-calculates + regenerates PDF)
```http
PUT /quotations/:id
{ "items": [...new items...], "freightCharges": 3000 }
```
Rejected with 400 if the quotation is in `Accepted | Rejected | Converted`.

#### Status change
```http
PATCH /quotations/:id/status
{ "status": "Sent" }          -> stamps sentAt = now
{ "status": "Accepted" }      -> stamps acceptedAt; locks edits
{ "status": "Converted" }     -> stamps convertedAt (no downstream order yet)
```

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| inspectionreports | `reportNumber` unique | code lookup |
| inspectionreports | `(customerId, customerMachineId, reportDate desc)` | history |
| inspectionreports | `customerId`, `customerMachineId`, `technicianId`, `status`, `isDeleted` | filters |
| incidentreports | same 3 + `incidentDate desc` | history + incident timeline |
| quotations | `quotationNumber` unique | code lookup |
| quotations | `(customerId, quotationDate desc)` | per-customer history |
| quotations | `customerId`, `leadId`, `status`, `isDeleted` | list filters |
| quotations | text on `quotationNumber, hospitalName` | future $text search |

### Behaviour notes
- **Quotation lead↔customer check** — if a `leadId` is supplied and that lead already converted to a *different* customer, the create is rejected with 400.
- **`Converted` quotation** today is just a status; a follow-up sprint can wire it to an order/invoice flow.
- **PDF on update** — a `PUT /:id` regenerates the PDF from the latest items so what you serve always matches what you stored. The old S3 object isn't deleted (each version lives under a unique key). Add a cleanup job if storage growth becomes a concern.
- **All-or-nothing items validation** — at least one item is required on create. An empty `items` array via `PUT` is rejected by Zod.
- **Discount precedence** — discount is applied to the line subtotal *before* GST, matching the standard quotation convention.

---

## Sprint 9 — Payments, Outstanding, Expenses

### Goal
Record customer payments and have them automatically update outstanding invoices + the customer's running total. Track employee expenses with attachments and a simple approve/reject workflow.

### Modules added
```
src/constants/financeEnums.js                                      PAYMENT_MODES, OUTSTANDING_STATUSES, EXPENSE_STATUSES
src/modules/outstandings/{outstanding.model,validation,service,controller,routes}.js
src/modules/payments/{payment.model,validation,service,controller,routes}.js
src/modules/expenseCategories/{expenseCategory.model,validation,service,controller,routes}.js
src/modules/expenses/{expense.model,validation,service,controller,routes}.js
src/routes/index.js                                                UPDATED  +/payments +/outstandings +/expense-categories +/expenses
```

### Enums
- `PAYMENT_MODES`: `Cash | Cheque | NEFT | RTGS | IMPS | UPI | Card | Other`.
- `OUTSTANDING_STATUSES`: `Open | Partially Paid | Paid | Overdue` (overdue is derived but persisted on each status recompute).
- `EXPENSE_STATUSES`: `Pending | Approved | Rejected` (default `Pending`).

### Outstanding update logic (the heart of this sprint)

Every Payment passes through `outstandingService.applyPaymentToOutstanding({ customerId, invoiceNumber, amount }, actorId, session)`:

1. Looks up the `Outstanding` doc for `(customerId, invoiceNumber)`. If none exists (standalone advance payment), the function no-ops and returns `null`.
2. Increments `paidAmount += amount` (rounded to 2 decimals).
3. Recomputes `balanceAmount = max(0, invoiceAmount - paidAmount)`.
4. Derives the new `status` via `deriveStatus(doc, asOf=now)`:
   - `balanceAmount <= 0` → `Paid`
   - `paidAmount > 0` and `dueDate` passed → `Overdue`
   - `paidAmount > 0` and not overdue → `Partially Paid`
   - `paidAmount === 0` and `dueDate` passed → `Overdue`
   - else → `Open`
5. Saves the outstanding, then calls `recomputeCustomerTotalOutstanding(customerId)` which runs a small aggregation:
   ```js
   Σ balanceAmount  where  customerId = X  AND  status != 'Paid'  AND  isDeleted = false
   ```
   and writes that number onto `Customer.totalOutstanding`.

The whole payment + outstanding update + customer total runs inside a Mongo session/transaction when the deployment supports it (replica set / Atlas). On standalone Mongo the session call fails gracefully and the three writes happen sequentially — payments succeed either way.

### Models

**Outstanding** — `customerId, hospitalName (denorm), invoiceNumber, invoiceDate, invoiceAmount, paidAmount, balanceAmount, dueDate, status, soft-delete, audit`. Compound unique index `(customerId, invoiceNumber)` so the same invoice can't be tracked twice for one customer.

**Payment** — `customerId, hospitalName (denorm), invoiceNumber (optional — empty = standalone advance), paymentDate, amount, paymentMode (enum), bankName, transactionId, paymentTerms, remarks, appliedToOutstandingId (snapshot of the outstanding that was updated, if any), soft-delete, audit`.

**ExpenseCategory** — `name (unique), description, status, audit`. Status reuses `ROLE_STATUS` enum (Active/Inactive).

**Expense** — `userId, categoryId, categoryName (denorm), amount, expenseDate, description, attachmentUrl, status (Pending/Approved/Rejected), approvedBy, approvalRemarks, approvedAt, soft-delete, audit`.

### APIs
```
# Payments
POST   /api/v1/payments
GET    /api/v1/payments?page&limit&search&paymentMode&customerId&fromDate&toDate
GET    /api/v1/payments/customer/:customerId

# Outstanding
POST   /api/v1/outstandings
GET    /api/v1/outstandings?page&limit&search&status&customerId&overdueOnly
GET    /api/v1/outstandings/customer/:customerId

# Expense Categories
POST   /api/v1/expense-categories
GET    /api/v1/expense-categories?status&search

# Expenses
POST   /api/v1/expenses
GET    /api/v1/expenses?page&limit&search&status&userId&categoryId&fromDate&toDate
GET    /api/v1/expenses/my-expenses          (userId forced to caller)
PATCH  /api/v1/expenses/:id/approve          { approvalRemarks? }
PATCH  /api/v1/expenses/:id/reject           { approvalRemarks }   (required)
```

`my-expenses` is registered **before** `/:id/...` so Express doesn't treat "my-expenses" as an id. It requires only `expenses` **read** permission and the service forces `userId = req.user._id` — users physically cannot widen the filter.

### RBAC keys used
- Payments: `payments` read/write.
- Outstandings: `outstandings` read/write.
- Expenses & Expense Categories: `expenses` read/write. (Categories live under the same module key — no separate `expense_categories` RBAC.)

Super Admin bypasses.

### Expense bill attachment flow
Expenses don't accept multipart directly — the typical flow is:
1. Client uploads the bill via `POST /uploads/single` with `module=bills` (image or PDF, ≤ 15 MB).
2. Client posts `POST /expenses` with the returned `fileUrl` as `attachmentUrl`.

`bills` already accepts image + pdf mimes from Sprint 6's `UPLOAD_MODULE_MIMES`.

### API examples

#### Create outstanding (typical: after invoicing a customer)
```http
POST /outstandings
{
  "customerId": "<customerId>",
  "invoiceNumber": "INV-2026-0042",
  "invoiceDate": "2026-05-01",
  "invoiceAmount": 512100,
  "dueDate": "2026-05-31"
}
```
Response (201): `{ paidAmount: 0, balanceAmount: 512100, status: "Open" }` + `customer.totalOutstanding` is bumped by 512100.

#### Record a payment against that invoice
```http
POST /payments
{
  "customerId": "<customerId>",
  "invoiceNumber": "INV-2026-0042",
  "paymentDate": "2026-05-12",
  "amount": 200000,
  "paymentMode": "NEFT",
  "bankName": "HDFC Bank",
  "transactionId": "HDFCN24001",
  "paymentTerms": "Partial payment",
  "remarks": "First instalment per quotation QTN-00001"
}
```
Effects:
- Payment doc created, `appliedToOutstandingId` populated.
- Outstanding INV-2026-0042 → `paidAmount: 200000, balanceAmount: 312100, status: "Partially Paid"`.
- `customer.totalOutstanding` recomputed (down by 200000 if no other open invoices).

A second payment of `312100` flips the outstanding to `Paid`, balance `0`, customer total drops accordingly.

#### Standalone advance payment (no invoice yet)
```http
POST /payments
{
  "customerId": "<customerId>",
  "paymentDate": "2026-05-01",
  "amount": 50000,
  "paymentMode": "UPI",
  "remarks": "Advance against future order"
}
```
No outstanding row is touched. The payment is recorded as a standalone entry. `customer.totalOutstanding` is still recomputed (idempotent) so any stale value gets corrected.

#### Overdue listing
```http
GET /outstandings?overdueOnly=true
```
Returns outstandings where `dueDate < now` AND `balanceAmount > 0` AND `status != Paid`.

#### Expense category
```http
POST /expense-categories
{ "name": "Travel", "description": "Local + outstation travel for service visits." }
```

#### Submit expense with bill
```http
# 1. Upload the bill
POST /uploads/single
   form-data: file=@hotel-bill.pdf, module=bills
   -> { fileUrl: "https://cdn.example.com/bills/2026/05/...pdf", ... }

# 2. Submit the expense
POST /expenses
{
  "categoryId": "<travelCategoryId>",
  "amount": 4200,
  "expenseDate": "2026-05-10",
  "description": "Bengaluru → Mysore round trip; one night hotel.",
  "attachmentUrl": "https://cdn.example.com/bills/2026/05/...pdf"
}
```

#### My pending expenses
```http
GET /expenses/my-expenses?status=Pending&fromDate=2026-05-01
```

#### Approve / reject
```http
PATCH /expenses/<id>/approve
{ "approvalRemarks": "OK, reimburse in next payroll cycle." }

PATCH /expenses/<id>/reject
{ "approvalRemarks": "Hotel category not pre-approved; submit under Travel-Standard." }
```
- Both flip to terminal status, stamp `approvedBy = req.user._id` and `approvedAt = now`.
- Reject requires `approvalRemarks` (Zod-enforced, min length 1). Approve's `approvalRemarks` is optional.
- Either is rejected with 400 if the expense isn't `Pending`.

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| outstandings | `(customerId, invoiceNumber)` unique | one row per invoice per customer |
| outstandings | `customerId`, `status`, `isDeleted`, `(dueDate, status)` | per-customer + overdue queries |
| payments | `customerId`, `invoiceNumber`, `(customerId, paymentDate desc)`, `isDeleted` | per-customer history + invoice lookup |
| expensecategories | `name` unique, `status` | category dropdown |
| expenses | `userId`, `categoryId`, `status`, `(userId, expenseDate desc)`, `(status, expenseDate desc)`, `isDeleted` | my-expenses + approval queue |

### Behaviour notes
- **Atomicity** — payment + outstanding update + customer total are wrapped in a Mongo transaction on replica-set/Atlas deployments. On standalone Mongo, the session is silently dropped and the three writes happen sequentially. Either way the customer total is correct because `recomputeCustomerTotalOutstanding` is an aggregation, not a delta.
- **Recompute is idempotent** — even for standalone payments (no matching invoice) we recompute `customer.totalOutstanding`. This corrects drift if outstanding rows were ever edited directly in the DB.
- **Overdue is derived AND persisted** — `deriveStatus` decides the value at write time. A nightly job (Sprint 10 candidate) can sweep open/partial outstandings past their dueDate and re-save them so the persisted status stays accurate without a payment trigger.
- **Edit lock on non-Pending expenses** — the service blocks edits when status is `Approved` or `Rejected`. (No `PUT` route is exposed in this sprint per the spec — re-add `PUT /expenses/:id` in a follow-up if the workflow needs corrections before approval.)
- **Rejected expense remarks** are required (so the user knows what to fix). Approved remarks are optional.
- **`customer.totalOutstanding`** is the single source of truth shown on the customer profile. Don't compute it client-side from the outstandings list — that drifts when paginated.

---

## Sprint 10 — Dashboard, Notifications, Audit Logs, Swagger, Hardening

### Goal
Closing sprint: org-wide dashboard counts, the user-facing notification module (read/save-fcm-token), real audit log recording across every state-changing action, Swagger UI, and the production security pass (rate-limit, mongo-sanitize, hpp, prod error message cleanup).

### Modules added
```
src/modules/auditLogs/auditLog.model.js                              NEW
src/services/auditService.js                                         NEW   audit() + auditLegacy() adapter
src/modules/notifications/notification.{validation,service,controller,routes}.js   (model existed since Sprint 5)
src/modules/dashboard/dashboard.{service,controller,routes}.js       NEW
src/config/swagger.js                                                NEW
src/middlewares/rateLimit.js                                         NEW
src/middlewares/errorHandler.js                                      UPDATED  prod-safe 5xx message
src/app.js                                                           UPDATED  +mongo-sanitize, +hpp, +Swagger mount
src/modules/auth/auth.routes.js                                      UPDATED  loginLimiter, passwordLimiter
src/routes/index.js                                                  UPDATED  +/notifications +/dashboard
package.json                                                         UPDATED  +express-mongo-sanitize, +express-rate-limit, +hpp
```

Plus: all 10 services that previously had `function audit() {}` stubs now import `{ auditLegacy: audit }` from `services/auditService.js`. Added new audit() call sites for `USER_CREATED/UPDATED/STATUS_CHANGED/PASSWORD_RESET`, `ROLE_CREATED/UPDATED/STATUS_CHANGED`, `CUSTOMER_CREATED/UPDATED/DELETED`.

### Audit Log

#### Model
`action (e.g. "TASK_STATUS_CHANGED"), module (e.g. "tasks"), recordId, performedBy, oldValue, newValue, ipAddress, userAgent, createdAt`. No `updatedAt` — audit rows are immutable. Indexes: `action`, `module`, `recordId`, `performedBy`, `createdAt desc`, `(module, createdAt desc)`.

#### Utility (`src/services/auditService.js`)
Two function shapes for flexibility:

```js
const { audit, auditLegacy } = require('./services/auditService');

// New, req-aware shape (preferred for new code — captures IP + UA)
audit(req, 'TASK_CREATED', task._id, { oldValue, newValue });

// Legacy 5-arg shape (matches old `audit()` stubs across services — used by Sprint 4-9 calls)
auditLegacy('TASK_CREATED', task._id, performedBy, oldValue, newValue);
```

Module is auto-inferred from the action prefix (`TASK_*` → `tasks`, `PM_*` → `preventive_maintenance_reports`, etc.). All writes are best-effort — failure logs an error and returns `null` without throwing, so audit never breaks the originating action.

#### Actions emitted (live in this sprint)
| Action | Source service |
|---|---|
| `USER_CREATED`, `USER_UPDATED`, `USER_STATUS_CHANGED`, `USER_PASSWORD_RESET` | users |
| `ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_STATUS_CHANGED` | roles |
| `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_DELETED` | customers |
| `LEAD_CREATED`, `LEAD_UPDATED`, `LEAD_STATUS_CHANGED`, `LEAD_DELETED`, `LEAD_CONVERTED`, `FOLLOWUP_ADDED` | leads |
| `TASK_CREATED`, `TASK_UPDATED`, `TASK_STATUS_CHANGED` | tasks |
| `INSTALLATION_REPORT_CREATED`, `SERVICE_REPORT_CREATED`, `PM_REPORT_CREATED`, `INSPECTION_REPORT_CREATED`, `INCIDENT_REPORT_CREATED` | reports/* |
| `QUOTATION_CREATED`, `QUOTATION_UPDATED`, `QUOTATION_STATUS_CHANGED` | quotations |
| `PAYMENT_ADDED` | payments |
| `EXPENSE_CREATED`, `EXPENSE_APPROVED`, `EXPENSE_REJECTED` | expenses |

To add new events: call `audit(...)` from the service after the state change. Adding read endpoints for the audit log itself (e.g. `GET /audit-logs`) is intentionally not in this sprint — admin UI can query MongoDB directly until it's needed.

### Notifications module

Reuses the `Notification` model created in Sprint 5. Adds the user-facing read/management APIs.

```
GET    /api/v1/notifications?page&limit&isRead&type
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all
POST   /api/v1/notifications/save-fcm-token   { token }
```

- All endpoints are scoped to `req.user._id` — no extra RBAC. A user can only see/mark their own notifications.
- `GET /notifications` response `meta` includes `unreadCount` so the client doesn't need a second call for the bell badge.
- `save-fcm-token` adds the token to `User.fcmTokens[]` via `$addToSet` so multiple devices per user are supported. FCM push delivery itself is a deployment-time task (Firebase Admin SDK + worker) — model and endpoint are in place.

#### Example
```http
GET /notifications?isRead=false&limit=10
Authorization: Bearer <token>

{
  "success": true,
  "message": "Notifications fetched",
  "data": [
    {
      "_id": "...", "userId": "...",
      "type": "TASK_ASSIGNED",
      "title": "New task assigned: Install dialysis machine",
      "message": "Install machine at hospital",
      "entityType": "Task", "entityId": "...",
      "data": { "taskNumber": "TASK-00001", "priority": "High", "dueDate": "2026-05-20T..." },
      "isRead": false,
      "triggeredBy": "...",
      "createdAt": "..."
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 7, "totalPages": 1, "unreadCount": 7 }
}
```

```http
PATCH /notifications/<id>/read           → marks one
PATCH /notifications/read-all            → bulk update, returns { updated: <count> }
POST  /notifications/save-fcm-token      { "token": "f4Ko9z3Q..." }
```

### Dashboard module

```
GET /api/v1/dashboard/summary       — org-wide (requires dashboard read)
GET /api/v1/dashboard/my-summary    — caller-scoped (any authenticated user)
```

`summary` runs ~11 counts and 3 sums in parallel and returns one object. Excludes soft-deleted rows everywhere.

#### Example — `/dashboard/summary`
```json
{
  "success": true,
  "message": "Dashboard summary",
  "data": {
    "totalCustomers": 142,
    "totalLeads": 87,
    "totalTasks": 240,
    "pendingTasks": 36,
    "completedTasks": 184,
    "totalReports": 312,
    "totalQuotations": 64,
    "totalPayments": 12450000,
    "totalOutstanding": 3120000,
    "totalExpenses": 184250,
    "reportBreakdown": {
      "installation": 41,
      "service": 168,
      "preventiveMaintenance": 72,
      "inspection": 19,
      "incident": 12
    }
  }
}
```

Rules:
- `totalPayments` is the SUM of all payment amounts (not the count).
- `totalOutstanding` is the SUM of `balanceAmount` across non-Paid outstandings (matches `customer.totalOutstanding` totals).
- `totalExpenses` is the SUM of `amount` across **Approved** expenses only (Pending/Rejected don't count).
- `pendingTasks` = `taskStatus ∈ {Open, Assigned, In Progress}`.
- `completedTasks` = `taskStatus ∈ {Completed, Closed}`. Cancelled is excluded.

#### Example — `/dashboard/my-summary`
```json
{
  "success": true,
  "message": "My dashboard summary",
  "data": {
    "tasks": { "assigned": 14, "pending": 5, "completed": 9 },
    "leads": 3,
    "reports": {
      "total": 27,
      "installation": 4, "service": 18, "preventiveMaintenance": 3,
      "inspection": 1, "incident": 1
    },
    "expenses": { "totalAmount": 18420, "pendingCount": 2 }
  }
}
```
- `tasks` is filtered by `assignedTo = req.user._id`.
- `leads` by `assignedTo`.
- `reports` by `technicianId`.
- `expenses` by `userId` (own submitted expenses, including approved/rejected).

### Swagger / OpenAPI

Mounted via `mountSwagger(app, '/api-docs')`:
- **UI**: http://localhost:5002/api-docs
- **Raw spec**: http://localhost:5002/api-docs.json

Setup in `src/config/swagger.js` uses `swagger-jsdoc` to scan `src/modules/**/*.routes.js` and `*.controller.js` for `@openapi` JSDoc annotations. The baseline spec ships with `bearerAuth` security scheme, `ApiSuccess` / `ApiError` / `Pagination` schemas, and all module tags. Add per-route docs incrementally by dropping JSDoc blocks above route handlers, e.g.

```js
/**
 * @openapi
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a task
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 */
router.post('/', ...);
```

The Swagger UI auto-refreshes as you add annotations.

### Production hardening

#### Security middleware (`src/app.js`)
- **Helmet** — security headers (was in since Sprint 0).
- **express-mongo-sanitize** — strips `$` and `.` keys from `req.body/query/params` to block NoSQL injection. NEW.
- **hpp** — collapses duplicate query params, defeating HTTP parameter pollution. NEW.
- **CORS** — list-or-`*` from env.
- **Rate limiting** (NEW, `src/middlewares/rateLimit.js`):
  - `loginLimiter`: 10 attempts per IP per 15 min, successful logins skipped — applied to `POST /auth/login`.
  - `passwordLimiter`: 5 per IP per hour — applied to `PATCH /auth/change-password`.

#### Error handler (`src/middlewares/errorHandler.js`)
In production, any non-operational 5xx is rewritten to `"Internal Server Error"` before being sent to the client. The original message + stack still go to Winston for ops. 4xx ApiError messages (operational) pass through unchanged.

#### Other prod toggles
- `app.set('trust proxy', 1)` — required for accurate `req.ip` behind Nginx/ALB (rate-limit relies on it).
- Stack traces only included in response bodies in non-prod.
- `passwordResetRequired` is set on admin reset so users are forced to change next login (Sprint 1 behaviour, validated here).

### Deployment notes (PM2 + Nginx)

The repo already ships `DEPLOYMENT.md` with the full guide; this is a concise checklist that mirrors it.

#### 1. Server bootstrap
```bash
# Node 18+ LTS
git clone <repo> && cd Backend
npm install
cp .env.example .env       # fill in MONGODB_URI, JWT_SECRET, S3_*, etc.
npm run seed               # one-time: creates Super Admin + first admin user
```

#### 2. PM2
```bash
npm install -g pm2
pm2 start src/server.js --name gk-healthcare-backend --time
pm2 save
pm2 startup                # follow the printed instruction to enable on boot
```

For zero-downtime restarts after a deploy: `pm2 reload gk-healthcare-backend`.

For multi-core scaling: `pm2 start src/server.js -i max --name gk-healthcare-backend`. Note: Puppeteer's bundled Chromium uses memory — start with 1–2 instances on smaller VPS.

#### 3. Nginx reverse proxy
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # Let's Encrypt managed certs
    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    client_max_body_size 30m;   # uploads up to 25 MB + headroom

    location / {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;       # PDF rendering can be slow
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

#### 4. SSL
```bash
sudo certbot --nginx -d api.yourdomain.com
```

#### 5. Operational
- **Logs**: `pm2 logs gk-healthcare-backend` or `tail -f ~/.pm2/logs/gk-healthcare-backend-out.log`.
- **MongoDB backups**: Atlas automated backups (preferred) or `mongodump` cron job.
- **S3**: enable bucket versioning on the `reports/` prefix so PDF regeneration in Sprint 8 doesn't lose history.
- **CORS**: set `CORS_ORIGIN=https://admin.yourdomain.com,https://app.yourdomain.com` in production — never leave it as `*`.
- **JWT**: rotate `JWT_SECRET` only when you accept all existing tokens being invalidated.
- **Health check** for load balancer: `GET /api/v1/health`.

#### 6. Puppeteer in production
Bundled Chromium needs system libs (`libnss3, libatk-bridge2.0-0, libgtk-3-0, libgbm1, ...`). On Ubuntu/Debian: `apt-get install -y chromium-browser` and set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`. Alpine: install `chromium` and `nss` packages.

If running in Docker: use a base image with these libs preinstalled (e.g. `node:18-bookworm-slim` + apt-get the deps), or use `ghcr.io/puppeteer/puppeteer` as a base.

### RBAC keys used (Sprint 10)
- `dashboard` read — gates `/dashboard/summary` only (my-summary is always available to authenticated users).
- Notifications endpoints are user-scoped (no RBAC).

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| auditlogs | `action`, `module`, `recordId`, `performedBy`, `createdAt desc`, `(module, createdAt desc)` | filter + chronological |
| notifications | (existing from Sprint 5) `userId`, `type`, `isRead`, `(userId, isRead, createdAt desc)` | per-user unread queue |

### Behaviour notes
- **Audit writes are best-effort** — every business action stays committed even if the audit insert fails. Failures are logged. Don't gate UI behaviour on whether an audit row exists.
- **`auditLegacy` adapter** lets the 10 services from earlier sprints keep their original 5-arg call shape; new code should use the req-aware `audit(req, ...)` so IP/UA get captured.
- **Notifications list `meta.unreadCount`** is computed per request — it's a quick `countDocuments` on the unread filter, not a separate API call.
- **Dashboard counts exclude soft-deleted** records — matches what list endpoints show. If a row is soft-deleted, it disappears from both lists and the summary.
- **`totalOutstanding`** on the dashboard is the org-wide sum; the per-customer figure is on `Customer.totalOutstanding`. These can differ briefly mid-payment (transaction landed but recompute hasn't finished), but converge within a single payment write.
- **Rate limits are per-IP** — they don't burn through a corporate NAT in normal use, but if many staff share an outbound IP and brute-force testing happens, the login limiter will kick in. Adjust `max` in `rateLimit.js` if needed.

---

## Cross-sprint conventions (always apply)

- **Soft delete** on every business record: `isDeleted, deletedAt, deletedBy`, plus force `status: "Inactive"` on delete. All read paths filter `isDeleted: false`.
- **Audit fields** on every record: `createdBy, updatedBy` from `req.user._id`, plus Mongoose `timestamps: true`.
- **Auto codes** via `nextCode(key, prefix, pad)`. Counter keys so far: `customer`, `product`, `sparePart`, `task`. Reports use the dedicated `utils/reportNumber.js` helper (monthly-resetting sequences, e.g. `SVC-2605-00001`); flat-sequence kinds (`quotation`) use `nextFlatNumber('quotation')`.
- **File uploads** go through `services/s3Service.js`. Don't write to disk. For inbound uploads use the `genericUpload` multer factory + `assertAllowedForModule(file, moduleKey)`. For server-generated artifacts (PDFs, exports), call `s3.putObject({ buffer, mimeType, moduleKey, originalName })` directly.
- **PDF generation** goes through `services/pdfService.js` — drop a new `.hbs` file in `src/templates/` and reference it by basename. Don't spawn Puppeteer ad-hoc; the service maintains a single browser per process.
- **Persisted notifications** via `services/notificationService.js`. Call `notificationService.taskAssigned/taskStatusChanged/...` from any state-changing service. Writes are best-effort (failures are logged, never thrown). Sprint 10 adds delivery (FCM) and mark-read APIs on top of the same `Notification` collection.
- **Audit log writes** go through `services/auditService.js`. Use `audit(req, action, recordId, { oldValue, newValue })` in new code; `auditLegacy(action, recordId, performedBy, oldValue, newValue)` is the shim for the original Sprint-4-through-9 call shape. Writes are best-effort — they never throw. Add new actions in `UPPER_SNAKE_CASE`; module is auto-inferred from the prefix.
- **Denormalize names** alongside foreign IDs when the related doc's display string is shown in lists (e.g. `stateName`, `cityName`, `customerName/hospitalName` on tasks/reports).
- **Module folder = camelCase** (`customerContacts`, `customerMachines`, `spareParts`).
- **Route segment = kebab-case** (`/customer-contacts`, `/customer-machines`, `/spare-parts`).
- **All write routes** start with `authenticate` then `checkPermission(moduleKey, 'write')`. All read routes likewise with `'read'`. Super Admin bypasses both.

---

## Module key reference (kept in sync with `src/constants/modules.js`)

```
dashboard, customers, customer_contacts, customer_machines, leads, tasks,
products, spare_parts, installation_reports, service_reports,
preventive_maintenance_reports, inspection_reports, incident_reports,
quotations, payments, outstandings, expenses, notifications,
users, roles, locations, settings
```

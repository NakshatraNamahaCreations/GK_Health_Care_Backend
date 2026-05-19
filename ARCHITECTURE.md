# Backend Architecture

## Architecture Pattern

The backend will follow a modular monolith architecture.

A modular monolith means the project is deployed as one backend application, but the code is separated into clean business modules.

## Why This Architecture Is Best

The system includes many connected modules:

- Customer / hospital records
- Dialysis machines
- Service reports
- Installation reports
- Spare parts
- Quotations
- Payments
- Expenses
- Tasks
- Users and roles

These modules are tightly connected. For example, a service report needs customer, machine, technician, spare parts, signature, and PDF data. A quotation needs customer, product, spare parts, GST, PDF, and status. Because of this, a modular monolith is cleaner and faster than microservices.

## Backend Layers

### 1. Routes

Defines API endpoints and attaches middleware.

### 2. Middleware

Handles authentication, permission checks, validation, upload handling, and errors.

### 3. Controller

Handles HTTP request and response.

### 4. Service

Handles business logic.

### 5. Model

Handles MongoDB schema and database interaction through Mongoose.

## API Response Standard

Success response:

```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": {},
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10
  }
}
```

Error response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

## Authentication Flow

1. Admin creates user with mobile number and password.
2. User logs in with mobile number and password.
3. Backend validates password using bcrypt.
4. Backend checks user status and role status.
5. Backend returns JWT token and role permissions.
6. Mobile app stores token securely.
7. Every protected API requires Authorization Bearer token.

## RBAC Flow

1. Admin creates a role.
2. Admin selects module wise Read and Write access.
3. Admin assigns role to user.
4. On login, backend returns permissions.
5. Frontend hides unauthorized modules.
6. Backend still validates every protected API with permission middleware.

## File Storage Flow

Files should not be stored permanently inside the backend server.

Recommended storage:

- AWS S3
- DigitalOcean Spaces
- Cloudflare R2
- Any S3 compatible storage

Files to store:

- Profile photos
- Expense bills
- Service photos
- Signature images
- Report PDFs
- Quotation PDFs
- Product images

## PDF Generation Flow

Recommended PDF approach:

1. Backend receives report data.
2. Backend stores report record.
3. Backend renders HTML template.
4. Puppeteer converts HTML to PDF.
5. PDF is uploaded to S3.
6. PDF URL is stored in report document.
7. Mobile app opens or shares PDF URL.

## Notification Flow

Use Firebase Cloud Messaging for push notifications.

Notification triggers:

- Task assigned
- Task status changed
- Follow up reminder
- Service due reminder
- Expense approved or rejected
- Report generated
- Payment follow up

## Audit Logging

Create audit logs for important actions:

- User created
- Role updated
- Customer deleted
- Task assigned
- Report generated
- Payment added
- Expense approved
- Password reset

Audit log fields:

```json
{
  "action": "CUSTOMER_CREATED",
  "module": "customers",
  "recordId": "ObjectId",
  "performedBy": "ObjectId",
  "oldValue": {},
  "newValue": {},
  "ipAddress": "",
  "userAgent": ""
}
```

# GK Health Care CRM Backend Documentation

## Project Summary

GK Health Care requires an internal CRM backend for a Flutter Android app and React Admin Panel. The system is used by sales team members, technicians, managers, and admin users to manage hospitals, dialysis machines, spare parts, installations, services, quotations, payments, expenses, reports, and role based permissions.

The backend will be built using a modular monolith architecture with Node.js, Express.js, MongoDB, and Mongoose.

## Recommended Backend Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas or self hosted MongoDB |
| ODM | Mongoose |
| Authentication | JWT |
| Password Hashing | Bcrypt |
| Validation | Zod |
| File Upload | Multer |
| File Storage | AWS S3 or compatible storage |
| PDF Generation | Puppeteer HTML to PDF |
| Excel Import | ExcelJS |
| Notifications | Firebase Cloud Messaging |
| Logging | Winston or Pino |
| API Documentation | Swagger OpenAPI |
| Process Manager | PM2 |

## Architecture Choice

Use a modular monolith architecture.

Reasons:

- The project is an internal CRM, not a public high traffic SaaS.
- Modules are strongly connected to each other.
- Development will be faster than microservices.
- Deployment and debugging will be easier.
- Future scaling is still possible by separating heavy modules later.

## Main Modules

- Auth
- Users
- Roles and Permissions
- Customers / Hospitals
- Customer Contacts
- Customer Machines
- Leads
- Lead Follow Ups
- Tasks
- Products
- Spare Parts
- Reports
- Quotations
- Payments
- Outstanding
- Expenses
- Notifications
- Locations
- Uploads
- Dashboard
- Audit Logs

## Folder Structure

```txt
backend/
├── src/
│   ├── config/
│   ├── constants/
│   ├── middlewares/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── customers/
│   │   ├── customerContacts/
│   │   ├── customerMachines/
│   │   ├── leads/
│   │   ├── tasks/
│   │   ├── products/
│   │   ├── spareParts/
│   │   ├── reports/
│   │   ├── quotations/
│   │   ├── payments/
│   │   ├── expenses/
│   │   ├── notifications/
│   │   ├── locations/
│   │   └── dashboard/
│   ├── services/
│   ├── utils/
│   ├── templates/
│   ├── jobs/
│   ├── app.js
│   └── server.js
├── tests/
├── uploads/
├── .env.example
├── package.json
└── README.md
```

## Module Structure

Each module should follow this structure:

```txt
modules/customers/
├── customer.model.js
├── customer.controller.js
├── customer.service.js
├── customer.routes.js
├── customer.validation.js
└── customer.constants.js
```

## Development Rule

Business logic must be inside service files. Controllers should only handle request and response.

API flow:

```txt
Route → Middleware → Validation → Controller → Service → Model → MongoDB
```

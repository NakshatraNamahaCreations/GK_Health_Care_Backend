# RBAC and Security Plan

## RBAC Overview

RBAC means Role Based Access Control.

Admin can create dynamic roles and assign Read and Write permissions for every module.

## Permission Rules

- Read permission allows list, details, search, filter, and PDF view.
- Write permission allows create, update, delete, status change, assign, approve, generate PDF, and upload.
- Write permission should require Read permission.
- Inactive users cannot login.
- Inactive roles cannot be used.
- Admin role should have full access.

## Module Keys

```js
const APP_MODULES = [
  { moduleKey: "dashboard", moduleName: "Dashboard" },
  { moduleKey: "customers", moduleName: "Customers / Hospitals" },
  { moduleKey: "customer_contacts", moduleName: "Customer Contacts" },
  { moduleKey: "customer_machines", moduleName: "Customer Machines" },
  { moduleKey: "leads", moduleName: "Leads" },
  { moduleKey: "tasks", moduleName: "Tasks" },
  { moduleKey: "products", moduleName: "Products" },
  { moduleKey: "spare_parts", moduleName: "Spare Parts" },
  { moduleKey: "installation_reports", moduleName: "Installation Reports" },
  { moduleKey: "service_reports", moduleName: "Service Reports" },
  { moduleKey: "preventive_maintenance_reports", moduleName: "Preventive Maintenance Reports" },
  { moduleKey: "inspection_reports", moduleName: "Inspection Reports" },
  { moduleKey: "incident_reports", moduleName: "Incident Reports" },
  { moduleKey: "quotations", moduleName: "Quotations" },
  { moduleKey: "payments", moduleName: "Payments" },
  { moduleKey: "outstandings", moduleName: "Outstanding" },
  { moduleKey: "expenses", moduleName: "Expenses" },
  { moduleKey: "notifications", moduleName: "Notifications" },
  { moduleKey: "users", moduleName: "Users" },
  { moduleKey: "roles", moduleName: "Roles and Permissions" },
  { moduleKey: "locations", moduleName: "Locations" },
  { moduleKey: "settings", moduleName: "Settings" }
];
```

## Permission Middleware Example

```js
router.get(
  "/customers",
  authMiddleware,
  checkPermission("customers", "read"),
  customerController.getCustomers
);

router.post(
  "/customers",
  authMiddleware,
  checkPermission("customers", "write"),
  customerController.createCustomer
);
```

## Security Checklist

- Use bcrypt for password hashing.
- Use JWT for authentication.
- Store JWT secret in environment variables.
- Add rate limiting to login API.
- Use Helmet security headers.
- Enable CORS only for approved domains.
- Validate every request body with Zod.
- Sanitize MongoDB queries.
- Limit file size uploads.
- Validate file type before upload.
- Use soft delete for major records.
- Add audit logs for sensitive operations.
- Do not return password field in API responses.
- Do not store plain text passwords.
- Do not expose stack traces in production.

## Password Rules

Recommended password rules:

- Minimum 6 characters for internal app.
- Store hashed password only.
- Admin can reset user password.
- Logged in user can change own password.
- Optional future enhancement: OTP based forgot password.

## Login Response Should Include Permissions

```json
{
  "token": "jwt_token",
  "data": {
    "_id": "userId",
    "name": "Ravi Kumar",
    "mobileNumber": "9876543210",
    "role": {
      "roleName": "Technician",
      "permissions": [
        {
          "moduleKey": "tasks",
          "read": true,
          "write": true
        }
      ]
    }
  }
}
```

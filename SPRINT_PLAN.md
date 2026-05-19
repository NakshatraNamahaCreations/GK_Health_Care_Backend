# Sprint Plan

## Sprint Duration

Recommended sprint duration: 1 week per sprint.

Total backend estimate: 8 to 10 sprints depending on report/PDF complexity.

## Sprint 0: Project Setup and Foundation

### Goal

Create the backend foundation with Express, MongoDB, configuration, middleware, and base project structure.

### Tasks

- Initialize Node.js project.
- Setup Express app.
- Setup folder structure.
- Setup environment config.
- Setup MongoDB connection with Mongoose.
- Setup global error handler.
- Setup standard API response helper.
- Setup request logger.
- Setup CORS and Helmet.
- Setup health check API.
- Setup Git ignore and env example.

### Deliverables

- Running Express server.
- MongoDB connected.
- Health check API working.
- Clean modular folder structure.

## Sprint 1: Authentication, Users, Roles and Permissions

### Goal

Build login, user management, dynamic roles, and RBAC middleware.

### Tasks

- Create User model.
- Create Role model.
- Create app module constants.
- Create auth login API using mobile number and password.
- Create JWT middleware.
- Create permission middleware.
- Create user CRUD APIs.
- Create admin reset password API.
- Create change password API.
- Create role CRUD APIs.
- Add active/inactive validation for users and roles.
- Seed default Admin role and default admin user.

### Deliverables

- Admin can login.
- Admin can create roles.
- Admin can assign permissions.
- Admin can create users.
- Permission middleware works.

## Sprint 2: Customer, Contact and Location Modules

### Goal

Build hospital/customer management and location master APIs.

### Tasks

- Create State model and APIs.
- Create City model and APIs.
- Create Customer model.
- Create customer code generator.
- Create customer CRUD APIs.
- Add search and filter for customers.
- Create Customer Contact model.
- Create customer contact CRUD APIs.
- Add validation for phone, GSTIN, pincode, and email.
- Add RBAC checks.

### Deliverables

- Admin or permitted users can manage hospitals/customers.
- Customer contacts can be managed under customers.
- State and city dropdown APIs ready.

## Sprint 3: Products, Spare Parts and Customer Machines

### Goal

Build product master, spare parts master, and installed dialysis machine tracking.

### Tasks

- Create Product model and APIs.
- Create Spare Part model and APIs.
- Create Customer Machine model and APIs.
- Link machine to customer and product.
- Add machine warranty and AMC fields.
- Add machine status flow.
- Add search and filters.
- Add Excel import skeleton for products/spare parts.
- Add RBAC checks.

### Deliverables

- Products and spare parts can be managed.
- Customer machines can be added and tracked.
- Customer machine service history ready for later report linking.

## Sprint 4: Lead and Follow Up Module

### Goal

Build sales lead management and follow up tracking.

### Tasks

- Create Lead model.
- Create Lead Follow Up model.
- Create lead CRUD APIs.
- Create lead status update API.
- Create lead follow up APIs.
- Add lead assignment to sales user.
- Add convert lead to customer API.
- Add search and filters by status, date, assigned user.
- Add RBAC checks.

### Deliverables

- Sales team can manage leads and follow ups.
- Leads can be converted to customers.

## Sprint 5: Task Management Module

### Goal

Build task assignment and tracking for sales team and technicians.

### Tasks

- Create Task model.
- Create task number generator.
- Create task CRUD APIs.
- Create My Tasks API.
- Create task status update API.
- Link task to customer, lead, and customer machine.
- Add priority, due date, and assigned user logic.
- Add notification record when task is assigned.
- Add RBAC checks.

### Deliverables

- Admin/manager can assign tasks.
- Users can view their own tasks.
- Task status can be updated.

## Sprint 6: Reports Core and PDF Foundation

### Goal

Create report architecture, upload handling, signature storage, and PDF generation foundation.

### Tasks

- Setup file upload module.
- Setup S3 upload service.
- Setup Puppeteer PDF service.
- Create report number generator.
- Create common report utility functions.
- Create HTML templates folder.
- Create signature upload flow.
- Create PDF upload and save PDF URL flow.
- Create basic report list API.

### Deliverables

- File upload working.
- Signature upload working.
- PDF generation service working.
- Report infrastructure ready.

## Sprint 7: Installation, Service and Maintenance Reports

### Goal

Build main technician report modules.

### Tasks

- Create Installation Report model and APIs.
- Create Service Report model and APIs.
- Create Preventive Maintenance Report model and APIs.
- Add spare parts used array in service report.
- Link reports to customer and customer machine.
- Generate PDF for each report.
- Store PDF URL.
- Update machine last service date and next service date where required.
- Add RBAC checks.

### Deliverables

- Technicians can create installation reports.
- Technicians can create service reports.
- Technicians can create preventive maintenance reports.
- PDFs are generated and stored.

## Sprint 8: Inspection, Incident and Quotation Modules

### Goal

Build additional report modules and sales quotation module.

### Tasks

- Create Inspection Report model and APIs.
- Create Incident Report model and APIs.
- Create Quotation model and APIs.
- Create quotation number generator.
- Add quotation item calculation.
- Add GST, discount, freight, subtotal, and grand total calculation.
- Generate quotation PDF.
- Add quotation status update API.
- Add RBAC checks.

### Deliverables

- Inspection reports can be created.
- Incident reports can be created.
- Quotations can be created and converted.
- Quotation PDFs generated.

## Sprint 9: Payments, Outstanding and Expenses

### Goal

Build finance related internal modules.

### Tasks

- Create Payment model and APIs.
- Create Outstanding model and APIs.
- Update customer outstanding after payment.
- Create Expense Category model and APIs.
- Create Expense model and APIs.
- Add my expenses API.
- Add expense approval and rejection APIs.
- Add attachment upload for expense bills.
- Add RBAC checks.

### Deliverables

- Payments can be recorded.
- Outstanding can be tracked.
- Users can submit expenses.
- Managers/admin can approve or reject expenses.

## Sprint 10: Dashboard, Notifications, Audit Logs and Final Testing

### Goal

Complete dashboard, notification APIs, audit logs, and backend stabilization.

### Tasks

- Create Dashboard summary API.
- Create My Dashboard summary API.
- Create Notification model and APIs.
- Add mark as read API.
- Add Firebase token save API.
- Add audit log model and utility.
- Add audit logs to important actions.
- Complete Swagger documentation.
- Test all APIs.
- Fix bugs.
- Prepare deployment documentation.

### Deliverables

- Dashboard APIs ready.
- Notifications ready.
- Audit logs ready.
- API documentation ready.
- Backend ready for mobile and admin integration.

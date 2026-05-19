# Claude Sprint Prompts

Use these prompts with Claude sprint by sprint. Paste the relevant project context first, then paste the sprint prompt.

## Common Project Context Prompt

```txt
We are building the backend for GK Health Care internal CRM.

Business context:
GK Health Care sells dialysis machines, dialysis machine spare parts, installation, and service. The app is internal and will be used by sales team members, technicians, managers, and admin users. Each user has their own mobile number and password login.

Customer meaning:
In this project, Customer means Hospital, Dialysis Center, Clinic, or Healthcare Institution. Customer records include customer/contact person name, phone, email, hospital name, GSTIN, address, state, city, pincode, customer type, assigned user, installed machines, service history, quotation history, payments, and outstanding.

Architecture:
Use a modular monolith backend with Node.js, Express.js, MongoDB, and Mongoose.

Required coding pattern:
Route → Middleware → Validation → Controller → Service → Model → MongoDB.
Controllers should only handle request/response. Business logic must be inside services.

Tech stack:
Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs, Zod, multer, AWS S3 compatible storage, Puppeteer, ExcelJS, Swagger, Winston.

RBAC:
Admin can create roles and decide module wise Read and Write permission. Backend must enforce permissions for every protected API using checkPermission(moduleKey, action). action can be read or write. Users can only access modules based on their assigned role.

Standard API response:
Success:
{
  "success": true,
  "message": "Message here",
  "data": {},
  "meta": {}
}

Error:
{
  "success": false,
  "message": "Error message",
  "errors": []
}

Please generate production ready code, clean folder structure, Zod validations, error handling, and comments where needed. Do not create microservices.
```

---

## Sprint 0 Prompt: Project Setup and Foundation

```txt
Using the common project context, create Sprint 0 backend foundation.

Tasks:
1. Initialize an Express.js backend structure.
2. Create src/app.js and src/server.js.
3. Setup dotenv config.
4. Setup MongoDB connection using Mongoose.
5. Setup CORS, Helmet, compression, JSON body parsing, and request logging.
6. Create global error handler middleware.
7. Create asyncHandler utility.
8. Create ApiError and ApiResponse helpers.
9. Create health check route GET /api/v1/health.
10. Create 404 route handler.
11. Provide package.json scripts for dev and start.
12. Provide .env.example.
13. Provide final folder structure.

Expected output:
- Full code files with paths.
- Installation commands.
- Explanation of how to run.
- No placeholder pseudo code. Give actual working code.
```

---

## Sprint 1 Prompt: Auth, Users, Roles and RBAC

```txt
Using the common project context and Sprint 0 foundation, build Sprint 1.

Tasks:
1. Create User model.
2. Create Role model.
3. Create APP_MODULES constants with moduleKey and moduleName.
4. Create auth middleware to verify JWT.
5. Create checkPermission(moduleKey, action) middleware.
6. Create Auth module with:
   - POST /api/v1/auth/login using mobileNumber and password
   - GET /api/v1/auth/me
   - PATCH /api/v1/auth/change-password
7. Create User module with:
   - POST /api/v1/users
   - GET /api/v1/users
   - GET /api/v1/users/:id
   - PUT /api/v1/users/:id
   - PATCH /api/v1/users/:id/status
   - PATCH /api/v1/users/:id/reset-password
8. Create Role module with:
   - POST /api/v1/roles
   - GET /api/v1/roles
   - GET /api/v1/roles/:id
   - PUT /api/v1/roles/:id
   - PATCH /api/v1/roles/:id/status
9. Add Zod validations.
10. Hash password using bcryptjs.
11. Do not return password in response.
12. Add seed script to create Super Admin role and first admin user.

Important rules:
- Inactive users cannot login.
- Inactive roles cannot login.
- Write permission should require read permission.
- Super Admin should bypass all permission checks.

Expected output:
- Full code files with paths.
- API examples.
- Seed instructions.
```

---

## Sprint 2 Prompt: Customers, Contacts and Locations

```txt
Using the common project context and existing Sprint 0 and Sprint 1 code, build Sprint 2.

Tasks:
1. Create Location module:
   - State model
   - City model
   - GET /api/v1/locations/states
   - POST /api/v1/locations/states
   - GET /api/v1/locations/cities?stateId=
   - POST /api/v1/locations/cities
2. Create Customer model where customer means hospital/dialysis center/clinic.
3. Customer fields:
   - customerCode auto generated
   - customerName
   - phone
   - email
   - hospitalName
   - gstin
   - address
   - stateId
   - stateName
   - cityId
   - cityName
   - pincode
   - customerType
   - assignedTo
   - totalOutstanding
   - status
4. Create Customer APIs:
   - POST /api/v1/customers
   - GET /api/v1/customers with search, status, city, state, pagination
   - GET /api/v1/customers/:id
   - PUT /api/v1/customers/:id
   - DELETE /api/v1/customers/:id as soft delete or inactive
5. Create Customer Contact model and APIs:
   - POST /api/v1/customer-contacts
   - GET /api/v1/customer-contacts/customer/:customerId
   - PUT /api/v1/customer-contacts/:id
   - DELETE /api/v1/customer-contacts/:id
6. Add validations for phone, email, GSTIN, pincode.
7. Add RBAC checks:
   - customers read/write
   - customer_contacts read/write
   - locations read/write

Expected output:
- Full code files with paths.
- API request and response examples.
- Any indexes needed in MongoDB.
```

---

## Sprint 3 Prompt: Products, Spare Parts and Customer Machines

```txt
Using the common project context and previous sprint code, build Sprint 3.

Tasks:
1. Create Product model and APIs.
2. Product fields:
   - productCode
   - productName
   - productType
   - category
   - manufacturer
   - modelNumber
   - description
   - price
   - gstPercentage
   - hsnCode
   - warrantyMonths
   - status
3. Create Spare Part model and APIs.
4. Spare Part fields:
   - partCode
   - partName
   - compatibleMachine
   - category
   - manufacturer
   - rate
   - gstPercentage
   - stockQuantity
   - description
   - status
5. Create Customer Machine model and APIs.
6. Customer Machine fields:
   - customerId
   - productId
   - machineName
   - modelNumber
   - manufacturer
   - serialNumber
   - soldDate
   - installationDate
   - warrantyStartDate
   - warrantyEndDate
   - amcStartDate
   - amcEndDate
   - machineStatus
   - serviceType
   - lastServiceDate
   - nextServiceDueDate
   - remarks
   - status
7. APIs:
   - CRUD for products
   - CRUD for spare parts
   - CRUD for customer machines
   - GET /api/v1/customer-machines/customer/:customerId
8. Add search and filters.
9. Add RBAC checks.
10. Add Excel import skeleton endpoint for products and spare parts using ExcelJS.

Expected output:
- Full code files with paths.
- API examples.
- Excel import format sample.
```

---

## Sprint 4 Prompt: Leads and Follow Ups

```txt
Using the common project context and previous sprint code, build Sprint 4.

Tasks:
1. Create Lead model.
2. Create Lead Follow Up model.
3. Lead fields:
   - leadName
   - hospitalName
   - contactPersonName
   - phone
   - alternatePhone
   - email
   - source
   - leadType
   - leadValue
   - requirementType
   - interestedProduct
   - city
   - state
   - address
   - followUpDate
   - assignedTo
   - status
   - remarks
   - convertedCustomerId
4. APIs:
   - POST /api/v1/leads
   - GET /api/v1/leads with pagination, search, status, assignedTo, date filter
   - GET /api/v1/leads/:id
   - PUT /api/v1/leads/:id
   - PATCH /api/v1/leads/:id/status
   - POST /api/v1/leads/:id/followups
   - GET /api/v1/leads/:id/followups
   - POST /api/v1/leads/:id/convert-to-customer
5. On convert to customer, create customer record and update lead status as Converted.
6. Add RBAC checks.
7. Add audit log hooks if audit utility exists, otherwise leave a clean TODO.

Expected output:
- Full code files with paths.
- API examples.
- Validation schema.
```

---

## Sprint 5 Prompt: Task Management

```txt
Using the common project context and previous sprint code, build Sprint 5.

Tasks:
1. Create Task model.
2. Task fields:
   - taskNumber auto generated
   - taskTitle
   - taskType
   - customerId
   - leadId
   - customerMachineId
   - assignedTo
   - assignedBy
   - priority
   - dueDate
   - taskStatus
   - description
   - remarks
   - completionDate
   - relatedReportId
3. APIs:
   - POST /api/v1/tasks
   - GET /api/v1/tasks with filters and pagination
   - GET /api/v1/tasks/my-tasks
   - GET /api/v1/tasks/:id
   - PUT /api/v1/tasks/:id
   - PATCH /api/v1/tasks/:id/status
4. Status values:
   - Open
   - Assigned
   - In Progress
   - Completed
   - Closed
   - Cancelled
5. Add notification record when a task is assigned.
6. Add RBAC checks.
7. Make sure users can only see their own my-tasks.

Expected output:
- Full code files with paths.
- API examples.
- Task number generation logic.
```

---

## Sprint 6 Prompt: Uploads, Signatures and PDF Foundation

```txt
Using the common project context and previous sprint code, build Sprint 6.

Tasks:
1. Create Upload module.
2. Setup multer for file upload.
3. Setup S3 compatible upload service.
4. Create POST /api/v1/uploads/single.
5. Validate allowed file types:
   - images for signatures, photos, bills
   - pdf for reports if uploaded
   - xlsx for imports
6. Create PDF service using Puppeteer.
7. Create HTML template renderer using Handlebars.
8. Create a sample PDF generation API for testing only:
   - POST /api/v1/pdf/test
9. Create report number generator utility.
10. Create templates folder for report HTML templates.
11. Make upload response return fileUrl, key, mimeType, size.

Expected output:
- Full code files with paths.
- S3 env variables.
- Sample PDF template.
- Upload API example.
```

---

## Sprint 7 Prompt: Installation, Service and Preventive Maintenance Reports

```txt
Using the common project context and previous sprint code, build Sprint 7.

Tasks:
1. Create Installation Report model and APIs.
2. Create Service Report model and APIs.
3. Create Preventive Maintenance Report model and APIs.
4. Common report fields:
   - reportNumber
   - reportDate
   - customerId
   - hospitalName
   - customerMachineId
   - machineName
   - serialNumber
   - technicianId
   - technicianName
   - customerSignatureUrl
   - technicianSignatureUrl
   - pdfUrl
   - status
5. Installation report should include installationDate, warranty dates, AMC dates, machineStatus, engineerRemarks.
6. Service report should include serviceType, complaintReported, diagnosis, workDone, sparePartsUsed, machineStatusAfterService, nextServiceDate, customerRemarks, technicianRemarks.
7. Preventive maintenance report should include checklistItems, machineCondition, sparePartsUsed, nextMaintenanceDate, remarks.
8. Generate PDF after report creation and save pdfUrl.
9. Link report to customer and customer machine.
10. Update customer machine lastServiceDate and nextServiceDueDate where applicable.
11. Add APIs:
   - POST /api/v1/reports/installation
   - POST /api/v1/reports/service
   - POST /api/v1/reports/preventive-maintenance
   - GET /api/v1/reports
   - GET /api/v1/reports/:id
12. Add RBAC checks for each report module.

Expected output:
- Full code files with paths.
- PDF templates for each report.
- API examples.
```

---

## Sprint 8 Prompt: Inspection, Incident and Quotations

```txt
Using the common project context and previous sprint code, build Sprint 8.

Tasks:
1. Create Inspection Report model and APIs.
2. Create Incident Report model and APIs.
3. Create Quotation model and APIs.
4. Inspection report fields:
   - issueObserved
   - machineCondition
   - recommendation
   - requiredSpareParts
   - technicianRemarks
5. Incident report fields:
   - incidentDate
   - issueDescription
   - rootCause
   - actionTaken
   - sparePartsUsed
   - pendingAction
   - technicianRemarks
6. Quotation fields:
   - quotationNumber
   - quotationDate
   - customerId
   - leadId
   - hospitalName
   - items array
   - freightCharges
   - subTotal
   - gstTotal
   - grandTotal
   - terms
   - status
   - pdfUrl
7. Add quotation calculation logic.
8. Generate quotation PDF.
9. APIs:
   - POST /api/v1/reports/inspection
   - POST /api/v1/reports/incident
   - POST /api/v1/quotations
   - GET /api/v1/quotations
   - GET /api/v1/quotations/:id
   - PUT /api/v1/quotations/:id
   - PATCH /api/v1/quotations/:id/status
10. Add RBAC checks.

Expected output:
- Full code files with paths.
- Quotation calculation function.
- PDF templates.
- API examples.
```

---

## Sprint 9 Prompt: Payments, Outstanding and Expenses

```txt
Using the common project context and previous sprint code, build Sprint 9.

Tasks:
1. Create Payment model and APIs.
2. Create Outstanding model and APIs.
3. Create Expense Category model and APIs.
4. Create Expense model and APIs.
5. Payment fields:
   - customerId
   - hospitalName
   - invoiceNumber
   - paymentDate
   - amount
   - paymentMode
   - bankName
   - transactionId
   - paymentTerms
   - remarks
6. Outstanding fields:
   - customerId
   - hospitalName
   - invoiceNumber
   - invoiceDate
   - invoiceAmount
   - paidAmount
   - balanceAmount
   - dueDate
   - status
7. Expense fields:
   - userId
   - categoryId
   - categoryName
   - amount
   - expenseDate
   - description
   - attachmentUrl
   - status
   - approvedBy
   - approvalRemarks
   - approvedAt
8. APIs:
   - POST /api/v1/payments
   - GET /api/v1/payments
   - GET /api/v1/payments/customer/:customerId
   - POST /api/v1/outstandings
   - GET /api/v1/outstandings
   - GET /api/v1/outstandings/customer/:customerId
   - POST /api/v1/expense-categories
   - GET /api/v1/expense-categories
   - POST /api/v1/expenses
   - GET /api/v1/expenses
   - GET /api/v1/expenses/my-expenses
   - PATCH /api/v1/expenses/:id/approve
   - PATCH /api/v1/expenses/:id/reject
9. When payment is added, update outstanding and customer totalOutstanding.
10. Add expense bill attachment support.
11. Add RBAC checks.

Expected output:
- Full code files with paths.
- API examples.
- Outstanding update logic.
```

---

## Sprint 10 Prompt: Dashboard, Notifications, Audit Logs and Final Hardening

```txt
Using the common project context and previous sprint code, build Sprint 10.

Tasks:
1. Create Dashboard module.
2. APIs:
   - GET /api/v1/dashboard/summary
   - GET /api/v1/dashboard/my-summary
3. Dashboard summary should include:
   - totalCustomers
   - totalLeads
   - totalTasks
   - pendingTasks
   - completedTasks
   - totalReports
   - totalQuotations
   - totalPayments
   - totalOutstanding
   - totalExpenses
4. My summary should show logged in user assigned tasks, leads, reports, and expenses.
5. Create Notification model and APIs:
   - GET /api/v1/notifications
   - PATCH /api/v1/notifications/:id/read
   - PATCH /api/v1/notifications/read-all
   - POST /api/v1/notifications/save-fcm-token
6. Create Audit Log model and utility.
7. Add audit logs to important actions:
   - user create/update
   - role update
   - customer create/update/delete
   - task assign/status update
   - report create
   - payment add
   - expense approve/reject
8. Add Swagger documentation for all routes.
9. Add production error handling cleanup.
10. Add final security middleware review.
11. Add deployment notes for PM2 and Nginx.

Expected output:
- Full code files with paths.
- Dashboard API examples.
- Notification examples.
- Audit log utility.
- Swagger setup.
- Deployment instructions.
```

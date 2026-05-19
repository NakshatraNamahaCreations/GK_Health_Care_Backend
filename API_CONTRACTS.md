# API Contracts

Base URL:

```txt
/api/v1
```

All protected APIs require:

```txt
Authorization: Bearer <token>
```

## Auth APIs

### Login

`POST /auth/login`

Request:

```json
{
  "mobileNumber": "9876543210",
  "password": "123456"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token",
  "data": {
    "_id": "userId",
    "name": "Ravi Kumar",
    "mobileNumber": "9876543210",
    "role": {
      "_id": "roleId",
      "roleName": "Technician",
      "permissions": []
    }
  }
}
```

### Get Logged In User

`GET /auth/me`

### Change Own Password

`PATCH /auth/change-password`

Request:

```json
{
  "oldPassword": "123456",
  "newPassword": "987654"
}
```

## Role APIs

### Create Role

`POST /roles`

Request:

```json
{
  "roleName": "Technician",
  "description": "Can manage service tasks and reports",
  "permissions": [
    {
      "moduleKey": "tasks",
      "moduleName": "Tasks",
      "read": true,
      "write": true
    },
    {
      "moduleKey": "service_reports",
      "moduleName": "Service Reports",
      "read": true,
      "write": true
    }
  ]
}
```

### Get Roles

`GET /roles`

### Get Role

`GET /roles/:id`

### Update Role

`PUT /roles/:id`

### Change Role Status

`PATCH /roles/:id/status`

## User APIs

### Create User

`POST /users`

Request:

```json
{
  "name": "Ravi Kumar",
  "mobileNumber": "9876543210",
  "email": "ravi@gkhealthcare.com",
  "password": "123456",
  "roleId": "roleObjectId",
  "department": "Service",
  "designation": "Technician",
  "status": "Active"
}
```

### Get Users

`GET /users`

Query params:

```txt
?page=1&limit=10&search=ravi&status=Active&roleId=roleId
```

### Get User

`GET /users/:id`

### Update User

`PUT /users/:id`

### Change User Status

`PATCH /users/:id/status`

### Admin Reset Password

`PATCH /users/:id/reset-password`

Request:

```json
{
  "newPassword": "987654"
}
```

## Customer APIs

### Create Customer / Hospital

`POST /customers`

Request:

```json
{
  "customerName": "Mr. Ramesh",
  "phone": "9876543210",
  "email": "ramesh@hospital.com",
  "hospitalName": "Sri Lakshmi Dialysis Center",
  "gstin": "29ABCDE1234F1Z5",
  "address": "No 25, Main Road, Rajajinagar",
  "stateId": "stateObjectId",
  "stateName": "Karnataka",
  "cityId": "cityObjectId",
  "cityName": "Bengaluru",
  "pincode": "560010",
  "customerType": "Dialysis Center",
  "assignedTo": "userObjectId"
}
```

### Get Customers

`GET /customers`

Query params:

```txt
?page=1&limit=10&search=hospital&city=Bengaluru&status=Active
```

### Get Customer

`GET /customers/:id`

### Update Customer

`PUT /customers/:id`

### Delete Customer

`DELETE /customers/:id`

## Customer Contact APIs

`POST /customer-contacts`

```json
{
  "customerId": "customerObjectId",
  "name": "Suresh Kumar",
  "phone": "9876543210",
  "email": "suresh@hospital.com",
  "position": "Purchase Manager",
  "department": "Purchase",
  "remarks": "Main purchase contact"
}
```

`GET /customer-contacts/customer/:customerId`

`PUT /customer-contacts/:id`

`DELETE /customer-contacts/:id`

## Customer Machine APIs

`POST /customer-machines`

```json
{
  "customerId": "customerObjectId",
  "productId": "productObjectId",
  "machineName": "Dialysis Machine",
  "modelNumber": "DM-500",
  "manufacturer": "Manufacturer Name",
  "serialNumber": "SN123456",
  "soldDate": "2026-05-10",
  "installationDate": "2026-05-11",
  "warrantyStartDate": "2026-05-11",
  "warrantyEndDate": "2027-05-11",
  "amcStartDate": "2027-05-12",
  "amcEndDate": "2028-05-12",
  "machineStatus": "Installed",
  "serviceType": "Warranty",
  "nextServiceDueDate": "2026-08-11",
  "remarks": "Installed successfully"
}
```

`GET /customer-machines`

`GET /customer-machines/customer/:customerId`

`GET /customer-machines/:id`

`PUT /customer-machines/:id`

`DELETE /customer-machines/:id`

## Lead APIs

`POST /leads`

```json
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
  "assignedTo": "userObjectId",
  "status": "New",
  "remarks": "Interested in 2 machines"
}
```

`GET /leads`

`GET /leads/:id`

`PUT /leads/:id`

`PATCH /leads/:id/status`

`POST /leads/:id/followups`

`GET /leads/:id/followups`

## Task APIs

`POST /tasks`

```json
{
  "taskTitle": "Install dialysis machine",
  "taskType": "Installation",
  "customerId": "customerObjectId",
  "customerMachineId": "machineObjectId",
  "leadId": null,
  "assignedTo": "technicianUserId",
  "priority": "High",
  "dueDate": "2026-05-20",
  "description": "Install machine at hospital",
  "taskStatus": "Assigned"
}
```

`GET /tasks`

`GET /tasks/my-tasks`

`GET /tasks/:id`

`PUT /tasks/:id`

`PATCH /tasks/:id/status`

## Product APIs

`POST /products`

`GET /products`

`GET /products/:id`

`PUT /products/:id`

`DELETE /products/:id`

## Spare Part APIs

`POST /spare-parts`

`GET /spare-parts`

`GET /spare-parts/:id`

`PUT /spare-parts/:id`

`DELETE /spare-parts/:id`

## Report APIs

### Create Installation Report

`POST /reports/installation`

### Create Service Report

`POST /reports/service`

### Create Preventive Maintenance Report

`POST /reports/preventive-maintenance`

### Create Inspection Report

`POST /reports/inspection`

### Create Incident Report

`POST /reports/incident`

### Get Reports

`GET /reports?type=service&customerId=&machineId=&fromDate=&toDate=`

### Get Report

`GET /reports/:id`

## Quotation APIs

`POST /quotations`

`GET /quotations`

`GET /quotations/:id`

`PUT /quotations/:id`

`PATCH /quotations/:id/status`

`GET /quotations/:id/pdf`

## Payment APIs

`POST /payments`

`GET /payments`

`GET /payments/customer/:customerId`

## Outstanding APIs

`POST /outstandings`

`GET /outstandings`

`GET /outstandings/customer/:customerId`

## Expense APIs

`POST /expenses`

`GET /expenses`

`GET /expenses/my-expenses`

`PATCH /expenses/:id/approve`

`PATCH /expenses/:id/reject`

## Upload APIs

`POST /uploads/single`

Form data:

```txt
file: File
module: expenses | reports | signatures | profiles | products
```

## Location APIs

`GET /locations/states`

`POST /locations/states`

`GET /locations/cities?stateId=stateObjectId`

`POST /locations/cities`

## Dashboard APIs

`GET /dashboard/summary`

`GET /dashboard/my-summary`

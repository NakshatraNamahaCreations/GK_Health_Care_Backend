# MongoDB Database Schema Plan

## Database Design Strategy

Use references for major relationships and embedded arrays for small sub documents.

Use references for:

- userId
- roleId
- customerId
- machineId
- productId
- sparePartId
- taskId
- leadId
- reportId

Use embedded arrays for:

- Role permissions
- Quotation items
- Spare parts used in service reports
- Checklist items
- Small comment history

## Collections

```txt
users
roles
customers
customercontacts
customermachines
products
spareparts
leads
leadfollowups
tasks
installationreports
servicereports
preventivemaintenancereports
inspectionreports
incidentreports
quotations
payments
outstandings
expenses
expensecategories
notifications
states
cities
uploads
auditlogs
```

## User Schema

```js
{
  name: String,
  mobileNumber: { type: String, required: true, unique: true },
  email: String,
  password: String,
  roleId: ObjectId,
  department: String,
  designation: String,
  profileImage: String,
  fcmTokens: [String],
  lastLoginAt: Date,
  passwordResetRequired: Boolean,
  status: "Active" | "Inactive" | "Blocked",
  createdBy: ObjectId,
  updatedBy: ObjectId,
  timestamps: true
}
```

## Role Schema

```js
{
  roleName: String,
  description: String,
  permissions: [
    {
      moduleKey: String,
      moduleName: String,
      read: Boolean,
      write: Boolean
    }
  ],
  status: "Active" | "Inactive",
  createdBy: ObjectId,
  updatedBy: ObjectId,
  timestamps: true
}
```

## Customer Schema

Customer means Hospital, Dialysis Center, Clinic, or Healthcare Institution.

```js
{
  customerCode: String,
  customerName: String,
  phone: String,
  email: String,
  hospitalName: String,
  gstin: String,
  address: String,
  stateId: ObjectId,
  stateName: String,
  cityId: ObjectId,
  cityName: String,
  pincode: String,
  customerType: "Hospital" | "Dialysis Center" | "Clinic" | "Distributor" | "Other",
  assignedTo: ObjectId,
  totalOutstanding: Number,
  status: "Active" | "Inactive",
  createdBy: ObjectId,
  updatedBy: ObjectId,
  timestamps: true
}
```

## Customer Contact Schema

```js
{
  customerId: ObjectId,
  name: String,
  phone: String,
  email: String,
  position: String,
  department: String,
  remarks: String,
  status: "Active" | "Inactive",
  timestamps: true
}
```

## Customer Machine Schema

```js
{
  customerId: ObjectId,
  productId: ObjectId,
  machineName: String,
  modelNumber: String,
  manufacturer: String,
  serialNumber: String,
  soldDate: Date,
  installationDate: Date,
  warrantyStartDate: Date,
  warrantyEndDate: Date,
  amcStartDate: Date,
  amcEndDate: Date,
  machineStatus: String,
  serviceType: String,
  lastServiceDate: Date,
  nextServiceDueDate: Date,
  remarks: String,
  status: "Active" | "Inactive",
  timestamps: true
}
```

## Product Schema

```js
{
  productCode: String,
  productName: String,
  productType: "Dialysis Machine" | "Accessory" | "Service Item" | "Other",
  category: String,
  manufacturer: String,
  modelNumber: String,
  description: String,
  price: Number,
  gstPercentage: Number,
  hsnCode: String,
  warrantyMonths: Number,
  status: "Active" | "Inactive",
  timestamps: true
}
```

## Spare Part Schema

```js
{
  partCode: String,
  partName: String,
  compatibleMachine: String,
  category: String,
  manufacturer: String,
  rate: Number,
  gstPercentage: Number,
  stockQuantity: Number,
  description: String,
  status: "Active" | "Inactive",
  timestamps: true
}
```

## Lead Schema

```js
{
  leadName: String,
  hospitalName: String,
  contactPersonName: String,
  phone: String,
  alternatePhone: String,
  email: String,
  source: String,
  leadType: String,
  leadValue: Number,
  requirementType: String,
  interestedProduct: String,
  city: String,
  state: String,
  address: String,
  followUpDate: Date,
  assignedTo: ObjectId,
  status: String,
  remarks: String,
  convertedCustomerId: ObjectId,
  createdBy: ObjectId,
  updatedBy: ObjectId,
  timestamps: true
}
```

## Task Schema

```js
{
  taskNumber: String,
  taskTitle: String,
  taskType: String,
  customerId: ObjectId,
  leadId: ObjectId,
  customerMachineId: ObjectId,
  assignedTo: ObjectId,
  assignedBy: ObjectId,
  priority: "Low" | "Medium" | "High" | "Urgent",
  dueDate: Date,
  taskStatus: "Open" | "Assigned" | "In Progress" | "Completed" | "Closed" | "Cancelled",
  description: String,
  remarks: String,
  completionDate: Date,
  relatedReportId: ObjectId,
  createdBy: ObjectId,
  updatedBy: ObjectId,
  timestamps: true
}
```

## Report Common Fields

Each report collection should include:

```js
{
  reportNumber: String,
  reportDate: Date,
  customerId: ObjectId,
  hospitalName: String,
  customerMachineId: ObjectId,
  machineName: String,
  serialNumber: String,
  technicianId: ObjectId,
  technicianName: String,
  customerSignatureUrl: String,
  technicianSignatureUrl: String,
  pdfUrl: String,
  status: String,
  createdBy: ObjectId,
  updatedBy: ObjectId,
  timestamps: true
}
```

## Quotation Schema

```js
{
  quotationNumber: String,
  quotationDate: Date,
  customerId: ObjectId,
  leadId: ObjectId,
  hospitalName: String,
  items: [
    {
      itemType: "Product" | "Spare Part" | "Service",
      itemId: ObjectId,
      name: String,
      quantity: Number,
      rate: Number,
      discount: Number,
      gstPercentage: Number,
      gstAmount: Number,
      total: Number
    }
  ],
  freightCharges: Number,
  subTotal: Number,
  gstTotal: Number,
  grandTotal: Number,
  terms: String,
  status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Converted",
  pdfUrl: String,
  createdBy: ObjectId,
  updatedBy: ObjectId,
  timestamps: true
}
```

## Payment Schema

```js
{
  customerId: ObjectId,
  hospitalName: String,
  invoiceNumber: String,
  paymentDate: Date,
  amount: Number,
  paymentMode: String,
  bankName: String,
  transactionId: String,
  paymentTerms: String,
  remarks: String,
  createdBy: ObjectId,
  timestamps: true
}
```

## Expense Schema

```js
{
  userId: ObjectId,
  categoryId: ObjectId,
  categoryName: String,
  amount: Number,
  expenseDate: Date,
  description: String,
  attachmentUrl: String,
  status: "Pending" | "Approved" | "Rejected",
  approvedBy: ObjectId,
  approvalRemarks: String,
  approvedAt: Date,
  timestamps: true
}
```

# Coding Standards

## General Rules

- Use modular folder structure.
- Use meaningful file names.
- Keep controllers thin.
- Keep business logic inside services.
- Use Zod validation for request body, params, and query.
- Use asyncHandler for async routes.
- Use standard API responses.
- Do not repeat code.
- Add indexes for searchable fields.
- Do not return passwords in API responses.

## Naming Conventions

### Files

```txt
customer.model.js
customer.controller.js
customer.service.js
customer.routes.js
customer.validation.js
```

### Variables

Use camelCase.

```js
const customerName = "";
const hospitalName = "";
```

### Models

Use PascalCase.

```js
const Customer = mongoose.model("Customer", customerSchema);
```

## Controller Pattern

```js
const createCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.createCustomer(req.body, req.user);
  return res.status(201).json(
    new ApiResponse(true, "Customer created successfully", result)
  );
});
```

## Service Pattern

```js
const createCustomer = async (payload, user) => {
  const customerCode = await generateCustomerCode();
  return Customer.create({
    ...payload,
    customerCode,
    createdBy: user._id
  });
};
```

## Validation Pattern

```js
const createCustomerSchema = z.object({
  customerName: z.string().min(2),
  phone: z.string().regex(/^[0-9]{10}$/),
  hospitalName: z.string().min(2),
  pincode: z.string().regex(/^[0-9]{6}$/)
});
```

## Error Handling

Use ApiError for operational errors.

```js
throw new ApiError(404, "Customer not found");
```

## Pagination Standard

Query params:

```txt
?page=1&limit=10&search=test
```

Response meta:

```json
{
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

## Soft Delete

For important business records, prefer status update instead of permanent delete.

```js
status: "Inactive"
isDeleted: true
deletedAt: Date
deletedBy: ObjectId
```

## Git Commit Style

```txt
feat: add customer module
fix: correct login validation
refactor: clean report service
chore: update env example
```

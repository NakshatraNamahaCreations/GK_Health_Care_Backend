# Tech Stack

## Final Recommended Stack

```txt
Backend: Node.js + Express.js
Database: MongoDB
ODM: Mongoose
Authentication: JWT
Password Security: Bcrypt
Validation: Zod
File Upload: Multer
File Storage: AWS S3 or S3 compatible storage
PDF Generation: Puppeteer
Excel Import: ExcelJS
Notifications: Firebase Cloud Messaging
Logging: Winston or Pino
API Docs: Swagger OpenAPI
Deployment: VPS with PM2 and Nginx or managed service
```

## Packages

### Core

```bash
npm install express mongoose dotenv cors helmet compression morgan
```

### Authentication

```bash
npm install jsonwebtoken bcryptjs
```

### Validation

```bash
npm install zod
```

### Uploads and Storage

```bash
npm install multer @aws-sdk/client-s3
```

### PDF

```bash
npm install puppeteer handlebars
```

### Excel

```bash
npm install exceljs
```

### Logging

```bash
npm install winston
```

### Security

```bash
npm install express-rate-limit express-mongo-sanitize xss-clean hpp
```

### API Docs

```bash
npm install swagger-jsdoc swagger-ui-express
```

### Dev Tools

```bash
npm install -D nodemon eslint prettier
```

## Optional Packages

For background jobs:

```bash
npm install bullmq ioredis
```

For Firebase notifications:

```bash
npm install firebase-admin
```

## Environment Variables

```env
NODE_ENV=development
PORT=5002
MONGODB_URI=mongodb://localhost:27017/gk_healthcare_crm
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10

S3_ENDPOINT=
S3_REGION=ap-south-1
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=

FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY=

APP_BASE_URL=http://localhost:5002
ADMIN_BASE_URL=http://localhost:3000
```

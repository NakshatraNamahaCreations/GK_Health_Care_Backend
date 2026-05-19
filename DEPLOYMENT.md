# Deployment Guide

## Recommended Production Setup

```txt
Backend: VPS or cloud server
Database: MongoDB Atlas
File Storage: AWS S3 or S3 compatible storage
Process Manager: PM2
Reverse Proxy: Nginx
SSL: Let's Encrypt
```

## Server Steps

### 1. Install Node.js

Use Node.js LTS version.

### 2. Clone Backend Repo

```bash
git clone <repo-url>
cd backend
npm install
```

### 3. Create Environment File

```bash
cp .env.example .env
```

Update all production values.

### 4. Run Seed

```bash
npm run seed
```

### 5. Start with PM2

```bash
npm install -g pm2
pm2 start src/server.js --name gk-healthcare-backend
pm2 save
pm2 startup
```

### 6. Nginx Reverse Proxy

Example config:

```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7. SSL

```bash
sudo certbot --nginx -d api.yourdomain.com
```

## Production Checklist

- NODE_ENV is production.
- MongoDB Atlas IP whitelist configured.
- JWT secret is strong.
- CORS allows only admin panel domain and app domain if needed.
- S3 bucket permissions are correct.
- File size limits are enabled.
- PM2 is running.
- Nginx SSL is active.
- Daily DB backup enabled.
- Logs are monitored.

## Backup Recommendation

- Enable MongoDB Atlas automated backups.
- Keep daily backup retention for at least 7 days.
- Store critical uploaded reports and signatures in S3 with versioning if possible.

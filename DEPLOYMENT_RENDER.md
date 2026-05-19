# Step-by-Step Render Deployment Guide

Welcome! Deploying your backend for the first time might seem daunting, but it is actually a straightforward process. This guide will walk you through every step to deploy your **GK Health Care CRM Backend** to **Render** using **MongoDB Atlas** for database hosting.

---

## Architecture Flow

```mermaid
graph LR
    Client(Web/Mobile App) -->|API Requests| Render[Render Web Service]
    Render -->|Read/Write Data| Atlas[(MongoDB Atlas Cloud)]
    Render -->|Upload/Retrieve Files| S3[(AWS S3 Bucket)]
```

---

## Phase 1: Create a MongoDB Database on MongoDB Atlas

Since Render does not offer a built-in MongoDB service, we will use **MongoDB Atlas**, the official and industry-standard cloud database service for MongoDB. It has a **100% free tier**.

### Step 1.1: Sign Up / Sign In
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register).
2. Create a free account or sign in with Google/GitHub.

### Step 1.2: Create a Free Database
1. Once logged in, click **Create** or **Deploy a Database**.
2. Select the **M0 (Free)** tier.
3. Under **Provider**, choose **AWS** (or Google Cloud).
4. Under **Region**, choose the region closest to you or your target audience (e.g., **Mumbai (ap-south-1)** or **Singapore (ap-southeast-1)**).
5. Give your cluster a name (e.g., `gk-healthcare-prod`) or leave it as `Cluster0`.
6. Click **Create** (or **Deploy**).

### Step 1.3: Configure Database Security
You will be prompted to set up security credentials:
1. **Database User**:
   - Create a username (e.g., `gk_admin`).
   - Generate a strong password (copy this password; you will need it soon!).
   - Click **Create Database User**.
2. **IP Access List (Network Security)**:
   - Since Render assigns dynamic IPs to its free-tier services, you must allow connections from anywhere.
   - Enter `0.0.0.0/0` under IP Address (this allows the backend on Render to connect securely).
   - Enter a description (e.g., `Allow Render Backend`).
   - Click **Add Entry**.
   - Click **Finish and Close** (or **Go to Databases**).

### Step 1.4: Copy Your Connection String
1. On the Atlas dashboard, locate your cluster and click the **Connect** button.
2. Choose **Drivers** (or "Connect your application").
3. Under step 3, copy the **Connection String**. It will look similar to this:
   ```txt
   mongodb+srv://gk_admin:<db_password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
4. **Important**: Replace `<db_password>` with the actual database user password you created in Step 1.3. 
5. Also, add the database name just before the `?` (e.g., `gk_healthcare`):
   ```txt
   mongodb+srv://gk_admin:MySuperSecretPassword@cluster0.xxxx.mongodb.net/gk_healthcare?retryWrites=true&w=majority&appName=Cluster0
   ```

---

## Phase 2: Push Your Code to GitHub or GitLab

Render deploys directly from your Git repository. Whenever you push new updates to your repository, Render will automatically redeploy them!

1. Create a **Private Repository** on GitHub or GitLab named `gk-healthcare-backend`.
2. Make sure your local codebase has a `.gitignore` file that contains:
   ```txt
   node_modules/
   .env
   uploads/
   ```
   *(This ensures you don't push bulky modules or sensitive local database credentials).*
3. Push your local project to GitHub:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit for deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/gk-healthcare-backend.git
   git push -u origin main
   ```

---

## Phase 3: Create your Web Service on Render

Now we will link your GitHub repo to Render and spin up the live backend server.

### Step 3.1: Create Render Account
1. Go to [render.com](https://render.com) and click **Get Started** / **Sign Up**.
2. **Recommendation**: Sign up using your **GitHub account**. This automatically links your repositories.

### Step 3.2: Create a New Web Service
1. On your Render dashboard, click the blue **New** button in the top right.
2. Select **Web Service**.
3. Under **Connect a repository**, search for your `gk-healthcare-backend` repository and click **Connect**.

### Step 3.3: Configure Web Service Details
Fill in the following fields:

| Field | Recommended Value | Description |
| :--- | :--- | :--- |
| **Name** | `gk-healthcare-backend` | The unique name of your service on Render. |
| **Region** | Choose Singapore (`ap-southeast-1`) or Oregon/Ohio | Select the region closest to your users. |
| **Branch** | `main` | The branch Render should deploy from. |
| **Language** | `Node` | The runtime environment. |
| **Build Command** | `npm install` | Installs all production dependencies. |
| **Start Command** | `npm start` | Executes `node src/server.js`. |
| **Instance Type**| `Free` | Select the Free plan to start. |

---

## Phase 4: Configure Environment Variables

Render needs your environment variables to connect to MongoDB and secure your JWTs.

1. Scroll down on the Web Service creation page to the **Environment Variables** section (or navigate to the **Environment** tab on the left sidebar after creating the service).
2. Click **Add Environment Variable** and enter the following values based on your local `.env`:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables Express production optimizations. |
| `API_PREFIX` | `/api/v1` | Prefix for your API endpoints. |
| `MONGODB_URI` | `mongodb+srv://...` | The connection string you copied in **Phase 1 (Step 1.4)**. |
| `CORS_ORIGIN` | `*` *(or your frontend URL)* | Set to `*` to allow all origins, or specify your frontend URL. |
| `JWT_SECRET` | *[Generate a long random string]* | Secure key for signing access tokens. |
| `JWT_REFRESH_SECRET`| *[Generate a different random string]* | Secure key for signing refresh tokens. |
| `LOG_LEVEL` | `info` | Logging level. |

### Optional S3 File Storage Environment Variables
If you are using AWS S3 for uploading signatures and Dialysis reports (from Sprint 6+):
- `S3_REGION` (e.g., `ap-south-1`)
- `S3_BUCKET` (your S3 bucket name)
- `S3_ACCESS_KEY_ID` (your AWS access key)
- `S3_SECRET_ACCESS_KEY` (your AWS secret key)

3. Click **Create Web Service** at the bottom of the page.

---

## Phase 5: Build, Deploy, and Verify

Render will now pull your code from GitHub, install your dependencies (`npm install`), and boot up the server (`npm start`).

### 5.1: Monitor Deploy Logs
1. You will see a live console feed under the **Logs** tab of your service.
2. Watch for the message:
   ```txt
   ==> Express app listening on port 10000
   ==> Server listening on http://localhost:10000 [production]
   ==> Health: http://localhost:10000/api/v1/health
   ```
3. Once successful, the status indicator in the top left will change from **In progress** to a green checkmark **Live**.

### 5.2: Test the Live URL
Your service will have a unique URL at the top left of the dashboard (e.g., `https://gk-healthcare-backend.onrender.com`).
1. Copy the URL.
2. Open a browser and navigate to:
   `https://gk-healthcare-backend.onrender.com/api/v1/health` (or your health check endpoint).
3. You should see a successful JSON health response!

---

## Phase 6: Seeding Your Production Database

Since your MongoDB Atlas database is completely empty, you need to seed the default **Super Admin** role and user so you can log in.

There are two easy ways to do this:

### Option A: Via Render Shell Dashboard (Easiest)
1. Go to your Web Service dashboard on Render.
2. Click the **Shell** tab on the left sidebar.
3. This opens a terminal directly connected to your running server container.
4. Run the seed script command:
   ```bash
   npm run seed
   ```
5. You will see logs indicating that the Super Admin role and first user were successfully created!
6. Copy the output admin password or check your env settings.

### Option B: Run locally pointing to your Atlas database
1. In your local development machine, open your `.env` file.
2. Temporarily comment out your local `MONGODB_URI=mongodb://127.0.0.1...`
3. Paste your Atlas connection string as the `MONGODB_URI`.
4. Run the seed command locally:
   ```powershell
   npm run seed
   ```
5. It will connect to your cloud Atlas database, create the admin user, and exit.
6. Revert your local `.env` back to the local database URL so you don't mess up your local development environment.

---

## Troubleshooting Common Issues

### 1. "Web service is failing to boot or crashing"
*   **Reason**: Usually due to an invalid environment variable or failing to connect to the database.
*   **Fix**: Check the **Logs** tab on Render. Ensure your `MONGODB_URI` password doesn't contain unescaped special characters (like `@`, `#`, `/`). If it does, either url-encode them or change the password to a simpler alphanumeric one.

### 2. "CORS Errors on Frontend"
*   **Reason**: Your API is denying requests from your frontend's domain.
*   **Fix**: Update the `CORS_ORIGIN` environment variable on Render to include your frontend's deployed URL (e.g., `https://gk-healthcare-portal.onrender.com`).

### 3. "Deploy is slow on Free Tier"
*   **Note**: Render's Free tier puts web services to sleep if they don't receive traffic for 15 minutes. The next request can take 50–90 seconds to wake the service up. For production customer use, upgrading to the **Starter** ($7/month) tier prevents sleeping and is highly recommended!

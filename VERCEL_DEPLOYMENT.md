# Deploying Hostel Finder to Vercel 🚀

This project is fully configured to be deployed to **Vercel** with **zero configuration** required.

---

## ⚡ Method 1: Deploy with Git & Vercel Dashboard (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Enable fullstack Vercel deployment"
   git push origin main
   ```

2. **Open Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **"Add New..."** → **"Project"**.
   - Select your `hostel_finder` repository from GitHub.

3. **Configure Project Settings**:
   - **Framework Preset**: Leave as `Other`.
   - **Root Directory**: `./` (leave default).
   - **Build & Development Settings**: Leave as default.
   - (Optional) Environment Variables:
     - `JWT_SECRET`: Any random string (a secure default is already provided).

4. **Click Deploy**:
   - Vercel will install dependencies and deploy the project in ~30 seconds.
   - Your application will be live at `https://your-project.vercel.app`!

---

## 💻 Method 2: Deploy using Vercel CLI

If you have the Vercel CLI installed:

```bash
# 1. Install Vercel CLI globally (if not already installed)
npm install -g vercel

# 2. Deploy
vercel

# 3. For production release:
vercel --prod
```

---

## 🏠 Running Locally

### Option A: Node.js Fullstack Server (Recommended - Fastest)
Starts both the frontend and the backend API on a single port:
```bash
npm start
# or
node server.js
```
Open **`http://localhost:3000`** in your browser.

### Option B: Java Spring Boot Backend
If you still want to run the original Java backend (for viva/evaluation):
```bash
./run.sh            # Starts both Spring Boot backend & frontend
# or
./run-backend.sh    # Starts Spring Boot on port 8080
```

---

## 🔑 Test Demo Accounts

All credentials work on both local and Vercel deployments:

| Role | Email | Password |
|---|---|---|
| **Student** | `student@demo.com` | `Demo@123` |
| **Hostel Owner** | `owner@demo.com` | `Demo@123` |
| **Admin** | `admin@demo.com` | `Demo@123` |


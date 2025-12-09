# Quick Start Guide - Synagogue SaaS Platform

## ✅ Step 1: MongoDB Atlas Setup (5 minutes)

Since you don't have MongoDB installed locally, we'll use MongoDB Atlas (free cloud database):

### 1. Create Account
- Go to: https://www.mongodb.com/cloud/atlas/register
- Sign up with email or Google account

### 2. Create Free Cluster
- Click "Build a Database"
- Choose **FREE** tier (M0)
- Select a cloud provider and region (closest to you)
- Click "Create Cluster"

### 3. Create Database User
- Click "Database Access" (left sidebar)
- Click "Add New Database User"
- Username: `admin`
- Password: `admin123` (or choose your own)
- Click "Add User"

### 4. Allow Network Access
- Click "Network Access" (left sidebar)
- Click "Add IP Address"
- Click "Allow Access from Anywhere" (for development)
- Click "Confirm"

### 5. Get Connection String
- Click "Database" (left sidebar)
- Click "Connect" on your cluster
- Click "Connect your application"
- Copy the connection string (looks like: `mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/`)
- **Replace `<password>` with your actual password**

### 6. Update .env File
Open the `.env` file and update:
```
MONGODB_URI=mongodb+srv://admin:admin123@cluster0.xxxxx.mongodb.net/synagogue?retryWrites=true&w=majority
SESSION_SECRET=your_secret_key_here
PORT=3000
```

---

## ✅ Step 2: Seed Database

Run this command to import the initial data:
```bash
node scripts/seed.js
```

You should see: `Seeded Novosibirsk Synagogue`

---

## ✅ Step 3: Start the Application

```bash
node app.js
```

You should see:
```
MongoDB connected
Started at port 3000
```

---

## ✅ Step 4: Test the Application

Open your browser and visit:

### Public Pages
- **Landing:** http://localhost:3000/
- **Novosibirsk:** http://localhost:3000/s/novosibirsk

### Admin Panel
- **Login:** http://localhost:3000/admin/login
  - Slug: `novosibirsk`
  - Password: `admin`

---

## 🎉 What You Can Do Now

1. **View Memorial Board** - See the Novosibirsk synagogue memorial page
2. **Admin Dashboard** - Change title, colors, language
3. **Add People** - Add new memorial entries
4. **Create New Synagogues** - Use MongoDB Compass or add admin UI

---

## 🐛 Troubleshooting

**"MongoDB connection error"**
- Check your connection string in `.env`
- Make sure you replaced `<password>` with actual password
- Verify Network Access allows your IP

**"Port 3000 already in use"**
- Change `PORT=3001` in `.env` file

**Need help?**
- Check the full logs in the terminal
- Verify MongoDB Atlas cluster is running

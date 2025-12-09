# Setup Instructions for Synagogue SaaS Platform

## ⚠️ Prerequisites Required

Before running this application, you need to install:

### 1. Node.js and npm
- Download from: https://nodejs.org/
- Recommended version: LTS (Long Term Support)
- This will install both Node.js and npm

### 2. MongoDB
You have two options:

#### Option A: Local MongoDB (Recommended for Development)
- Download from: https://www.mongodb.com/try/download/community
- Install MongoDB Community Edition
- Start MongoDB service

#### Option B: MongoDB Atlas (Cloud - Recommended for Production)
- Sign up at: https://www.mongodb.com/cloud/atlas
- Create a free cluster
- Get your connection string
- Update `.env` file with: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/synagogue`

---

## 🚀 Installation Steps

Once Node.js and MongoDB are installed:

### 1. Install Dependencies
```bash
cd c:\Users\770ab\Downloads\novosibirsk-synagogue-master\novosibirsk-synagogue-master
npm install
```

### 2. Configure Environment
The `.env` file is already created. If using MongoDB Atlas, update the `MONGODB_URI`.

### 3. Seed the Database
```bash
node scripts/seed.js
```

### 4. Run the Application
```bash
node app.js
```

The server will start at: http://localhost:3000

---

## 📋 Testing the Application

### Public Pages
- **Landing Page:** http://localhost:3000/
- **Novosibirsk Synagogue:** http://localhost:3000/s/novosibirsk

### Admin Panel
- **Login:** http://localhost:3000/admin/login
  - Slug: `novosibirsk`
  - Password: `admin`

### Admin Features
- **Dashboard:** Change title, primary color, language
- **People Management:** Add/edit/delete memorial entries

---

## 🌐 Deployment to Cloud

### Render.com (Recommended)
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your repository
4. Set environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `SESSION_SECRET`: A random secure string
5. Deploy!

### Vercel
Similar process, but may need adjustments for session storage.

---

## 📝 Next Steps

After installation:
1. Test the application locally
2. Create additional synagogues via MongoDB or add admin UI for this
3. Customize themes and languages
4. Deploy to production

---

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running locally, or
- Check your MongoDB Atlas connection string

**Port Already in Use:**
- Change `PORT` in `.env` file

**Dependencies Installation Fails:**
- Try: `npm install --legacy-peer-deps`

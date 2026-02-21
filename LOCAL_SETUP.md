# 🚀 SwaRojgar - Local Development Setup Guide

## Prerequisites

Before you start, you need to install:

1. **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB Community Edition** (for local database)

---

## Step 1: Install MongoDB on macOS

### Option A: Using Homebrew (Recommended)

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

### Option B: Manual Installation

1. Download MongoDB from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Follow the installation wizard
3. Start MongoDB manually:
   ```bash
   mongod --config /usr/local/etc/mongod.conf
   ```

### Verify MongoDB is Running

```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Or connect to MongoDB shell
mongosh
```

You should see: `Connected to: mongodb://localhost:27017/`

---

## Step 2: Install Project Dependencies

### Install Backend Dependencies

```bash
cd /Users/rahultiwari/Desktop/LABS/SwaRojgar/backend
npm install
```

This will install:
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `cors` - Cross-origin resource sharing
- `multer` - File upload handling
- `dotenv` - Environment variables
- `nodemon` - Auto-restart during development

### Install Frontend Dependencies

```bash
cd /Users/rahultiwari/Desktop/LABS/SwaRojgar
npm install
```

---

## Step 3: Configure Environment Variables

The backend `.env` file has already been created with default settings:

**File: `/Users/rahultiwari/Desktop/LABS/SwaRojgar/backend/.env`**
```env
MONGODB_URI=mongodb://localhost:27017/swarojgar
PORT=5010
```

You can modify these values if needed.

---

## Step 4: Start the Application 

You need **TWO terminal windows** running simultaneously:

### Terminal 1: Start Backend Server

```bash
cd /Users/rahultiwari/Desktop/LABS/SwaRojgar/backend
npm run dev
```

**Expected Output:**
```
Attempting to connect to MongoDB at: mongodb://localhost:27017/swarojgar
✅ Successfully connected to MongoDB
📊 Database: swarojgar

🚀 Server is running on port 5010
📡 API available at: http://localhost:5010

 Available endpoints:
   POST http://localhost:5010/signup
   POST http://localhost:5010/login
   POST http://localhost:5010/api/posts

 Press Ctrl+C to stop the server
```

### Terminal 2: Start Frontend Development Server

```bash
cd /Users/rahultiwari/Desktop/LABS/SwaRojgar
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

---

## Step 5: Access the Application

- **Frontend**: Open browser to [http://localhost:5173/](http://localhost:5173/)
- **Backend API**: [http://localhost:5010](http://localhost:5010)
- **Test with Postman**: See [POSTMAN_GUIDE.md](file:///Users/rahultiwari/Desktop/LABS/SwaRojgar/POSTMAN_GUIDE.md)

---

## 🔧 Troubleshooting

### MongoDB Connection Failed

**Error:** `❌ MongoDB connection error: connect ECONNREFUSED`

**Solution:**
```bash
# Start MongoDB service
brew services start mongodb-community

# Verify it's running
brew services list | grep mongodb
```

### Port Already in Use

**Error:** `Port 5010 is already in use`

**Solution:**
```bash
# Find and kill the process using port 5010
lsof -ti:5010 | xargs kill -9

# Or change the port in backend/.env
PORT=5011
```

### Dependencies Not Installing

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Frontend Can't Connect to Backend

**Check:**
1. Backend is running on port 5010
2. CORS is enabled (already configured)
3. Frontend is making requests to `http://localhost:5010`

---

## 📊 View Database Data

### Using MongoDB Compass (GUI)

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to: `mongodb://localhost:27017`
3. Browse the `swarojgar` database

### Using MongoDB Shell

```bash
mongosh
use swarojgar
db.users.find()  # View all users
db.posts.find()  # View all posts
```

---

## 🛑 Stopping the Application

1. **Stop Backend**: Press `Ctrl+C` in the backend terminal
2. **Stop Frontend**: Press `Ctrl+C` in the frontend terminal
3. **Stop MongoDB** (optional):
   ```bash
   brew services stop mongodb-community
   ```

---

## 📝 Quick Reference

| Component | Command | Port |
|-----------|---------|------|
| Backend (dev) | `cd backend && npm run dev` | 5010 |
| Backend (prod) | `cd backend && npm start` | 5010 |
| Frontend | `npm run dev` | 5173 |
| MongoDB | `brew services start mongodb-community` | 27017 |

---

## Next Steps

- See [POSTMAN_GUIDE.md](file:///Users/rahultiwari/Desktop/LABS/SwaRojgar/POSTMAN_GUIDE.md) for API testing
- Check the backend logs for any errors
- Use MongoDB Compass to view your data

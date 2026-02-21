# 📮 Postman API Testing Guide - SwaRojgar Backend

## Base URL
```
http://localhost:5010
```

Make sure your backend server is running before testing!

---

## 🔐 Authentication Endpoints

### 1. User Signup (Register)

**Endpoint:** `POST /signup`

**Request Body (JSON):**
```json
{
  "firstName": "Rahul",
  "lastName": "Tiwari",
  "email": "rahul@example.com",
  "phoneNumber": "9876543210",
  "password": "password123",
  "userType": "worker"
}
```

**Response (Success - 201):**
```json
{
  "message": "User registered successfully"
}
```

**Response (Error - 500):**
```json
{
  "message": "Error saving user data",
  "error": { ... }
}
```

**Postman Setup:**
1. Method: `POST`
2. URL: `http://localhost:5010/signup`
3. Headers: `Content-Type: application/json`
4. Body: Select "raw" and "JSON", paste the request body above

---

### 2. User Login

**Endpoint:** `POST /login`

**Request Body (JSON):**
```json
{
  "email": "rahul@example.com",
  "password": "password123"
}
```

**Response (Success - 200):**
```json
{
  "message": "Login successful",
  "userType": "worker"
}
```

**Response (Error - 401):**
```json
{
  "message": "Invalid email or password"
}
```

**Postman Setup:**
1. Method: `POST`
2. URL: `http://localhost:5010/login`
3. Headers: `Content-Type: application/json`
4. Body: Select "raw" and "JSON", paste the request body above

---

## 📝 Post Endpoints

### 3. Create a Post (with Image Upload)

**Endpoint:** `POST /api/posts`

**Request Body (form-data):**
- `title`: "Need a Plumber"
- `description`: "Looking for an experienced plumber for bathroom renovation"
- `category`: "Plumbing"
- `location`: "Mumbai, Maharashtra"
- `contactInfo`: "9876543210"
- `image`: [Select file from your computer]

**Response (Success - 201):**
```json
{
  "message": "Post created successfully",
  "post": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Need a Plumber",
    "description": "Looking for an experienced plumber for bathroom renovation",
    "category": "Plumbing",
    "location": "Mumbai, Maharashtra",
    "contactInfo": "9876543210",
    "imageUrl": "/uploads/1234567890.jpg",
    "createdAt": "2026-02-08T01:30:00.000Z"
  }
}
```

**Postman Setup:**
1. Method: `POST`
2. URL: `http://localhost:5010/api/posts`
3. Body: Select "form-data"
4. Add key-value pairs:
   - `title` (Text): "Need a Plumber"
   - `description` (Text): "Looking for an experienced plumber"
   - `category` (Text): "Plumbing"
   - `location` (Text): "Mumbai, Maharashtra"
   - `contactInfo` (Text): "9876543210"
   - `image` (File): Click "Select Files" and choose an image

---

## 🧪 Testing Workflow

### Step 1: Test Signup
1. Open Postman
2. Create a new request
3. Set method to `POST`
4. URL: `http://localhost:5010/signup`
5. Add the signup JSON body
6. Click "Send"
7. Verify you get a 201 status code

### Step 2: Test Login
1. Create a new request
2. Set method to `POST`
3. URL: `http://localhost:5010/login`
4. Add the login JSON body (use the same email/password from signup)
5. Click "Send"
6. Verify you get a 200 status code and `userType` in response

### Step 3: Test Post Creation
1. Create a new request
2. Set method to `POST`
3. URL: `http://localhost:5010/api/posts`
4. Select "form-data" in Body
5. Add all the fields (title, description, category, location, contactInfo, image)
6. Click "Send"
7. Verify you get a 201 status code

---

## 📋 Postman Collection (Import This)

Create a new collection in Postman and save all these requests for easy testing.

### Collection Structure:
```
SwaRojgar API
├── Authentication
│   ├── Signup
│   └── Login
└── Posts
    └── Create Post
```

---

## 🔍 Common Issues & Solutions

### Issue 1: Connection Refused
**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5010`

**Solution:**
- Make sure backend server is running
- Check terminal for backend startup message
- Verify port 5010 is correct

### Issue 2: MongoDB Connection Error
**Error:** Backend shows MongoDB connection error

**Solution:**
```bash
# Start MongoDB
brew services start mongodb-community

# Restart backend server
cd backend
npm run dev
```

### Issue 3: Image Upload Not Working
**Error:** `MulterError: Unexpected field`

**Solution:**
- Make sure you're using "form-data" (not "raw" or "x-www-form-urlencoded")
- The image field name must be exactly `image`
- Select a valid image file (jpg, png, etc.)

### Issue 4: CORS Error
**Error:** `Access-Control-Allow-Origin` error

**Solution:**
- CORS is already enabled in the backend
- Make sure you're making requests from the correct origin
- Check if backend is running

---

## 📊 Sample Test Data

### Sample Users:
```json
// Worker
{
  "firstName": "Ramesh",
  "lastName": "Kumar",
  "email": "ramesh@example.com",
  "phoneNumber": "9876543210",
  "password": "worker123",
  "userType": "worker"
}

// Employer
{
  "firstName": "Priya",
  "lastName": "Sharma",
  "email": "priya@example.com",
  "phoneNumber": "9876543211",
  "password": "employer123",
  "userType": "employer"
}
```

### Sample Posts:
```
Title: Need Electrician
Description: Looking for electrician to fix wiring issues
Category: Electrical
Location: Delhi, India
ContactInfo: 9876543210

Title: Carpenter Required
Description: Need carpenter for furniture work
Category: Carpentry
Location: Bangalore, Karnataka
ContactInfo: 9876543211
```

---

## 🎯 Quick Test Checklist

- [ ] Backend server is running on port 5010
- [ ] MongoDB is running locally
- [ ] Can successfully signup a new user
- [ ] Can login with registered credentials
- [ ] Can create a post without image
- [ ] Can create a post with image
- [ ] Image is saved in `/uploads` folder
- [ ] Can access uploaded image at `http://localhost:5010/uploads/[filename]`

---

## 💡 Pro Tips

1. **Save Requests**: Save all your requests in a Postman collection for reuse
2. **Environment Variables**: Create a Postman environment with `baseUrl = http://localhost:5010`
3. **Tests**: Add Postman tests to automatically verify responses
4. **Console Logs**: Check backend terminal for detailed logs
5. **MongoDB Compass**: Use MongoDB Compass to view the actual data in your database

---

## 🔗 Additional Resources

- [Postman Documentation](https://learning.postman.com/docs/getting-started/introduction/)
- [MongoDB Compass](https://www.mongodb.com/products/compass)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

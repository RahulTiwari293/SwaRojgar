# Backend API Guide

This guide explains how to interact with the SwaRojgar backend API.

## 🚀 Quick Start

### Starting the Backend Server

```bash
cd backend
npm start
```

The server will run on `http://localhost:5010`

---

## 📡 API Endpoints

### 1. User Authentication

#### **Sign Up**
- **URL**: `POST http://localhost:5010/signup`
- **Description**: Register a new user
- **Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "1234567890",
  "password": "yourpassword",
  "userType": "freelancer"
}
```
- **Response** (Success - 201):
```json
{
  "message": "User registered successfully"
}
```

#### **Login**
- **URL**: `POST http://localhost:5010/login`
- **Description**: Login with existing credentials
- **Request Body**:
```json
{
  "email": "john@example.com",
  "password": "yourpassword"
}
```
- **Response** (Success - 200):
```json
{
  "message": "Login successful",
  "userId": "507f1f77bcf86cd799439011",
  "userType": "freelancer"
}
```

---

### 2. Posts Management

#### **Get All Posts**
- **URL**: `GET http://localhost:5010/api/posts`
- **Description**: Retrieve all posts from the database
- **Response** (Success - 200):
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "title": "Looking for Web Developer",
    "content": "Need a full-stack developer for a 3-month project",
    "userType": "client",
    "image": "uploads/1234567890-image.jpg",
    "createdAt": "2024-02-08T01:30:00.000Z"
  }
]
```

#### **Create New Post**
- **URL**: `POST http://localhost:5010/api/posts`
- **Description**: Create a new post (with optional image)
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `userId` (required): User ID from login
  - `title` (required): Post title
  - `content` (required): Post content
  - `userType` (required): "client" or "freelancer"
  - `image` (optional): Image file

- **Response** (Success - 201):
```json
{
  "message": "Post created successfully",
  "post": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "title": "Looking for Web Developer",
    "content": "Need a full-stack developer for a 3-month project",
    "userType": "client",
    "image": "uploads/1234567890-image.jpg",
    "createdAt": "2024-02-08T01:30:00.000Z"
  }
}
```

---

## 🧪 Testing with Frontend

### How to Create a Post from the Frontend

1. **Login First**: Make sure you're logged in. The login saves your `userId` to localStorage.

2. **Click "Create New Post"**: On the dashboard, click the purple "Create New Post" button.

3. **Fill in the Form**:
   - **Title**: Enter a descriptive title
   - **Content**: Write your post content
   - **Image** (optional): Upload an image if needed

4. **Submit**: Click "Create Post" and your post will appear immediately!

### How Posts Are Displayed

- Posts are automatically fetched when you load the page
- New posts appear after creation without refreshing
- Images are displayed if uploaded
- Posts show the user type (Client/Freelancer) and creation date

---

## 🛠️ Using Postman

For detailed Postman testing instructions, see [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md)

### Quick Postman Example

1. **Create a POST request** to `http://localhost:5010/api/posts`
2. **Select Body → form-data**
3. **Add fields**:
   - `userId`: (get this from login response)
   - `title`: "Test Post"
   - `content`: "This is a test post"
   - `userType`: "freelancer"
   - `image`: (select file)
4. **Send** the request

---

## 📂 Database Structure

### User Schema
```javascript
{
  firstName: String,
  lastName: String,
  email: String,
  phoneNumber: String,
  password: String,
  userType: String (enum: ['client', 'freelancer'])
}
```

### Post Schema
```javascript
{
  userId: ObjectId (ref: 'User'),
  title: String,
  content: String,
  userType: String (enum: ['client', 'freelancer']),
  image: String (optional),
  createdAt: Date (default: Date.now)
}
```

---

## 🔍 Viewing Your Data

### Using MongoDB Compass

1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Select database: `swarojgar`
4. View collections:
   - `users` - All registered users
   - `posts` - All created posts

### Using MongoDB Shell

```bash
mongosh
use swarojgar
db.users.find().pretty()
db.posts.find().pretty()
```

---

## ❗ Common Issues

### "Please log in to create a post"
- **Solution**: Make sure you're logged in. The userId is saved to localStorage during login.

### Posts not appearing
- **Solution**: Check that MongoDB is running (`brew services list | grep mongodb`)

### Image not displaying
- **Solution**: Make sure the backend server is running and the `uploads/` folder exists

### CORS errors
- **Solution**: The backend already has CORS enabled. Make sure you're using `http://localhost:5010`

---

## 💡 Tips

- Always start the backend server before using the frontend
- Use the browser's Developer Tools (F12) → Console to see API responses
- Check the backend terminal for request logs
- Images are stored in the `backend/uploads/` folder

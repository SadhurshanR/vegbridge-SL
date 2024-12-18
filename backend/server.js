require('dotenv').config();  
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const connectDB = require('./config/db');  
const authRoutes = require('./routes/auth');  
const productRoutes = require('./routes/productRoutes');  
const orderRoutes = require('./routes/orderRoutes');
const GuideRoutes = require('./routes/guideRoutes');

// Initialize express app
const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,  // Allow requests from the frontend URL
    'https://res.cloudinary.com',  // Allow Cloudinary domain (if using)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Allow necessary HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'],  // Allow these headers
  credentials: true,  // Allow credentials (cookies, etc.)
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));  // Handle preflight requests

// Log CORS headers for debugging (Optional)
app.use((req, res, next) => {
  console.log('CORS Headers:', res.getHeaders()); // Log the response headers
  next();
});

app.use(bodyParser.json());  // Parse JSON request bodies

// MongoDB Connection
connectDB();

// Configure Cloudinary with your credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Ensure 'GuideImages' directory exists
const guideImagesDir = path.join(__dirname, 'GuideImages');
if (!fs.existsSync(guideImagesDir)) {
  fs.mkdirSync(guideImagesDir, { recursive: true });
}

// Serve Uploaded Files
app.use('/uploads', express.static(uploadDir));
app.use('/GuideImages', express.static(guideImagesDir));

// Use routes
app.use('/api', authRoutes);
app.use('/api/products', productRoutes); 
app.use('/api/orders', orderRoutes); 
app.use('/api/guides', GuideRoutes);

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed frontend URL: ${process.env.FRONTEND_URL}`);
});

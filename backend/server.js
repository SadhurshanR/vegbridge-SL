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
  origin: process.env.FRONTEND_URL, // Ensure this is your frontend URL (e.g., 'https://yourfrontend.com')
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // You can add more headers if necessary
  credentials: true, // Allow cookies, authorization headers, etc.
  preflightContinue: false, // Preflight requests are automatically handled by the browser
  optionsSuccessStatus: 204, // Success status for preflight requests
};

app.use(cors(corsOptions)); // Enable CORS for all routes
app.options('*', cors(corsOptions)); // Handle preflight requests globally

// Parse JSON request bodies
app.use(bodyParser.json());

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

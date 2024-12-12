const express = require('express');
const multer = require('multer');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const router = express.Router();
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const stream = require('stream');

// Multer Configuration (not needed anymore if using Cloudinary directly)
const storage = multer.memoryStorage(); // Store the file in memory instead of local storage
const upload = multer({ storage });

// Token Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Access Denied. Token is missing.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// Add a Product (POST)
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    // Destructure the incoming data from the request body
    const { name, quantity, grade, price, location, farmerName, farmerAddress, farmerEmail } = req.body;

    // Check if required fields are missing
    if (!name || !quantity || !grade || !price) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    let imageUrl = null;

    // Handle image upload to Cloudinary
    if (req.file) {
      console.log("File received:", req.file); // Log the incoming file

      // Upload image to Cloudinary
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'products',
              public_id: Date.now().toString(), // Use current timestamp for unique public_id
            },
            (error, result) => {
              if (error) {
                console.error("Cloudinary upload failed:", error);
                return reject(error);
              }
              console.log("Cloudinary upload result:", result); // Log Cloudinary upload result
              resolve(result);
            }
          );

          // Create a readable stream from the file buffer and pipe to Cloudinary upload stream
          const bufferStream = new stream.PassThrough();
          bufferStream.end(req.file.buffer);
          bufferStream.pipe(uploadStream);
        });

        // Set imageUrl to the secure URL from Cloudinary response
        imageUrl = result.secure_url;
        console.log("Image URL from Cloudinary:", imageUrl); // Log the secure URL
      } catch (error) {
        console.error("Image upload failed:", error.message);
        return res.status(500).json({ message: 'Image upload failed.' });
      }
    }

    // Check if imageUrl is still null after the upload
    if (!imageUrl && req.file) {
      console.log("Error: imageUrl is null, file upload was attempted.");
      return res.status(500).json({ message: 'Image upload failed.' });
    }

    // Create the product document
    const product = new Product({
      name,
      quantity,
      grade,
      price,
      location,
      farmerName,
      farmerAddress,
      farmerEmail,
      status: 'Pending',
      image: imageUrl, // Save the image URL in the database
      userId: req.user.userId,
    });

    // Log the product data to verify before saving
    console.log("Saving product:", product);

    // Save the product to the database
    await product.save();

    // Send success response
    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Error saving product:", error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});




// Update product status (Approve/Reject)
router.put('/:productId/status', async (req, res) => {
  const { productId } = req.params;
  const { status } = req.body; // status should be 'Approved' or 'Rejected'

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. It must be Approved or Rejected.' });
  }

  try {
    // Find product by ID and update status
    const product = await Product.findByIdAndUpdate(
      productId,
      { status: status },
      { new: true } // Return the updated product
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Get All Products (GET)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST order route
router.post('/submit-order', authenticateToken, async (req, res) => {
  try {
    const { buyerDetails, products, transportation, transportationCost, totalPrice } = req.body;

    // Check if all required fields are provided
    if (!buyerDetails || !products || !totalPrice) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Create the order
    const order = new Order({
      buyerDetails,
      products,
      transportation,
      transportationCost,
      totalPrice,
      userId: req.user.userId, // Associate order with logged-in user
    });

    await order.save();
    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error("Error placing order:", error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to get stocks for a specific farmer
router.get('/stocks/:farmerName', authenticateToken, async (req, res) => {
  const { farmerName } = req.params;
  try {
    // Fetch the products belonging to the farmer from the database
    const products = await Product.find({ farmerName, status: 'Approved' });
    if (!products || products.length === 0) {
      console.log('No products found for this farmer.');
      return res.status(404).json({ message: 'No stock found for this farmer.' });
    }

    res.json(products); // Send the products as response
  } catch (error) {
    console.error('Error fetching farmer stocks:', error);
    res.status(500).json({ message: 'Server error while fetching stocks.' });
  }
});

// Delete Product (DELETE)
router.delete('/:productId', authenticateToken, async (req, res) => {
  const { productId } = req.params;

  try {
    // Find the product by ID and ensure it belongs to the logged-in user
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Ensure the logged-in user is the owner of the product
    if (product.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    // Delete the product
    await Product.findByIdAndDelete(productId);

    // If there's an associated image, delete it from Cloudinary
    if (product.image) {
      const publicId = product.image.split('/').pop().split('.')[0]; // Extract the public ID from the Cloudinary URL
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.error("Error deleting image from Cloudinary:", error);
        } else {
          console.log("Image deleted from Cloudinary:", result);
        }
      });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

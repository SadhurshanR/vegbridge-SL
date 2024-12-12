const express = require('express');
const router = express.Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const stream = require('stream');
const Guide = require('../models/Guides');

// Cloudinary configuration (make sure you have set up your Cloudinary credentials)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer storage configuration for file upload
const storage = multer.memoryStorage(); // Store the file in memory
const upload = multer({ storage: storage });

const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Access Denied. Token is missing.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// Add a Guide (POST)
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    // Destructure the incoming data from the request body
    const { title, url, type } = req.body;

    // Check if required fields are missing
    if (!title || !url || !type) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    let imageUrl = null;

    // Handle image upload to Cloudinary
    if (req.file) {
      console.log("File received:", req.file); // Log the incoming file

      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'guides',
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

          const bufferStream = new stream.PassThrough();
          bufferStream.end(req.file.buffer);
          bufferStream.pipe(uploadStream);
        });

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

    // Create the guide document
    const guide = new Guide({
      title,
      url,
      type,
      image: imageUrl, // Save the image URL in the database
    });

    console.log("Saving guide:", guide); // Log the guide data before saving

    // Save the guide to the database
    await guide.save();

    res.status(201).json({ message: "Guide added successfully", guide });
  } catch (error) {
    console.error("Error saving guide:", error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete Guide (DELETE)
router.delete('/:guideId', authenticateToken, async (req, res) => {
  const { guideId } = req.params;

  try {
    // Find the guide by ID
    const guide = await Guide.findById(guideId);

    if (!guide) {
      return res.status(404).json({ message: 'Guide not found' });
    }

    // Delete the guide
    await Guide.findByIdAndDelete(guideId);

    if (guide.image) {
      // Extract the publicId from the image URL
      const urlParts = guide.image.split('/');
      const publicId = urlParts.slice(-2).join('/').split('.')[0]; // Extract folder and file name without extension
    
      console.log("Extracted publicId:", publicId);
    
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.error('Error deleting image from Cloudinary:', error);
        } else {
          console.log('Image deleted from Cloudinary:', result);
        }
      });
    }
    

    res.status(200).json({ message: 'Guide deleted successfully' });
  } catch (error) {
    console.error('Error deleting guide:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



router.get('/:type', async (req, res) => {
  try {
    const guides = await Guide.find({ type: req.params.type });
    res.json(guides);
  } catch (error) {
    console.error('Error fetching guides:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

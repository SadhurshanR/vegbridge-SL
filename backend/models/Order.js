const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerDetails: {
    name: String,
    email: String,
    address: String,
    location: String,
  },
  farmers: [
    {
      farmerDetails: {
        farmerName: String,
        farmerEmail: String,
        farmerAddress: String,
        location: String,
      },
      products: [
        {
          productId: String,
          name: String,
          quantity: Number,
          price: Number,
          grade: String,
          image: String,
        },
      ],
    },
  ],
  transportation: String,
  transportationCost: Number,
  totalPrice: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  createdAt: { type: Date, default: Date.now },
  paymentDetails: {
    paymentId: String, // Store PayPal transaction ID
    paymentMethod: String, // Store payment method (e.g., PayPal)
    paymentDate: Date, // Store the payment date
    amount: Number, // Store the payment amount
    paymentStatus: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  },
});

module.exports = mongoose.model('Order', orderSchema);

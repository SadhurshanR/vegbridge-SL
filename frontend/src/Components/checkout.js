import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useCartContext } from "./CartContext";
import PayPalPayment from "./PayPalPayment";

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cartItems = useMemo(() => location.state?.cartItems || [], [location.state?.cartItems]);

  const [transportation, setTransportation] = useState("Pick-up");
  const [transportationCost, setTransportationCost] = useState(0);
  const [buyerDetails, setBuyerDetails] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const apiURL = process.env.REACT_APP_API_NAME;

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userDetails"));
    if (!user) {
      setError("You must be logged in.");
      return;
    }
    const { name, city, address, email, id } = user;
    setBuyerDetails({ name, city, address, email, id });
  }, []);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.selectedQuantity, 0);
  };

  const calculateFinalTotal = () => calculateTotal() + transportationCost;

  const handleTransportationChange = (e) => {
    const option = e.target.value;
    setTransportation(option);
    setTransportationCost(option === "Delivery" ? 350 : 0);
  };

  const groupedItems = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      (acc[item.farmerId] = acc[item.farmerId] || []).push(item);
      return acc;
    }, {});
  }, [cartItems]);

  const { clearCart } = useCartContext();

  const handlePaymentSuccess = async (details) => {
    try {
      console.log("Payment Details:", details); // Debugging all payment details
  
      const paymentId = details.paymentId; // Corrected field
      const paymentStatus = details.paymentStatus; // Corrected field
      const paymentAmount = totalInUSD;
  
      console.log("Payment ID:", paymentId); // Check if paymentId exists
      console.log("Payment Status:", paymentStatus); // Verify payment status
      console.log("Payment Amount (USD):", paymentAmount); // Check calculated amount
  
      if (!buyerDetails) {
        console.error("Buyer details missing:", buyerDetails);
        setError("Buyer details are missing.");
        return;
      }
  
      if (!cartItems.length) {
        console.error("Cart items are empty:", cartItems);
        setError("Cart is empty.");
        return;
      }
  
      if (!paymentId) {
        console.error("Payment ID is missing.");
        setError("Payment ID is missing.");
        return;
      }
  
      const farmers = Object.keys(groupedItems).map((farmerId) => ({
        farmerDetails: {
          farmerId,
          farmerName: groupedItems[farmerId][0].farmerName,
          farmerEmail: groupedItems[farmerId][0].farmerEmail,
          farmerAddress: groupedItems[farmerId][0].farmerAddress,
          location: groupedItems[farmerId][0].location,
        },
        products: groupedItems[farmerId].map((item) => ({
          productId: item.id,
          name: item.name,
          quantity: item.selectedQuantity,
          price: item.price,
          grade: item.grade,
          image: item.image,
        })),
      }));
   
      const orderData = {
        buyerDetails,
        farmers,
        transportation,
        transportationCost,
        totalPrice: calculateFinalTotal(),
        userId: buyerDetails.id,
        paymentDetails: {
          paymentId,
          paymentMethod: "PayPal",
          paymentDate: new Date(),
          amount: paymentAmount,
          paymentStatus,
        },
      };
  
      console.log("Order Data:", orderData);
  
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${apiURL}/api/orders/payment-success`,
        { orderDetails: orderData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      console.log("Order placed successfully:", response.data);
      clearCart();
      navigate("/business-marketplace");
    } catch (err) {
      console.error("Error placing order:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Error placing order.");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePaymentCancel = (details) => {
    handlePaymentCancel(details, "cancel"); // If payment is canceled
  };

  const totalInUSD = Number((calculateFinalTotal() / 300).toFixed(2));

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mt-5 p-3">
      <br />
      <br />
      <br />
      <div className="row">
        <div className="col-md-8">
          <div className="card shadow p-4 mb-4">
            <h5 className="mb-4">Buyer Information</h5>
            {error && <p className="text-danger">{error}</p>}
            {buyerDetails ? (
              <>
                <p><strong>Name:</strong> {buyerDetails.name}</p>
                <p><strong>Email:</strong> {buyerDetails.email}</p>
                <p><strong>Address:</strong> {buyerDetails.address}, {buyerDetails.city}</p>
              </>
            ) : (
              <p>Loading buyer details...</p>
            )}
          </div>

          <div className="card shadow p-4 mb-4">
            <h5 className="mb-4">Cart Items</h5>
            {cartItems.length === 0 ? (
              <p>Your cart is empty!</p>
            ) : (
              Object.keys(groupedItems).map((farmerId, index) => (
                <div key={index}>
                  <h6><strong>Farmer Information</strong></h6>
                  <p><strong>Name:</strong> {groupedItems[farmerId][0].farmerName}</p>
                  <p><strong>Email:</strong> {groupedItems[farmerId][0].farmerEmail}</p>
                  <p><strong>Address:</strong> {groupedItems[farmerId][0].farmerAddress}</p>
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Product Image</th>
                          <th>Product Name</th>
                          <th>Quantity</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedItems[farmerId].map((item) => (
                          <tr key={item.id}>
                            <td>
                              <img src={`${item.image}`} alt={item.name} width="50" />
                            </td>
                            <td>{item.name}</td>
                            <td>{item.selectedQuantity}</td>
                            <td>{item.price}</td>
                            <td>{(item.price * item.selectedQuantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow p-4 mb-4">
            <h5 className="mb-4">Shipping & Payment</h5>
            <div className="mb-3">
              <label htmlFor="transportation" className="form-label">
                Transportation
              </label>
              <select
                id="transportation"
                className="form-select"
                value={transportation}
                onChange={handleTransportationChange}
              >
                <option value="Pick-up">Pick-up</option>
                <option value="Delivery">Delivery</option>
              </select>
            </div>
            <p><strong>Transportation Cost:</strong> LKR {transportationCost}</p>
            <p><strong>Total Price (LKR):</strong> LKR {calculateFinalTotal().toFixed(2)}</p>
            <p><strong>Total Price (USD):</strong> ${totalInUSD}</p>
            <PayPalPayment
              totalUSD={parseFloat(totalInUSD)}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentCancel={handlePaymentCancel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

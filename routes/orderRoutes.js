

// routes/orderRoutes.js
import express from 'express';
import { Order } from '../models/orderModel.js';

const router = express.Router();

// Create Order route
router.post('/create', async (req, res) => {
 const { userEmail, items, totalAmount } = req.body;

 try {
  const newOrder = new Order({ userEmail, items, totalAmount });
  await newOrder.save();
  res.status(201).json({ message: "Order created successfully", order: newOrder });
 } catch (error) {
  console.error("Error creating order:", error);
  res.status(500).json({ message: "Server error", error });
 }
});

// Fetch Orders by User Email
router.get('/:email', async (req, res) => {
 const { email } = req.params;

 try {
  const orders = await Order.find({ userEmail: email }).populate('items.productId', 'name image'); // Populate product details
  res.status(200).json(orders);
 } catch (error) {
  console.error("Error fetching orders:", error);
  res.status(500).json({ message: "Server error" });
 }
});

// Update Order Status to Cancelled
router.patch('/cancel/:orderId', async (req, res) => {
 const { orderId } = req.params;
 try {
  const updatedOrder = await Order.findByIdAndUpdate(
   orderId,
   { status: 'Cancelled' },
   { new: true } // Return the updated document
  );
  if (!updatedOrder) {
   return res.status(404).json({ message: 'Order not found' });
  }
  res.status(200).json({ message: 'Order cancelled successfully', order: updatedOrder });
 } catch (error) {
  console.error('Error cancelling order:', error);
  res.status(500).json({ message: 'Server error', error });
 }
});

export default router;


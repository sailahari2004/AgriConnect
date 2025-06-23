// models/orderModel.js
import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
 userEmail: { type: String, required: true },
 items: [
  {
   productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
   quantity: { type: Number, required: true },
   price: { type: Number, required: true },
  }
 ],
 totalAmount: { type: Number, required: true },
 orderDate: { type: Date, default: Date.now },
 status: { type: String, default: 'Shipped' } // e.g., Pending, Completed, Cancelled
});

export const Order = mongoose.model('Order', OrderSchema);
// backend/utils/orderStatusUpdate.js
import mongoose from 'mongoose';
import { Order } from '../models/orderModel.js';

const updateDeliveredOrders = async () => {
 try {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  threeDaysAgo.setHours(0, 0, 0, 0); // Set time to the beginning of the day for accurate comparison

  const updatedOrders = await Order.updateMany(
   {
    orderDate: { $lte: threeDaysAgo },
    status: { $ne: 'Cancelled' },
    status: { $ne: 'Delivered' }, // Ensure it's not already delivered
   },
   { $set: { status: 'Delivered' } }
  );

  console.log(`${updatedOrders.modifiedCount} orders updated to Delivered.`);
 } catch (error) {
  console.error('Error updating order statuses:', error);
 }
};

export { updateDeliveredOrders };
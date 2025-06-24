// cartModel.js
import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true }, // Ensure this references the correct model
    quantity: { type: Number, default: 1 },
});

export const cartModel = mongoose.model('cart', cartSchema);

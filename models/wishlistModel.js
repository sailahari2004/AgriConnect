import mongoose from "mongoose";

const WishlistSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
  addedAt: { type: Date, default: Date.now }
});

export const Wishlist = mongoose.model("wishlist", WishlistSchema);
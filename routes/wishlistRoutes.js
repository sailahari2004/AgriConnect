import express from "express";
import { Wishlist } from "../models/wishlistModel.js";

const router = express.Router();

// ✅ Add product to wishlist
router.post("/add", async (req, res) => {
  const { userEmail, productId } = req.body;
  console.log("📩 Received request to add wishlist:", { userEmail, productId });

  if (!userEmail || !productId) {
    console.log("❌ Missing required fields:", { userEmail, productId });
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const existingItem = await Wishlist.findOne({ userEmail, productId });
    if (existingItem) {
      console.log("⚠️ Item already in wishlist:", existingItem);
      return res.status(400).json({ message: "Product is already in wishlist" });
    }

    const newWishlistItem = new Wishlist({ userEmail, productId });
    const savedItem = await newWishlistItem.save();
    console.log("✅ Wishlist item saved to DB:", savedItem);

    res.status(201).json({ message: "Product added to wishlist" });
  } catch (error) {
    console.error("❌ Error adding to wishlist:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Fetch user's wishlist
router.get("/:userEmail", async (req, res) => {
  const { userEmail } = req.params;

  try {
    const wishlistItems = await Wishlist.find({ userEmail }).populate("productId");
    res.json(wishlistItems);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Remove item from wishlist
router.delete("/remove", async (req, res) => {
  const { userEmail, productId } = req.body;
  console.log("🔍 Request received to remove item:", { userEmail, productId });

  if (!userEmail || !productId) {
    console.log("❌ Missing fields:", { userEmail, productId });
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const deletedItem = await Wishlist.findOneAndDelete({ userEmail, productId });

    if (!deletedItem) {
      console.log("⚠️ Item not found in wishlist:", { userEmail, productId });
      return res.status(404).json({ message: "Item not found in wishlist" });
    }

    console.log("✅ Successfully removed from wishlist:", deletedItem);
    res.json({ message: "Product removed from wishlist" });
  } catch (error) {
    console.error("❌ Error removing from wishlist:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
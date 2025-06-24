// cartRoutes.js
import express from 'express';
import cartModel from '../models/cartModel.js'; // Adjust the path as necessary

const router = express.Router();

// Add to Cart route
router.post('/add', async (req, res) => {
    const { userEmail, productId } = req.body;

    try {
        const existingCartItem = await cartModel.findOne({ userEmail, productId });

        if (existingCartItem) {
            existingCartItem.quantity += 1;
            await existingCartItem.save();
            return res.status(200).json({ message: "Cart item quantity updated" });
        }

        const newCartItem = new cartModel({ userEmail, productId });
        await newCartItem.save();

        res.status(201).json({ message: "Item added to cart" });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Server error", error });
    }
});


// Get Cart Items route
router.get('/:userEmail', async (req, res) => {
    try {
        const cartItems = await cartModel.find({ userEmail: req.params.userEmail }).populate('productId');
        res.status(200).json(cartItems);
    } catch (error) {
        console.error("Error fetching cart items:", error);
        res.status(500).json({ message: "Server error", error });
    }
});


// Remove from Cart route
router.delete('/remove', async (req, res) => {
  const { userEmail, cartItemId } = req.body;

  try {
    const result = await cartModel.deleteOne({ _id: cartItemId, userEmail });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    res.status(200).json({ message: "Item removed from cart" });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;





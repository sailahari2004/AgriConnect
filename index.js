import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();  
import Stripe from "stripe";
import wishlistRoutes from "./routes/wishlistRoutes.js";
//import cartRoutes from "./routes/cartRoutes.js";
import bcrypt from 'bcryptjs';



import cartRoutes from "./routes/cartRoutes.js"; // Adjust the path as necessary

import orderRoutes from './routes/orderRoutes.js';
import { updateDeliveredOrders } from './utils/orderStatusUpdate.js';
import cron from 'node-cron';








const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);
//app.use("/cart", cartRoutes);

app.use("/orders", orderRoutes);
const PORT = process.env.PORT || 8000;



mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.log("Database Connection Error:", err));

const userSchema = mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  confirmPassword: String,
  contactNumber: String,
  address: String,
  userType: String,
  image: String,
  
});

const userModel = mongoose.model("user", userSchema);

app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (await userModel.findOne({ email })) {
      return res.status(409).json({ message: "Email is already registered", alert: false });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create a new user with the hashed password
    const newUser  = new userModel({ ...req.body, password: hashedPassword });
    await newUser .save();
    
    res.status(201).json({ message: "Registration Successful", alert: true });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Server Error", error });
  }
});

//login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User  not found", alert: false });
    }

    // Compare the entered password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password", alert: false });
    }

    const { _id, firstName, lastName, contactNumber, address, userType, image } = user;
    res.status(200).json({ message: "Login successful", alert: true, data: { _id, firstName, lastName, email, contactNumber, address, userType, image } });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error", alert: false });
  }
});



app.post("/resetpassword", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and confirmPassword fields
    user.password = hashedPassword;
    user.confirmPassword = hashedPassword; // Ensure old password is removed
    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error" });
  }
});


//product section

const schemaProduct = mongoose.Schema({
  name: String,
  category: String,
  image: String,
  price: String,
  description: String,
  quantity: Number, // New field for Quantity
  unitType: { // New field for unit type
    type: String,
    enum: ['per 1kg', 'per 1litre', 'per 1 unit', 'per 500g', 'per 500ml','per dozen','per 250g','per 250ml','per 100g','per 100ml','per Packet', 'other'], // Add other options as needed
  },
  sellerEmail: { type: String, required: true }, // New field for Seller Email
  contactNumber: String,
});
const productModel = mongoose.model("product",schemaProduct)


//save product in data
//api
app.post("/uploadProduct",async(req,res)=>{
  console.log(req.body)
  const data = await productModel(req.body)
  await data.save();
  res.send({message : "Upload succesful!!"})
})


//await productModel.deleteOne({ name: "Plows" });
// Delete a product by name
//
app.get("/product",async(_,res)=>{
  const data=await productModel.find({})
  res.send(JSON.stringify(data))
})


// Stripe Payment Gateway Integration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/create-checkout-session", async (req, res) => {
  try {
      const { items, email, customer_name, customer_address } = req.body;

      if (!Array.isArray(items)) {
          return res.status(400).json({ message: "Invalid items array" });
      }

      const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          billing_address_collection: "required",
          customer_email: email,
          metadata: { customer_name, customer_address },
          line_items: items.map((item) => ({
              price_data: {
                  currency: "inr",
                  product_data: { name: item.name },
                  unit_amount: item.price * 100, // Ensure price is in cents
              },
              quantity: item.qty,
          })),
          success_url: `https://guileless-cactus-648d14.netlify.app/success`,
          cancel_url: `https://guileless-cactus-648d14.netlify.app/cancel`,
      });

      res.status(200).json({ sessionId: session.id });
      console.log("Created Stripe Session ID:", session.id);
  } catch (error) {
      console.error("Payment Error:", error);
      res.status(500).json({ message: "Payment processing error", error: error.message });
  }
});
// Add to Cart route
app.post("/addToCart", async (req, res) => {
  try {
    const { userEmail, productId } = req.body;

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

// Remove from Cart route
app.delete("/removeFromCart", async (req, res) => {
  try {
    const { userEmail, productId } = req.body;
    await cartModel.deleteOne({ userEmail, productId });

    res.status(200).json({ message: "Item removed from cart" });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// Get Cart Items on Login route
app.get("/cart/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;
    const cartItems = await cartModel.find({ userEmail }).populate("productId");
    res.status(200).json(cartItems);
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).json({ message: "Server error" });
  }
});




 // Schedule the task to run once a day at midnight (adjust as needed)
 cron.schedule('0 0 * * *', async () => {
  console.log('Running daily order status update...');
  await updateDeliveredOrders();
 });


 // Edit Profile route
app.put("/editProfile/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.password && updates.password.trim() !== "") {
      updates.password = await bcrypt.hash(updates.password, 10);
      updates.confirmPassword = updates.password;
    } else {
      delete updates.password;
      delete updates.confirmPassword;
    }

    const updatedUser = await userModel.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found", alert: false });
    }

    const {
      _id,
      firstName,
      lastName,
      email,
      contactNumber,
      address,
      userType,
      image,
    } = updatedUser;

    res.status(200).json({
      message: "Profile updated successfully",
      alert: true,
      data: {
        _id,
        firstName,
        lastName,
        email,
        contactNumber,
        address,
        userType,
        image,
      },
    });
  } catch (error) {
    console.error("Edit profile error:", error);
    res.status(500).json({ message: "Server error", alert: false });
  }
});





app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import Stripe from "stripe";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import bcrypt from "bcryptjs";
import orderRoutes from './routes/orderRoutes.js';
import { updateDeliveredOrders } from './utils/orderStatusUpdate.js';
import cron from 'node-cron';
import cartModel from './models/cartModel.js'; // ✅ This will now work safely

import bodyParser from 'body-parser'; // Import body-parser
import { Order } from './models/orderModel.js'; // Ensure this path is correct
// If productModel is defined directly in index.js:
// Make sure to define schemaProduct and productModel here if they are not in a separate model file
const schemaProduct = mongoose.Schema({
    name: String,
    category: String,
    image: String,
    price: String, // Consider changing to Number for calculations
    description: String,
    quantity: Number,
    unitType: {
        type: String,
        enum: ['per 1kg', 'per 1litre', 'per 1 unit', 'per 500g', 'per 500ml','per dozen','per 250g','per 250ml','per 100g','per 100ml','per Packet', 'other'],
    },
    sellerEmail: { type: String, required: true },
    contactNumber: String,
});
const productModel = mongoose.model("product", schemaProduct);


const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log("Connected to Database"))
    .catch((err) => console.log("Database Connection Error:", err));

// User Schema and Model
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

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe Webhook Endpoint - MUST BE BEFORE express.json() or express.urlencoded()
// This uses bodyParser.raw to get the raw body needed for Stripe signature verification
app.post('/webhook', bodyParser.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Ensure this env var is set on Render

    if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is not set in environment variables.");
        return res.status(500).send("Webhook secret not configured.");
    }

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
        console.error(`❌ Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('✅ Stripe Checkout Session Completed:', session.id);

            // Retrieve data from session metadata
            const userEmail = session.metadata?.userEmail;
            const customerAddress = session.metadata?.customer_address || "No address provided";
            const customerName = session.metadata?.customer_name || "Guest";
            const paymentMode = 'Card'; // This is a card payment

            if (!userEmail) {
                console.error("User email missing in session metadata for order creation.");
                return res.status(400).send("User email missing.");
            }

            try {
                // Fetch line items from Stripe to get product details including your custom productId
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
                    expand: ['data.price.product']
                });

                const items = lineItems.data.map(item => {
                    const product = item.price.product;
                    return {
                        productId: product.metadata.productId, // This is YOUR product's DB ID from metadata
                        quantity: item.quantity,
                        price: item.price.unit_amount / 100, // Convert cents back to your currency unit
                        name: product.name
                    };
                });

                const totalAmount = session.amount_total / 100; // Total amount in your currency

                // Create the order in your database
                const newOrder = new Order({
                    userEmail: userEmail,
                    items: items,
                    totalAmount: totalAmount,
                    address: customerAddress,
                    customerName: customerName,
                    paymentMode: paymentMode,
                    stripeSessionId: session.id,
                    paymentStatus: 'Paid', // Payment is confirmed by Stripe
                    status: 'Shipped' // Default status for paid orders
                });
                await newOrder.save();
                console.log(`Order ${newOrder._id} saved to DB successfully!`);

                // OPTIONAL: Clear the user's cart in your database here
                // You would need your Cart model imported and use it here:
                // await cartModel.deleteMany({ userEmail: userEmail }); // Assuming Cart model is defined

            } catch (error) {
                console.error('🚨 Error saving order from webhook:', error);
                // In a production environment, you might want to log this error to an external service
                // or have an alert system if order creation fails after a successful payment.
            }
            break;
        // You can add more Stripe event types to handle here (e.g., 'payment_intent.succeeded', 'charge.refunded')
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({received: true});
});

// For all other routes, use express.json()
app.use(express.json({ limit: "100mb" }));
app.use(cors());

// --- Routes ---
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

// User authentication routes
app.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (await userModel.findOne({ email })) {
            return res.status(409).json({ message: "Email is already registered", alert: false });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new userModel({ ...req.body, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "Registration Successful", alert: true });
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).json({ message: "Server Error", error });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found", alert: false });
        }
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
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.confirmPassword = hashedPassword;
        await user.save();
        res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ message: "Server error" });
    }
});

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
        const updatedUser = await userModel.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found", alert: false });
        }
        const { _id, firstName, lastName, email, contactNumber, address, userType, image } = updatedUser;
        res.status(200).json({
            message: "Profile updated successfully", alert: true,
            data: { _id, firstName, lastName, email, contactNumber, address, userType, image },
        });
    } catch (error) {
        console.error("Edit profile error:", error);
        res.status(500).json({ message: "Server error", alert: false });
    }
});

// Product routes
app.post("/uploadProduct", async(req,res)=>{
    console.log(req.body);
    const data = await productModel(req.body);
    await data.save();
    res.send({message : "Upload successful!!"});
});

app.get("/product", async(_,res)=>{
    const data=await productModel.find({});
    res.send(JSON.stringify(data));
});


// Stripe Checkout Session Creation Endpoint
app.post("/create-checkout-session", async (req, res) => {
    try {
        const { items, email, customer_name, customer_address } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Invalid or empty items array" });
        }

        const line_items = items.map((item) => {
            if (!item.productId) {
                console.warn("Item missing productId in checkout request:", item);
                throw new Error("Missing product ID for Stripe checkout item.");
            }
            return {
                price_data: {
                    currency: "inr", // Ensure this matches your Stripe account currency
                    product_data: {
                        name: item.name,
                        // Pass your actual product's DB _id here in metadata
                        metadata: {
                            productId: item.productId // THIS IS CRITICAL for webhook
                        }
                    },
                    unit_amount: item.price * 100, // Ensure price is in cents
                },
                quantity: item.qty,
            };
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            billing_address_collection: "required",
            customer_email: email,
            metadata: {
                userEmail: email, // Passed for easier retrieval in webhook
                customer_name,
                customer_address,
            },
            line_items: line_items,
            success_url: `https://agriconnectecommerce.netlify.app/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://agriconnectecommerce.netlify.app/cancel`,
        });

        res.status(200).json({ sessionId: session.id });
        console.log("Created Stripe Session ID:", session.id);
    } catch (error) {
        console.error("Stripe Checkout Session Creation Error:", error);
        res.status(500).json({ message: "Payment session creation failed", error: error.message });
    }
});

// Cart routes


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

app.delete("/removeFromCart", async (req, res) => {
    try {
        const { userEmail, cartItemId } = req.body; // Expect cartItemId from frontend deleteCartItem action
        await cartModel.deleteOne({ userEmail, _id: cartItemId }); // Delete by _id of the cart item
        res.status(200).json({ message: "Item removed from cart" });
    } catch (error) {
        console.error("Error removing from cart:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

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


// Schedule cron job for order status updates
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily order status update...');
    await updateDeliveredOrders(); // Ensure this utility is correctly implemented and imported
});


// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
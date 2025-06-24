🌾 AgriConnect – Empowering Farmers Through Direct Market Access
AgriConnect is a MERN (MongoDB, Express.js, React, Node.js) stack e-commerce platform that bridges the gap between farmers and consumers by providing a direct marketplace. It enables farmers to list products, manage carts and orders, and ensures a smooth user experience with secure payment and wishlist features.

🌐 Deployment Links
🔗 Frontend: agriconnectecommerce.netlify.app

🔗 Backend: agriconnect-qkpj.onrender.com

📂 Project Structure
Backend (/backend)
Models: Mongoose models for Cart, Order, and Wishlist.

Routes: API routes for handling cart, order, and wishlist functionality.

Controllers: Logic to handle backend operations (e.g., adding to cart, placing orders).

Utils: Utility functions (e.g., token generation, error handling).

index.js: Express server setup and MongoDB connection.

Frontend (/frontend)
/src/component: Reusable components used across pages.

/src/pages: Main pages like Home, Product, Cart, Wishlist, etc.

/src/redux: Redux store setup and slices for managing app state.

/src/utility: Helper functions (e.g., image to Base64).

Tailwind CSS: Used for styling via tailwind.config.js and postcss.config.js.


🚀 Features
✅ Farmer product listing with quantity and unit types (kg, litre, etc.)
🛒 Cart and wishlist functionality
📦 Order management system
🔒 Authentication and user roles
💳 Stripe payment integration
📷 Image upload with base64 conversion
📱 Responsive UI with Tailwind CSS



🛠️ Tech Stack
Frontend: React, Redux, Tailwind CSS
Backend: Node.js, Express.js, MongoDB
Database: MongoDB Atlas
Deployment: Netlify (frontend), Render (backend)
Others: dotenv, mongoose, axios



🧑‍💻 How to Run Locally
Backend
bash
cd backend
npm install
npm start


Frontend
bash
cd frontend
npm install
npm run dev

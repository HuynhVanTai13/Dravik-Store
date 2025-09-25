// src/backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';

// Routers
import categoryRoute from './routes/category.routes.js';
import brandRoute from './routes/brand.routes.js';
import colorRoute from './routes/color.routes.js';
import sizeRoute from './routes/size.routes.js';
import productRoute from './routes/product.routes.js';

import blogRoute from './routes/blog.routes.js';
import dealRoutes from './routes/deal.routes.js';
import promotionRoute from './routes/promotion.routes.js';
import userRoute from './routes/user.routes.js';
import forgotPasswordRouter from './routes/forgotPassword.js';
import changePasswordRouter from './routes/change-password.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import favouriteRoutes from './routes/favourite.routes.js';
import commentRoutes from './routes/comment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import contactRoutes from "./routes/contact.routes.js";

import articleCategoryRoutes from './routes/articleCategory.routes.js';
import articleRoutes from './routes/article.routes.js';

import uploadRoutes from './routes/upload.routes.js';

dotenv.config();
await connectDB();

const app = express();

app.use(express.json());
app.use(
    cors({
        origin: 'http://localhost:3000',
        credentials: true,
    })
);

// Serve static /uploads → src/backend/uploads
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/categories', categoryRoute);
app.use('/api/brands', brandRoute);
app.use('/api/colors', colorRoute);
app.use('/api/sizes', sizeRoute);
app.use('/api/products', productRoute);
app.use('/api/blogs', blogRoute);
app.use('/api/deal', dealRoutes);
app.use('/api/promotion', promotionRoute);
app.use('/api/vouchers', promotionRoute);
app.use('/api/users', userRoute);
app.use('/api/forgot-password', forgotPasswordRouter);
app.use('/api/change-password', changePasswordRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/favourites', favouriteRoutes);
app.use('/api/comments', commentRoutes);
app.use("/api/contact", contactRoutes);
app.use('/api/article-categories', articleCategoryRoutes);
app.use('/api/articles', articleRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`⚙️ Server is running at http://localhost:${PORT}`);
});
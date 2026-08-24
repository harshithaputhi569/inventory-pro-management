import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import userRoutes from './routes/userRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Connect to MongoDB
connectDB();

const app = express();

// Enable trust proxy for Render / reverse proxies
app.set('trust proxy', 1);

// ─── CORS (Must be the VERY FIRST middleware) ──────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean).map((url) => url.replace(/\/$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, '');
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith('.vercel.app') ||
        process.env.NODE_ENV === 'development'
      ) {
        return callback(null, true);
      }

      // Default allow so other deployment URLs are not blocked
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false })); // Sets secure HTTP headers

// Rate limiting — max 1000 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Stricter rate limit for auth routes — max 50 per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);



// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Inventory Pro API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
});

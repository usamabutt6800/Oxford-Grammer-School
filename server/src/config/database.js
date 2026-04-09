// server/src/config/database.js
// Serverless-safe MongoDB connection with connection caching.
// Never calls process.exit() — that would kill the serverless function.

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Cache the connection across warm serverless invocations
let cachedConnection = null;

const connectDB = async () => {
  // If already connected, reuse the existing connection
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('✅ Reusing existing MongoDB connection');
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in Mongoose 7+ but kept for safety
      serverSelectionTimeoutMS: 10000, // Fail fast in serverless (10s)
      socketTimeoutMS: 45000,
    });

    cachedConnection = conn;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Safely create indexes — wrapped in try/catch so a missing
    // collection on first boot doesn't crash the whole function
    try {
      await mongoose.connection.db
        .collection('attendances')
        .createIndex({ student: 1, date: 1 }, { unique: true });
      await mongoose.connection.db
        .collection('users')
        .createIndex({ email: 1 }, { unique: true });
      await mongoose.connection.db
        .collection('students')
        .createIndex({ admissionNo: 1 }, { unique: true });
      console.log('✅ Database indexes ensured');
    } catch (indexError) {
      // Indexes may already exist — that's fine, not a fatal error
      console.warn('⚠️ Index creation warning (non-fatal):', indexError.message);
    }

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Throw the error instead of process.exit() so Vercel can return a 500
    throw error;
  }
};

export default connectDB;
// server/api/index.js
// This is the single Vercel serverless entry point for ALL backend routes.
// DO NOT create separate handler files (no login.js, no other files here).

import app from '../src/app.js';
import connectDB from '../src/config/database.js';

let isConnected = false;

export default async function handler(req, res) {
  // Ensure DB is connected before handling any request
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }

  // Let Express handle the request
  return new Promise((resolve, reject) => {
    app(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
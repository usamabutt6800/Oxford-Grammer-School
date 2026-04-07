// server/api/index.js
import app from '../src/app.js';

export default async function handler(req, res) {
    // Pass the request directly to Express
    // Vercel and Express both understand /api/v1/ routes
    await app(req, res);
}
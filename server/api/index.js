// server/api/index.js
import app from '../src/app.js';

export default async function handler(req, res) {
    // Pass the request directly to Express without any URL rewriting
    // Your Express app expects paths like /api/v1/auth/login
    // Vercel forwards the request with the same path, so no changes needed
    await app(req, res);
}
// server/api/index.js
import app from '../src/app.js';

export default async function handler(req, res) {
    // Pass the entire request object to your Express app.
    // Your Express routes are defined to handle '/api/v1/...' paths.
    await app(req, res);
}
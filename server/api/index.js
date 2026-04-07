// server/api/index.js
import app from '../src/app.js';

export default async function handler(req, res) {
    // Forward the request to your Express app
    await app(req, res);
}
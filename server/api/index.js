// server/api/index.js
import app from '../src/app.js';

export default async function handler(req, res) {
    // Vercel adds /api prefix, we need to remove it for routes to work
    if (req.url && req.url.startsWith('/api')) {
        req.url = req.url.replace('/api', '');
    }
    
    // Forward the request to your Express app
    await app(req, res);
}
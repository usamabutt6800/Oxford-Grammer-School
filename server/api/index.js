// server/api/index.js
import app from '../src/app.js';

export default async function handler(req, res) {
    // Log the incoming request URL for debugging
    console.log('Incoming request URL:', req.url);
    
    // Set the correct base URL for Express
    // Vercel adds /api prefix, so we need to ensure Express gets the full path
    if (req.url === '/' || req.url === '') {
        req.url = '/';
    }
    
    // Forward the request to Express
    return app(req, res);
}
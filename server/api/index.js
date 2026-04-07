// server/api/index.js
import app from '../src/app.js';

export default async function handler(req, res) {
    // Log for debugging
    console.log('Request:', req.method, req.url);
    
    // Set the URL to include /api prefix if needed
    // Your Express app expects /api/v1/ routes
    if (!req.url.startsWith('/api') && req.url !== '/' && req.url !== '/health') {
        req.url = '/api' + req.url;
    }
    
    // Forward to Express
    await app(req, res);
}
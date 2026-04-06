import express from 'express';
const router = express.Router();

// Placeholder for user routes
router.get('/', (req, res) => {
  res.json({ message: 'User routes' });
});

export default router;
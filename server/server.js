require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth').router;
const repoRoutes = require('./routes/repos');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow connections from all origins for testing/deployment flexibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/git-visual';
console.log('Connecting to MongoDB at:', MONGODB_URI.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connection established successfully.'))
  .catch(err => {
    console.error('MongoDB connection failure details:', err.message);
    console.log('Ensure MongoDB is running locally or a valid MONGODB_URI is provided in .env');
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/repos', repoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve frontend build static files in production if needed
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Git-Visual Express Server running on port ${PORT}`);
});

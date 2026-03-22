const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

const connectMongo = require('./config/mongo');
const mainRoutes = require('./routes/routes');

// Global error handlers - prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Note: After uncaught exception, you should ideally restart the process
});

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3001', 
    'http://localhost:3002', 
    'http://localhost:3000',
    'https://it-3105-n-repo-98sx.vercel.app',
    'https://it-3105-n-repo-sqsf.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes - mounted at root because Apache proxy already adds /api
app.use('/', mainRoutes);

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('❌ Global error handler caught:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start server with MongoDB connection
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to MongoDB first (hybrid SQL + NoSQL approach)
    await connectMongo();
    
    // Start Express server after successful MongoDB connection
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log('📊 Hybrid database system ready (MySQL + MongoDB)');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  process.exit(0);
});

startServer();

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// const connectMongo = require('../biocella-api/config/mongo');
const mainRoutes = require('./routes/routes');

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

// Connect to MongoDB - Disabled for now (only using MySQL)
// connectMongo();

// Routes - mounted at root because Apache proxy already adds /api
app.use('/', mainRoutes);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

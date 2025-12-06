const express = require('express');
const cors = require('cors');
const app = express();

const connectMongo = require('../biocella-api/config/mongo');
const mainRoutes = require('./routes/routes');

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectMongo();

// Routes
app.use('/api', mainRoutes);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

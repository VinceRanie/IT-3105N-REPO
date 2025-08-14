const express = require('express');
const cors = require('cors'); // ✅ Import cors
const app = express();

const connectMongo = require('../biocella-api/config/mongo'); 
const mainRoutes = require('../biocella-api/routes/routes');

// ✅ Enable CORS for your frontend origin
app.use(cors({
  origin: 'http://localhost:5173', // your React frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // optional, if you're restricting methods
  credentials: true // optional, only if you're using cookies/auth
}));

app.use(express.json());

connectMongo(); 

app.use('/api', mainRoutes);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

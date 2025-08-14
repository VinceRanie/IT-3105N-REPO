const express = require('express');
const router = express.Router();
const blastController = require('../controllers/blastController');


// Sub-route groups
// router.use('/users', require('./userRoutes'));
router.use('/microbials', require('./microbialRoutes'));
router.use('/projects', require('./projectRoutes'));
router.use('/morphology', require('./morphologyRoutes'));
router.use('/biochemical', require('./biochemicalRoutes'));
router.use('/genome', require('./genomeRoutes'));
router.use('/bioactivity', require('./bioactivityRoutes'));
router.use('/resource', require('./resourceRoutes'));

//Blaast
router.post('/submit', blastController.runBlast);
router.get('/result', blastController.getBlastResult);

module.exports = router;

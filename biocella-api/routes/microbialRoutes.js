const express = require('express');
const router = express.Router();
const microbialController = require('../controllers/microbialController');

router.post('/', microbialController.createMicrobial);
router.get('/', microbialController.getMicrobials);
router.get('/:id', microbialController.getMicrobialById);
router.put('/:id', microbialController.updateMicrobial);
router.delete('/:id', microbialController.deleteMicrobial);

module.exports = router;

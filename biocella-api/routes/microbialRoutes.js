const express = require('express');
const router = express.Router();
const microbialController = require('../controllers/microbialController');
const upload = require('../config/upload');

router.post('/', upload.single('image'), microbialController.createMicrobial);
router.get('/', microbialController.getMicrobials);
router.get('/:id', microbialController.getMicrobialById);
router.put('/:id', upload.single('image'), microbialController.updateMicrobial);
router.delete('/:id', microbialController.deleteMicrobial);

module.exports = router;

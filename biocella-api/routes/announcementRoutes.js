const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const upload = require('../config/upload');

router.get('/', announcementController.listAnnouncements);
router.post(
  '/',
  upload.fields([{ name: 'announcement_images', maxCount: 8 }]),
  announcementController.createAnnouncement
);

module.exports = router;
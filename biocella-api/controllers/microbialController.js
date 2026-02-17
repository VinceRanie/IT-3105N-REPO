const MicrobialInfo = require('../models/MicrobialInfo');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// CREATE
exports.createMicrobial = async (req, res) => {
  try {
    // Handle image upload if file is provided
    let image_url = req.body.image_url || '';
    if (req.file) {
      // Store relative path for the uploaded image
      image_url = `/uploads/specimens/${req.file.filename}`;
    }

    // Create specimen data
    const specimenData = {
      ...req.body,
      image_url: image_url
    };

    // Parse custom_fields if it's a string (from multipart form data)
    if (typeof specimenData.custom_fields === 'string') {
      specimenData.custom_fields = JSON.parse(specimenData.custom_fields);
    }

    const microbial = new MicrobialInfo(specimenData);
    await microbial.save();

    // Generate QR code for the specimen
    const qrData = await generateSpecimenQRCode(microbial._id);
    
    // Update specimen with QR code
    microbial.qr_code = qrData.qrCodeDataUrl;
    await microbial.save();
    
    // Populate project data before returning
    await microbial.populate('project_id');
    
    res.status(201).json({
      ...microbial.toObject(),
      qr_url: qrData.verificationUrl
    });
  } catch (err) {
    console.error(err);
    // Clean up uploaded file if there was an error
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/specimens', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ error: 'Failed to create microbial info', details: err.message });
  }
};

// GENERATE QR CODE for specimen
const generateSpecimenQRCode = async (specimenId) => {
  // Generate unique token for the specimen
  const qrToken = crypto.randomBytes(16).toString('hex');
  
  // Create public view URL (adjust based on your frontend deployment URL)
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const verificationUrl = `${baseUrl}/specimen/${specimenId}?token=${qrToken}`;
  
  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);
  
  return { qrToken, qrCodeDataUrl, verificationUrl };
};

// READ ALL
exports.getMicrobials = async (req, res) => {
  try {
    const microbials = await MicrobialInfo.find().populate('project_id');
    res.json(microbials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch microbial info' });
  }
};

// READ ONE
exports.getMicrobialById = async (req, res) => {
  try {
    const microbial = await MicrobialInfo.findById(req.params.id).populate('project_id');
    if (!microbial) return res.status(404).json({ error: 'Not found' });
    res.json(microbial);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch microbial info' });
  }
};

// UPDATE
exports.updateMicrobial = async (req, res) => {
  try {
    // Handle image upload if new file is provided
    let updateData = { ...req.body };
    
    if (req.file) {
      // Get old specimen to delete old image
      const oldSpecimen = await MicrobialInfo.findById(req.params.id);
      if (oldSpecimen && oldSpecimen.image_url && oldSpecimen.image_url.startsWith('/uploads/')) {
        const oldImagePath = path.join(__dirname, '..', oldSpecimen.image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      // Set new image path
      updateData.image_url = `/uploads/specimens/${req.file.filename}`;
    }

    // Parse custom_fields if it's a string (from multipart form data)
    if (typeof updateData.custom_fields === 'string') {
      updateData.custom_fields = JSON.parse(updateData.custom_fields);
    }

    const updated = await MicrobialInfo.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('project_id');
    
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    // Clean up uploaded file if there was an error
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/specimens', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
};

// DELETE
exports.deleteMicrobial = async (req, res) => {
  try {
    const microbial = await MicrobialInfo.findById(req.params.id);
    if (!microbial) return res.status(404).json({ error: 'Not found' });
    
    // Delete associated image if exists
    if (microbial.image_url && microbial.image_url.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '..', microbial.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await MicrobialInfo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
};

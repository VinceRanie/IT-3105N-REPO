const MicrobialInfo = require('../models/MicrobialInfo');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// CREATE
exports.createMicrobial = async (req, res) => {
  try {
    // Handle file uploads (image and FASTA)
    let image_url = req.body.image_url || '';
    let fasta_file = '';
    let fasta_sequence = '';
    
    if (req.files) {
      // Handle image upload
      if (req.files.image && req.files.image[0]) {
        image_url = `/uploads/specimens/${req.files.image[0].filename}`;
      }
      
      // Handle FASTA file upload
      if (req.files.fasta_file && req.files.fasta_file[0]) {
        fasta_file = `/uploads/fasta/${req.files.fasta_file[0].filename}`;
        
        // Read FASTA file content
        const fastaPath = path.join(__dirname, '..', fasta_file);
        fasta_sequence = fs.readFileSync(fastaPath, 'utf8');
      }
    }

    // Prepare specimen data
    const specimenData = {
      ...req.body,
      image_url: image_url,
      fasta_file: fasta_file,
      fasta_sequence: fasta_sequence
    };

    // Parse JSON fields if they're strings (from multipart form data)
    const jsonFields = ['custom_fields', 'biochemical_tests'];
    jsonFields.forEach(field => {
      if (typeof specimenData[field] === 'string') {
        try {
          specimenData[field] = JSON.parse(specimenData[field]);
        } catch (e) {
          // Leave as is if not valid JSON
        }
      }
    });

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
    // Clean up uploaded files if there was an error
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          const filePath = path.join(__dirname, '..', file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      });
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
    // Handle file uploads if new files are provided
    let updateData = { ...req.body };
    
    if (req.files) {
      const oldSpecimen = await MicrobialInfo.findById(req.params.id);
      
      // Handle new image upload
      if (req.files.image && req.files.image[0]) {
        // Delete old image if exists
        if (oldSpecimen && oldSpecimen.image_url && oldSpecimen.image_url.startsWith('/uploads/')) {
          const oldImagePath = path.join(__dirname, '..', oldSpecimen.image_url);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        updateData.image_url = `/uploads/specimens/${req.files.image[0].filename}`;
      }
      
      // Handle new FASTA file upload
      if (req.files.fasta_file && req.files.fasta_file[0]) {
        // Delete old FASTA file if exists
        if (oldSpecimen && oldSpecimen.fasta_file && oldSpecimen.fasta_file.startsWith('/uploads/')) {
          const oldFastaPath = path.join(__dirname, '..', oldSpecimen.fasta_file);
          if (fs.existsSync(oldFastaPath)) {
            fs.unlinkSync(oldFastaPath);
          }
        }
        
        updateData.fasta_file = `/uploads/fasta/${req.files.fasta_file[0].filename}`;
        
        // Read new FASTA file content
        const fastaPath = path.join(__dirname, '..', updateData.fasta_file);
        updateData.fasta_sequence = fs.readFileSync(fastaPath, 'utf8');
      }
    }

    // Parse JSON fields if they're strings (from multipart form data)
    const jsonFields = ['custom_fields', 'biochemical_tests'];
    jsonFields.forEach(field => {
      if (typeof updateData[field] === 'string') {
        try {
          updateData[field] = JSON.parse(updateData[field]);
        } catch (e) {
          // Leave as is if not valid JSON
        }
      }
    });
    
    // Update timestamp
    updateData.updated_at = Date.now();

    const updated = await MicrobialInfo.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('project_id');
    
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    // Clean up uploaded files if there was an error
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          const filePath = path.join(__dirname, '..', file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      });
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
    
    // Delete associated FASTA file if exists
    if (microbial.fasta_file && microbial.fasta_file.startsWith('/uploads/')) {
      const fastaPath = path.join(__dirname, '..', microbial.fasta_file);
      if (fs.existsSync(fastaPath)) {
        fs.unlinkSync(fastaPath);
      }
    }
    
    await MicrobialInfo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
};

// BLAST INTEGRATION

// Submit FASTA sequence to NCBI BLAST
exports.submitBlast = async (req, res) => {
  try {
    const microbial = await MicrobialInfo.findById(req.params.id);
    if (!microbial) return res.status(404).json({ error: 'Specimen not found' });
    
    if (!microbial.fasta_sequence) {
      return res.status(400).json({ error: 'No FASTA sequence available for this specimen' });
    }

    const EMAIL = process.env.EMAIL_USER || '22102959@usc.edu.ph';
    const TOOL = 'biocella-backend';

    // Submit to NCBI BLAST
    const params = new URLSearchParams({
      CMD: 'Put',
      PROGRAM: 'blastn',
      DATABASE: 'nt',
      QUERY: microbial.fasta_sequence,
      EMAIL,
      TOOL,
      HITLIST_SIZE: 10 // Get top 10 results
    });

    const submitRes = await axios.post('https://blast.ncbi.nlm.nih.gov/Blast.cgi', params);
    const ridMatch = submitRes.data.match(/RID = ([A-Z0-9]+)/);
    const rid = ridMatch ? ridMatch[1] : null;

    if (!rid) {
      return res.status(500).json({ error: 'Failed to get RID from BLAST' });
    }

    // Save RID to specimen for tracking
    microbial.blast_rid = rid;
    await microbial.save();

    console.log('BLAST submitted for specimen:', microbial.code_name, 'RID:', rid);
    
    res.json({ 
      message: 'BLAST submitted successfully',
      rid,
      status: 'pending',
      estimatedTime: '30-60 seconds'
    });

  } catch (err) {
    console.error('BLAST submission error:', err);
    res.status(500).json({ error: 'BLAST submission failed', details: err.message });
  }
};

// Get BLAST results for a specimen
exports.getBlastResults = async (req, res) => {
  try {
    const microbial = await MicrobialInfo.findById(req.params.id);
    if (!microbial) return res.status(404).json({ error: 'Specimen not found' });
    
    if (!microbial.blast_rid) {
      return res.status(400).json({ error: 'No BLAST submission found for this specimen' });
    }

    const EMAIL = process.env.EMAIL_USER || '22102959@usc.edu.ph';
    const TOOL = 'biocella-backend';

    // Check BLAST status
    const statusCheck = await axios.get('https://blast.ncbi.nlm.nih.gov/Blast.cgi', {
      params: {
        CMD: 'Get',
        FORMAT_OBJECT: 'SearchInfo',
        RID: microbial.blast_rid,
        EMAIL,
        TOOL
      }
    });

    const status = statusCheck.data.match(/Status=([A-Z]+)/);
    
    if (!status || status[1] === 'WAITING') {
      return res.json({ status: 'pending', message: 'BLAST search is still running' });
    }

    if (status[1] === 'FAILED') {
      return res.json({ status: 'failed', message: 'BLAST search failed' });
    }

    if (status[1] === 'READY') {
      // Get results
      const resultRes = await axios.get('https://blast.ncbi.nlm.nih.gov/Blast.cgi', {
        params: {
          CMD: 'Get',
          FORMAT_TYPE: 'JSON2',
          RID: microbial.blast_rid,
          EMAIL,
          TOOL
        }
      });

      // Parse and extract top 10 matches
      const results = parseBlastResults(resultRes.data);
      
      // Save results to specimen
      microbial.blast_results = results;
      if (results.topHit) {
        microbial.similarity_percent = results.topHit.similarity;
        microbial.accession_no = results.topHit.accession;
      }
      await microbial.save();

      return res.json({
        status: 'completed',
        results: results
      });
    }

    res.json({ status: 'unknown', message: 'Unable to determine BLAST status' });

  } catch (err) {
    console.error('BLAST results error:', err);
    res.status(500).json({ error: 'Failed to retrieve BLAST results', details: err.message });
  }
};

// Helper function to parse BLAST JSON results
function parseBlastResults(data) {
  try {
    const report = data.BlastOutput2[0].report;
    const results = report.results;
    
    if (!results || !results.search || !results.search.hits) {
      return { topHit: null, matches: [] };
    }

    const hits = results.search.hits.slice(0, 10); // Top 10
    
    const matches = hits.map(hit => {
      const hsp = hit.hsps[0]; // Best HSP
      const similarity = ((hsp.identity / hsp.align_len) * 100).toFixed(2);
      
      return {
        accession: hit.description[0].accession,
        title: hit.description[0].title,
        similarity: parseFloat(similarity),
        evalue: hsp.evalue,
        score: hsp.bit_score,
        identity: hsp.identity,
        alignLength: hsp.align_len
      };
    });

    return {
      topHit: matches[0] || null,
      matches: matches,
      totalHits: hits.length
    };
  } catch (err) {
    console.error('Error parsing BLAST results:', err);
    return { topHit: null, matches: [], error: 'Failed to parse results' };
  }
}

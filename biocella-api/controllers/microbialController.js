const MicrobialInfo = require('../models/MicrobialInfo');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const AdmZip = require('adm-zip');

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

    const submitRes = await axios.post('https://blast.ncbi.nlm.nih.gov/Blast.cgi', params, {
      timeout: 30000 // 30 second timeout for submission
    });
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

    let statusCheck;
    try {
      // Check BLAST status with timeout
      statusCheck = await axios.get('https://blast.ncbi.nlm.nih.gov/Blast.cgi', {
        params: {
          CMD: 'Get',
          FORMAT_OBJECT: 'SearchInfo',
          RID: microbial.blast_rid,
          EMAIL,
          TOOL
        },
        timeout: 20000 // 20 second timeout
      });
      
      console.log('BLAST status response received for RID:', microbial.blast_rid);
    } catch (axiosErr) {
      console.error('NCBI status check timeout or error:', axiosErr.message);
      return res.json({ 
        status: 'pending', 
        message: 'NCBI server is slow or unreachable. Please try again in a moment.' 
      });
    }

    const status = statusCheck.data.match(/Status=([A-Z]+)/);
    console.log('Parsed BLAST status:', status ? status[1] : 'NO_STATUS_FOUND');
    
    // Check if RID is expired or not found (NCBI returns UNKNOWN or empty status)
    if (!status) {
      console.log('No status found in NCBI response - RID likely expired:', microbial.blast_rid);
      // Check for common expired/not found messages
      if (statusCheck.data.includes('expired') || statusCheck.data.includes('not found') || statusCheck.data.includes('UNKNOWN')) {
        return res.json({ 
          status: 'expired', 
          message: 'BLAST request has expired (RIDs are valid for 24-36 hours). Please re-submit the BLAST search.' 
        });
      }
      return res.json({ status: 'pending', message: 'Unable to determine BLAST status. Please try again.' });
    }
    
    if (status[1] === 'WAITING') {
      return res.json({ status: 'pending', message: 'BLAST search is still running' });
    }

    if (status[1] === 'FAILED') {
      return res.json({ status: 'failed', message: 'BLAST search failed' });
    }

    if (status[1] === 'UNKNOWN') {
      console.log('BLAST RID status is UNKNOWN - likely expired:', microbial.blast_rid);
      return res.json({ 
        status: 'expired', 
        message: 'BLAST request not found or has expired. Please re-submit the BLAST search.' 
      });
    }

    if (status[1] === 'READY') {
      let resultRes;
      let jsonData;
      
      try {
        // Get results with timeout - NCBI may return ZIP or JSON
        resultRes = await axios.get('https://blast.ncbi.nlm.nih.gov/Blast.cgi', {
          params: {
            CMD: 'Get',
            FORMAT_TYPE: 'JSON2',
            RID: microbial.blast_rid,
            EMAIL,
            TOOL
          },
          timeout: 25000, // 25 second timeout for results (larger files)
          responseType: 'arraybuffer', // Get binary data to handle both ZIP and JSON
          headers: {
            'Accept': 'application/json, application/zip'
          }
        });
      } catch (axiosErr) {
        console.error('NCBI results fetch timeout or error:', axiosErr.message);
        return res.json({ 
          status: 'error', 
          message: 'Failed to download results from NCBI. The results are ready but the server timed out. Please try again.' 
        });
      }

      const contentType = resultRes.headers['content-type'] || '';
      console.log('BLAST results received, content type:', contentType);
      console.log('Response data type:', typeof resultRes.data);
      
      // Handle ZIP file response (NCBI sometimes returns compressed JSON)
      if (contentType.includes('application/zip') || contentType.includes('application/x-zip')) {
        console.log('Detected ZIP file response, extracting JSON...');
        try {
          const zip = new AdmZip(Buffer.from(resultRes.data));
          const zipEntries = zip.getEntries();
          
          console.log('ZIP contains', zipEntries.length, 'files');
          
          // Try to find the main results file first (e.g., RIDNUMBER_1.json)
          // NCBI structure: RIDNUMBER.json (reference file) and RIDNUMBER_1.json (actual results)
          let jsonEntry = zipEntries.find(entry => 
            entry.entryName.endsWith('_1.json') || entry.entryName.endsWith('_1.JSON')
          );
          
          // If _1.json not found, try any .json file
          if (!jsonEntry) {
            jsonEntry = zipEntries.find(entry => entry.entryName.endsWith('.json'));
          }
          
          if (!jsonEntry) {
            console.error('No JSON file found in ZIP archive');
            return res.json({ 
              status: 'error', 
              message: 'NCBI returned compressed data but no JSON found inside.' 
            });
          }
          
          console.log('Extracting JSON file:', jsonEntry.entryName);
          const jsonString = jsonEntry.getData().toString('utf8');
          jsonData = JSON.parse(jsonString);
          console.log('Successfully extracted and parsed JSON from ZIP');
          
        } catch (zipErr) {
          console.error('Error unzipping BLAST results:', zipErr);
          return res.json({ 
            status: 'error', 
            message: 'Failed to extract results from NCBI compressed file. Please try again.' 
          });
        }
      } 
      // Handle direct JSON response
      else if (contentType.includes('application/json')) {
        console.log('Detected direct JSON response');
        try {
          const jsonString = Buffer.from(resultRes.data).toString('utf8');
          jsonData = JSON.parse(jsonString);
        } catch (parseErr) {
          console.error('Error parsing JSON response:', parseErr);
          return res.json({ 
            status: 'error', 
            message: 'Failed to parse JSON response from NCBI.' 
          });
        }
      }
      // Handle string/HTML responses (errors or still processing)
      else {
        const responseString = Buffer.from(resultRes.data).toString('utf8');
        console.error('Unexpected content type:', contentType);
        console.log('First 500 chars of response:', responseString.substring(0, 500));
        
        // Check if it's still processing
        if (responseString.includes('WAITING') || responseString.includes('still being processed')) {
          return res.json({ 
            status: 'pending', 
            message: 'BLAST results are still being processed. Please wait a moment.' 
          });
        }
        
        // Check for error messages
        if (responseString.includes('error') || responseString.includes('Error')) {
          return res.json({ 
            status: 'error', 
            message: 'NCBI returned an error. The results may have expired or are unavailable.' 
          });
        }
        
        return res.json({ 
          status: 'error', 
          message: 'Invalid response format from NCBI. Please try checking results again or re-submit BLAST.' 
        });
      }

      // Validate we have valid JSON data
      if (!jsonData || typeof jsonData !== 'object') {
        console.error('BLAST results is not a valid object:', jsonData);
        return res.json({ 
          status: 'error', 
          message: 'Received invalid data structure from NCBI. Please try again.' 
        });
      }

      // Parse and extract top 10 matches
      const results = parseBlastResults(jsonData);
      
      // Check if parsing succeeded
      if (results.error) {
        console.error('Failed to parse BLAST results:', results.error);
        return res.json({ 
          status: 'error', 
          message: results.error 
        });
      }

      // Save results to specimen
      microbial.blast_results = results;
      if (results.topHit) {
        microbial.similarity_percent = results.topHit.similarity;
        microbial.accession_no = results.topHit.accession;
      }
      await microbial.save();

      console.log(`Successfully saved BLAST results for ${microbial.code_name}: ${results.matches.length} matches`);

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
    // Log the data structure for debugging
    console.log('Parsing BLAST data, type:', typeof data);
    
    // Validate data structure exists
    if (!data) {
      console.error('BLAST data is null or undefined');
      return { topHit: null, matches: [], totalHits: 0, error: 'No data received' };
    }

    // Handle different NCBI response formats
    // Some responses have BlastJSON wrapper, others have BlastOutput2 directly
    let blastData = data;
    
    if (data.BlastJSON) {
      console.log('Detected BlastJSON wrapper, extracting inner data');
      blastData = data.BlastJSON;
    }

    if (!blastData.BlastOutput2) {
      console.error('Missing BlastOutput2 in response. Data keys:', Object.keys(blastData));
      return { topHit: null, matches: [], totalHits: 0, error: 'Invalid BLAST response format' };
    }

    if (!Array.isArray(blastData.BlastOutput2) || blastData.BlastOutput2.length === 0) {
      console.error('BlastOutput2 is not an array or is empty');
      return { topHit: null, matches: [], totalHits: 0, error: 'Empty BLAST response' };
    }

    const report = blastData.BlastOutput2[0].report;
    if (!report) {
      console.error('Missing report in BlastOutput2[0]');
      return { topHit: null, matches: [], totalHits: 0, error: 'Missing report data' };
    }

    const results = report.results;
    if (!results) {
      console.error('Missing results in report');
      return { topHit: null, matches: [], totalHits: 0, error: 'Missing results data' };
    }

    if (!results.search) {
      console.error('Missing search in results');
      return { topHit: null, matches: [], totalHits: 0, error: 'Missing search data' };
    }

    if (!results.search.hits || !Array.isArray(results.search.hits) || results.search.hits.length === 0) {
      console.log('No BLAST hits found in search results');
      return { topHit: null, matches: [], totalHits: 0 };
    }

    const allHits = results.search.hits;
    const hits = allHits.slice(0, 10); // Top 10
    
    const matches = hits.map((hit, index) => {
      // Defensive checks for each hit
      if (!hit.hsps || !hit.hsps[0]) {
        console.warn(`Hit ${index} missing HSP data, skipping`);
        return null;
      }

      if (!hit.description || !hit.description[0]) {
        console.warn(`Hit ${index} missing description data, skipping`);
        return null;
      }

      const hsp = hit.hsps[0]; // Best HSP (High-scoring Segment Pair)
      const similarity = ((hsp.identity / hsp.align_len) * 100).toFixed(2);
      
      return {
        accession: hit.description[0].accession || 'Unknown',
        title: hit.description[0].title || 'No title available',
        similarity: parseFloat(similarity),
        evalue: hsp.evalue || 0,
        score: hsp.bit_score || 0,
        identity: hsp.identity || 0,
        alignLength: hsp.align_len || 0,
        queryFrom: hsp.query_from || 0,
        queryTo: hsp.query_to || 0,
        hitFrom: hsp.hit_from || 0,
        hitTo: hsp.hit_to || 0
      };
    }).filter(match => match !== null); // Remove any null entries

    console.log(`BLAST parsing complete: Found ${allHits.length} total hits, returning ${matches.length} valid matches`);
    
    return {
      topHit: matches[0] || null,
      matches: matches,
      totalHits: allHits.length
    };
  } catch (err) {
    console.error('Error parsing BLAST results:', err);
    console.error('Error stack:', err.stack);
    return { topHit: null, matches: [], totalHits: 0, error: `Failed to parse results: ${err.message}` };
  }
}

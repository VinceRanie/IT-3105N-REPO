const Appointment = require("../models/appointmentModel");

// Safely import email config - don't crash if it fails
let sendEmail;
try {
  sendEmail = require('../config/email').sendEmail;
} catch (error) {
  console.error('⚠️  Warning: Failed to load email config. Email notifications will not be sent.');
  console.error('Error details:', error.message);
  // Provide a dummy sendEmail function that doesn't crash
  sendEmail = async (options) => {
    console.warn('Email sending not available:', options.subject);
    return { messageId: 'DUMMY' };
  };
}

// CREATE
exports.create = async (req, res) => {
  try {
    // Check for schedule conflicts
    const hasConflict = await Appointment.checkScheduleConflict(req.body.date);
    if (hasConflict) {
      return res.status(409).json({ 
        error: "Schedule conflict: An appointment already exists at this time" 
      });
    }
    
    const id = await Appointment.createAppointment(req.body);
    res.status(201).json({ 
      message: "Appointment request submitted successfully", 
      appointment_id: id 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getAll = async (req, res) => {
  try {
    console.log('📋 Fetching all appointments');
    const appointments = await Appointment.getAllAppointments();
    console.log(`✅ Successfully fetched ${appointments.length} appointments`);
    res.json(appointments);
  } catch (err) {
    console.error('❌ Error fetching appointments:', err);
    res.status(500).json({ 
      error: err.message,
      message: 'Failed to fetch appointments from database',
      timestamp: new Date().toISOString()
    });
  }
};

// READ BY STATUS
exports.getByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    // Validate status parameter to prevent SQL injection and invalid queries
    const validStatuses = ['pending', 'approved', 'denied', 'ongoing', 'visited'];
    if (!validStatuses.includes(status.toLowerCase())) {
      console.warn(`⚠️ Invalid status requested: ${status}`);
      return res.status(400).json({ 
        error: 'Invalid status', 
        validStatuses: validStatuses 
      });
    }
    
    console.log(`📋 Fetching appointments with status: ${status}`);
    const appointments = await Appointment.getAppointmentsByStatus(status);
    console.log(`✅ Found ${appointments.length} appointments with status: ${status}`);
    
    res.json(appointments);
  } catch (err) {
    console.error(`❌ Error fetching appointments by status:`, err);
    res.status(500).json({ 
      error: 'Failed to fetch appointments', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

// READ ONE
exports.getById = async (req, res) => {
  try {
    const appointment = await Appointment.getAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const affected = await Appointment.updateAppointment(req.params.id, req.body);
    if (!affected) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// APPROVE APPOINTMENT
exports.approve = async (req, res) => {
  try {
    const appointment = await Appointment.getAppointmentWithUserEmail(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    
    // Format date properly
    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila'
    });
    
    // Generate QR code
    const { qrData, qrCodeDataUrl } = await Appointment.generateQRCode(req.params.id);
    
    // Update status to approved and then ongoing
    await Appointment.updateAppointmentStatus(req.params.id, 'approved', req.body.remarks);
    await Appointment.updateAppointmentStatus(req.params.id, 'ongoing');
    
    // Send email to user if email exists (but don't crash if it fails)
    if (appointment.user_email) {
      // Remove data URL prefix to get just the base64 data
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      
      sendEmail({
        to: appointment.user_email,
        subject: 'Appointment Approved - Biocella',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Your appointment has been approved!</h2>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Department:</strong> ${appointment.department}</p>
            <p><strong>Purpose:</strong> ${appointment.purpose}</p>
            <p><strong>Student ID:</strong> ${appointment.student_id}</p>
            ${req.body.remarks ? `<p><strong>Admin Remarks:</strong> ${req.body.remarks}</p>` : ''}
            <hr>
            <h3>Your QR Code:</h3>
            <p>Please present the attached QR code when you arrive at Biocella.</p>
            <p><strong>Important:</strong> Save the QR code image on your phone or print it out to show when you arrive.</p>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">QR Code ID: ${qrData}</p>
          </div>
        `,
        attachments: [
          {
            filename: `appointment-${req.params.id}-qrcode.png`,
            content: base64Data,
            encoding: 'base64',
            cid: 'qrcode'
          }
        ]
      }).catch((emailErr) => {
        console.error('📧 Email send failed (non-critical):', emailErr.message || emailErr);
        // Don't throw - email failure is not critical to appointment approval
      });
    }
    
    res.json({ 
      message: "Appointment approved", 
      qrCode: qrCodeDataUrl 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DENY APPOINTMENT
exports.deny = async (req, res) => {
  try {
    const appointment = await Appointment.getAppointmentWithUserEmail(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    
    // Format date properly
    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila'
    });
    
    const { reason } = req.body;
    await Appointment.updateAppointmentStatus(req.params.id, 'denied', reason);
    
    // Send email to user if email exists (but don't crash if it fails)
    if (appointment.user_email) {
      sendEmail({
        to: appointment.user_email,
        subject: 'Appointment Request Denied - Biocella',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f44336;">Your appointment request has been denied</h2>
            <p><strong>Requested Date:</strong> ${formattedDate}</p>
            <p><strong>Department:</strong> ${appointment.department}</p>
            <p><strong>Purpose:</strong> ${appointment.purpose}</p>
            <p><strong>Student ID:</strong> ${appointment.student_id}</p>
            <hr>
            <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
            <p>Please contact us if you have any questions or would like to reschedule.</p>
          </div>
        `
      }).catch((emailErr) => {
        console.error('📧 Email send failed (non-critical):', emailErr.message || emailErr);
        // Don't throw - email failure is not critical
      });
    }
    
    res.json({ message: "Appointment denied" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// VERIFY QR CODE (Scan QR)
exports.verifyQR = async (req, res) => {
  try {
    const { qrCode, appointmentId } = req.body;
    
    console.log('🔍 Verifying QR:', { qrCode, appointmentId });
    
    if (!qrCode) {
      return res.status(400).json({ message: "QR code is required" });
    }
    
    if (!appointmentId) {
      return res.status(400).json({ message: "Appointment ID is required" });
    }
    
    // Convert appointmentId to integer if it's a string
    const idNum = parseInt(appointmentId, 10);
    if (isNaN(idNum)) {
      return res.status(400).json({ message: "Invalid appointment ID format" });
    }
    
    // Fetch appointment and verify QR code matches
    const appointment = await Appointment.getAppointmentById(idNum);
    
    console.log('📋 Fetched appointment:', appointment);
    
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    
    // Verify QR code token matches
    if (appointment.qr_code !== qrCode) {
      console.warn('❌ QR code mismatch:', { stored: appointment.qr_code, provided: qrCode });
      return res.status(401).json({ message: "Invalid QR code" });
    }
    
    // Check if appointment is in ongoing status
    if (appointment.status !== 'ongoing') {
      console.warn('⚠️ Appointment not ongoing:', { status: appointment.status });
      return res.status(400).json({ 
        message: `Cannot verify: Appointment is ${appointment.status}. Only ongoing appointments can be marked as visited.`,
        currentStatus: appointment.status
      });
    }
    
    // Update status to visited
    await Appointment.updateAppointmentStatus(idNum, 'visited');
    console.log('✅ Status updated to visited');
    
    // Fetch updated appointment
    const updatedAppointment = await Appointment.getAppointmentById(idNum);
    
    res.json({ 
      message: "Appointment verified and marked as visited",
      appointment: updatedAppointment
    });
  } catch (err) {
    console.error('❌ QR Verification Error:', err);
    res.status(500).json({ error: err.message || "Failed to verify QR code" });
  }
};

// GET APPOINTMENT BY QR TOKEN (for verification page)
exports.getByQRToken = async (req, res) => {
  try {
    const { token, id } = req.query;
    
    const appointment = await Appointment.getAppointmentById(id);
    
    if (!appointment || appointment.qr_code !== token) {
      return res.status(404).json({ message: "Invalid QR code or appointment not found" });
    }
    
    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    const affected = await Appointment.deleteAppointment(req.params.id);
    if (!affected) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

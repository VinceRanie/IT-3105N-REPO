const Appointment = require("../models/appointmentModel");
const nodemailer = require('nodemailer');

// Email configuration (you'll need to configure this with your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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
    const appointments = await Appointment.getAllAppointments();
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    
    // Send email to user if email exists
    if (appointment.user_email) {
      try {
        // Remove data URL prefix to get just the base64 data
        const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
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
        });
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
        // Continue even if email fails
      }
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
    
    // Send email to user if email exists
    if (appointment.user_email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
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
        });
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
      }
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
    
    // Verify the token matches the appointment
    const appointment = await Appointment.getAppointmentById(appointmentId);
    
    if (!appointment || appointment.qr_code !== qrCode) {
      return res.status(404).json({ message: "Invalid QR code or appointment not found" });
    }
    
    // Check if appointment is in ongoing status
    if (appointment.status !== 'ongoing') {
      return res.status(400).json({ 
        message: `Cannot verify: Appointment is ${appointment.status}`,
        appointment 
      });
    }
    
    // Update status to visited
    await Appointment.updateAppointmentStatus(appointment.appointment_id, 'visited');
    
    res.json({ 
      message: "Appointment verified and marked as visited",
      appointment 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

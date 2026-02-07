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
    const appointments = await Appointment.getAppointmentsByStatus(status);
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    
    // Generate QR code
    const { qrData, qrCodeDataUrl } = await Appointment.generateQRCode(req.params.id);
    
    // Update status to approved and then ongoing
    await Appointment.updateAppointmentStatus(req.params.id, 'approved', req.body.remarks);
    await Appointment.updateAppointmentStatus(req.params.id, 'ongoing');
    
    // Send email to user if email exists
    if (appointment.user_email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: appointment.user_email,
        subject: 'Appointment Approved - Biocella',
        html: `
          <h2>Your appointment has been approved!</h2>
          <p><strong>Date:</strong> ${appointment.date}</p>
          <p><strong>Department:</strong> ${appointment.department}</p>
          <p><strong>Purpose:</strong> ${appointment.purpose}</p>
          <p>Please present this QR code when you arrive:</p>
          <img src="${qrCodeDataUrl}" alt="Appointment QR Code" />
        `
      });
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      // Continue even if email fails
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
          <h2>Your appointment request has been denied</h2>
          <p><strong>Requested Date:</strong> ${appointment.date}</p>
          <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
          <p>Please contact us if you have any questions.</p>
        `
      });
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
    }
    
    res.json({ message: "Appointment denied" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// VERIFY QR CODE (Scan QR)
exports.verifyQR = async (req, res) => {
  try {
    const { qrCode } = req.body;
    const appointment = await Appointment.verifyQRCode(qrCode);
    
    if (!appointment) {
      return res.status(404).json({ message: "Invalid QR code or appointment not found" });
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

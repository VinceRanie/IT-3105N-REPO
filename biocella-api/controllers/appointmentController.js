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
    console.log('[DEBUG] Create appointment - req.body:', JSON.stringify(req.body, null, 2));

    // Reject booking on dates explicitly blocked by admin/RA
    const blockedDate = await Appointment.isDateUnavailable(req.body.date);
    if (blockedDate) {
      return res.status(409).json({
        error: "Selected date is unavailable",
        unavailable: true,
        reason: blockedDate.reason || null
      });
    }
    
    // Global conflict check: no overlapping time range is allowed for any user on the same date.
    const hasConflict = await Appointment.checkScheduleConflict(req.body.date, req.body.end_time, null, null);
    if (hasConflict) {
      return res.status(409).json({ 
        error: "Schedule conflict: This time range is already occupied by another appointment"
      });
    }
    
    const id = await Appointment.createAppointment(req.body);
    res.status(201).json({ 
      message: "Appointment request submitted successfully", 
      appointment_id: id 
    });
  } catch (err) {
    console.error('[ERROR] Create appointment error:', err);
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

    // Re-check for global schedule conflicts right before approval to avoid race conditions.
    const hasConflict = await Appointment.checkScheduleConflict(
      appointment.date,
      appointment.end_time,
      appointment.appointment_id,
      null
    );

    if (hasConflict) {
      return res.status(409).json({
        message: "Cannot approve appointment due to schedule conflict with another approved/ongoing appointment."
      });
    }
    
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
    
    let appointment;
    
    // If appointmentId is provided, fetch by ID
    if (appointmentId) {
      const idNum = parseInt(appointmentId, 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ message: "Invalid appointment ID format" });
      }
      appointment = await Appointment.getAppointmentById(idNum);
      console.log('📋 Fetched appointment by ID:', appointment);
    } else {
      // Otherwise, look up by QR code token
      appointment = await Appointment.verifyQRCode(qrCode);
      console.log('📋 Fetched appointment by QR token:', appointment);
    }
    
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
    await Appointment.updateAppointmentStatus(appointment.appointment_id, 'visited');
    console.log('✅ Status updated to visited for appointment:', appointment.appointment_id);
    
    // Fetch updated appointment
    const updatedAppointment = await Appointment.getAppointmentById(appointment.appointment_id);
    
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

// GET AVAILABILITY FOR A DATE (for student calendar)
exports.getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: "Date parameter is required (YYYY-MM-DD)" });
    }
    
    const blockedDate = await Appointment.isDateUnavailable(date);

    // Time slots configuration (9 AM to 4 PM, 1-hour intervals)
    const timeSlots = [
      '09:00', '10:00', '11:00', '12:00', 
      '13:00', '14:00', '15:00', '16:00'
    ];

    // If date is blocked, all slots are unavailable and include the reason
    if (blockedDate) {
      const unavailableSlots = timeSlots.map(time => ({
        time,
        available: false,
        booked: true
      }));

      return res.json({
        date,
        unavailable: true,
        unavailableReason: blockedDate.reason || null,
        totalSlots: timeSlots.length,
        bookedCount: timeSlots.length,
        availableCount: 0,
        timeSlots: unavailableSlots
      });
    }

    // Get all appointments for this date
    const appointments = await Appointment.getAppointmentsByDate(date);
    
    // Build booked times set - mark ALL hours covered by appointment duration
    const bookedTimes = new Set();
    
    appointments.forEach(appt => {
      const startDate = new Date(appt.date);
      const endDate = appt.end_time ? new Date(appt.end_time) : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
      
      // Mark all hours from start to end as booked
      let currentHour = startDate.getHours();
      const endHour = endDate.getHours();
      
      // If end_time is exact on the hour, include that hour
      // Otherwise, mark hours up to (but not including) end hour
      const endMinute = endDate.getMinutes();
      let finalEndHour = endMinute === 0 ? endHour : endHour;
      
      while (currentHour < finalEndHour) {
        bookedTimes.add(`${String(currentHour).padStart(2, '0')}:00`);
        currentHour++;
      }
    });
    
    // Build availability status
    const availability = timeSlots.map(time => ({
      time,
      available: !bookedTimes.has(time),
      booked: !!bookedTimes.has(time)
    }));
    
    res.json({
      date,
      unavailable: false,
      unavailableReason: null,
      totalSlots: timeSlots.length,
      bookedCount: bookedTimes.size,
      availableCount: timeSlots.length - bookedTimes.size,
      timeSlots: availability
    });
  } catch (err) {
    console.error('❌ Error fetching availability:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET CALENDAR OVERVIEW (for month view)
exports.getCalendarOverview = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ message: "Month and year parameters are required" });
    }
    
    const toDateOnly = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const monthNumber = Number(month);
    const yearNumber = Number(year);
    const startDate = new Date(yearNumber, monthNumber - 1, 1);
    const endDate = new Date(yearNumber, monthNumber, 0);

    const startDateStr = toDateOnly(startDate);
    const endDateStr = toDateOnly(endDate);

    if (!startDateStr || !endDateStr) {
      return res.status(400).json({ error: "Invalid month/year values" });
    }
    
    const appointments = await Appointment.getAppointmentsByDateRange(
      startDateStr,
      endDateStr
    );
    const unavailableDates = await Appointment.getUnavailableDates(
      startDateStr,
      endDateStr
    );
    
    // Group appointments by date
    const dateStatus = {};
    appointments.forEach(appt => {
      const dateStr = toDateOnly(appt.date);
      if (!dateStr) return;

      if (!dateStatus[dateStr]) {
        dateStatus[dateStr] = { total: 0, booked: 0, available: 0 };
      }
      dateStatus[dateStr].total++;
      dateStatus[dateStr].booked++;
    });

    const blockedDateStatus = {};
    unavailableDates.forEach(item => {
      const dateStr = String(item.unavailable_date);
      blockedDateStatus[dateStr] = {
        reason: item.reason,
        unavailable: true
      };
    });
    
    res.json({
      month,
      year,
      daysWithAppointments: dateStatus,
      daysUnavailable: blockedDateStatus
    });
  } catch (err) {
    console.error('❌ Error fetching calendar overview:', err);
    res.status(500).json({ error: err.message });
  }
};

// MARK DATE AS UNAVAILABLE (Admin/RA)
exports.markDateUnavailable = async (req, res) => {
  try {
    const { date, reason, created_by_role, created_by_user_id } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required (YYYY-MM-DD)" });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const existing = await Appointment.isDateUnavailable(date);
    if (existing) {
      return res.status(409).json({
        message: "This date is already marked as unavailable",
        date,
        reason: existing.reason || null
      });
    }

    const creatorId = Number(created_by_user_id);

    await Appointment.upsertUnavailableDate({
      date,
      reason: String(reason).trim(),
      created_by_role: created_by_role || null,
      created_by_user_id: Number.isFinite(creatorId) ? creatorId : null
    });

    // Notification payload is intentionally returned for future integration.
    res.status(201).json({
      message: "Date marked as unavailable",
      unavailable: true,
      date,
      reason: String(reason).trim(),
      notificationPending: true
    });
  } catch (err) {
    console.error('❌ Error marking date unavailable:', err);
    res.status(500).json({ error: err.message });
  }
};

// LIST UNAVAILABLE DATES
exports.getUnavailableDates = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const rows = await Appointment.getUnavailableDates(startDate || null, endDate || null);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching unavailable dates:', err);
    res.status(500).json({ error: err.message });
  }
};

// REMOVE UNAVAILABLE DATE
exports.removeUnavailableDate = async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return res.status(400).json({ message: "Date parameter is required" });
    }

    const affected = await Appointment.removeUnavailableDate(date);
    if (!affected) {
      return res.status(404).json({ message: "Unavailable date not found" });
    }

    res.json({ message: "Unavailable date removed", date, notificationPending: true });
  } catch (err) {
    console.error('❌ Error removing unavailable date:', err);
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE (Mark as no-show)
exports.markNoShow = async (req, res) => {
  try {
    const affected = await Appointment.softDeleteAppointment(req.params.id);
    if (!affected) {
      return res.status(404).json({ message: "Appointment not found or already deleted" });
    }
    res.json({ message: "Appointment marked as no-show" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

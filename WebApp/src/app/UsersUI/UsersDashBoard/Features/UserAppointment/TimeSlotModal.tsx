'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import styles from './TimeSlotModal.module.css';

interface TimeSlot {
  time: string;
  available: boolean;
  booked: boolean;
}

interface TimeSlotModalProps {
  date: Date;
  availability: {
    date: string;
    unavailable?: boolean;
    unavailableReason?: string | null;
    timeSlots: TimeSlot[];
  };
  unavailableReason?: string | null;
  maxDuration: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TimeSlotModal({
  date,
  availability,
  unavailableReason,
  maxDuration,
  onClose,
  onSuccess
}: TimeSlotModalProps) {
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);

  const parseMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const toHourSlot = (time: string) => `${time.slice(0, 2)}:00`;

  const formatHourWindow = (time: string) => {
    const startMinutes = parseMinutes(time);
    const endMinutes = startMinutes + 60;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${time} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

  const availableSlots = availability.timeSlots.filter((slot) => slot.available && !slot.booked);
  const bookedHourSet = new Set(
    availability.timeSlots
      .filter((slot) => !slot.available || slot.booked)
      .map((slot) => slot.time)
  );

  const earliestStartTime = availableSlots[0]?.time || '09:00';
  const latestStartSlot = availableSlots[availableSlots.length - 1]?.time || '16:00';
  const latestStartMinutes = parseMinutes(latestStartSlot);
  const latestEndMinutes = latestStartMinutes + 60;
  const latestEndTime = `${String(Math.floor(latestEndMinutes / 60)).padStart(2, '0')}:${String(latestEndMinutes % 60).padStart(2, '0')}`;

  const isHourBooked = (time: string) => bookedHourSet.has(toHourSlot(time));

  const overlapsBookedHours = (startTime: string, endTime: string) => {
    const start = parseMinutes(startTime);
    const end = parseMinutes(endTime);
    const coveredSlots = availability.timeSlots
      .filter((slot) => {
        const slotStart = parseMinutes(slot.time);
        const slotEnd = slotStart + 60;
        return start < slotEnd && end > slotStart;
      })
      .map((slot) => slot.time);

    return coveredSlots.some((slot) => bookedHourSet.has(slot));
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      // Try to get user from localStorage first (from login session)
      // Check both 'userData' (from Login component) and 'user' as fallback
      let storedUser = localStorage.getItem('userData');
      if (!storedUser) {
        storedUser = localStorage.getItem('user');
      }

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          // Add email to user object from stored params if not present
          if (!parsed.email) {
            parsed.email = localStorage.getItem('userEmail') || '';
          }
          setUserInfo(parsed);
          console.log('[DEBUG] User loaded from localStorage:', parsed);
        } catch (e) {
          console.warn('Invalid stored user data');
        }
        return;
      }
      
      // Only try backend if localStorage is empty
      const res = await fetch('/API/users/me');
      if (res.ok) {
        const data = await res.json();
        setUserInfo(data);
        console.log('[DEBUG] User loaded from backend:', data);
      }
      // 404 or other error - proceed silently
    } catch (err) {
      console.warn('Could not fetch user info:', err);
      // Network error or timeout - proceed without user info
    }
  };

  const handleSubmit = async () => {
    if (availability.unavailable) {
      setError(unavailableReason || availability.unavailableReason || 'This date is unavailable for booking.');
      return;
    }

    if (!selectedStartTime || !selectedEndTime || !purpose) {
      setError('Please select time slot and enter purpose');
      return;
    }

    const startMinutes = parseMinutes(selectedStartTime);
    const endMinutes = parseMinutes(selectedEndTime);

    if (endMinutes <= startMinutes) {
      setError('End time must be later than start time.');
      return;
    }

    if (endMinutes - startMinutes > maxDuration * 60) {
      setError(`Maximum appointment duration is ${maxDuration} hour(s).`);
      return;
    }

    if (isHourBooked(selectedStartTime) || overlapsBookedHours(selectedStartTime, selectedEndTime)) {
      setError('Selected time overlaps with booked slot(s). Please choose another range.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const appointmentDate = `${dateStr} ${selectedStartTime}:00`;
      const appointmentEndTime = `${dateStr} ${selectedEndTime}:00`;

      // Extract student ID and user_id from available sources
      let studentId = '';
      let userId = null;
      let department = '';

      // Try userInfo first (from /API/users/me or fetched from backend)
      if (userInfo?.email) {
        studentId = userInfo.email.split('@')[0];
        userId = userInfo.userId || userInfo.user_id || null;
        department = userInfo.department || '';
      }

      // Fallback: try localStorage (both 'userData' and 'user' keys)
      if (!studentId) {
        let storedUser = localStorage.getItem('userData');
        if (!storedUser) {
          storedUser = localStorage.getItem('user');
        }

        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed.email) {
              studentId = parsed.email.split('@')[0];
            } else {
              const storedEmail = localStorage.getItem('userEmail');
              if (storedEmail) {
                studentId = storedEmail.split('@')[0];
              }
            }
            userId = parsed.userId || parsed.user_id || null;
            department = parsed.department || '';
          } catch (e) {
            console.warn('Failed to parse stored user');
            const storedEmail = localStorage.getItem('userEmail');
            if (storedEmail) {
              studentId = storedEmail.split('@')[0];
            }
          }
        }
      }

      // Final check: if still no student_id, prompt user
      if (!studentId) {
        setError('Could not identify student. Please log in and try again.');
        setLoading(false);
        return;
      }

      console.log('[DEBUG] Submitting appointment:', { studentId, userId, department, purpose, startTime: selectedStartTime, endTime: selectedEndTime });

      const response = await fetch('/API/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          student_id: studentId,
          department,
          purpose,
          date: appointmentDate,
          end_time: appointmentEndTime
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Appointment booked successfully! Your appointment ID: ' + data.appointment_id);
        onSuccess();
      } else {
        setError(data.message || 'Failed to book appointment');
      }
    } catch (err: any) {
      setError(err.message || 'Error booking appointment');
    } finally {
      setLoading(false);
    }
  };

  // Compute what will be submitted (same logic as handleSubmit)
  const getSubmissionData = () => {
    let studentId = '';
    let userId = null;
    let department = '';

    if (userInfo?.email) {
      studentId = userInfo.email.split('@')[0];
      userId = userInfo.userId || userInfo.user_id || null;
      department = userInfo.department || '';
    }

    if (!studentId) {
      // Check both 'userData' (from Login) and 'user' (fallback)
      let storedUser = localStorage.getItem('userData');
      if (!storedUser) {
        storedUser = localStorage.getItem('user');
      }

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.email) {
            studentId = parsed.email.split('@')[0];
          } else {
            // Try userEmail as fallback
            const storedEmail = localStorage.getItem('userEmail');
            if (storedEmail) {
              studentId = storedEmail.split('@')[0];
            }
          }
          userId = parsed.userId || parsed.user_id || null;
          department = parsed.department || '';
        } catch (e) {
          // Try direct email from localStorage
          const storedEmail = localStorage.getItem('userEmail');
          if (storedEmail) {
            studentId = storedEmail.split('@')[0];
          }
        }
      }
    }

    return { studentId, userId, department };
  };

  const submissionData = getSubmissionData();

  // Guard: if availability is missing, show loading state
  if (!availability || !availability.timeSlots) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading available time slots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>

        <h2>📍 Select Time Slot</h2>
        <p className={styles.dateInfo}>
          {format(date, 'EEEE, MMMM dd, yyyy')}
        </p>

        {(availability.unavailable || unavailableReason || availability.unavailableReason) && (
          <div className={styles.error}>
            This date is unavailable. {unavailableReason || availability.unavailableReason || ''}
          </div>
        )}

        <div className={styles.section}>
          <label>Start Time</label>
          <input
            type="time"
            step={60}
            min={earliestStartTime}
            max={latestStartSlot}
            value={selectedStartTime || ''}
            onChange={(e) => {
              setSelectedStartTime(e.target.value || null);
              setSelectedEndTime(null);
              setError('');
            }}
            className={styles.textarea}
          />
          <p className={styles.dateInfo}>You can select by minute. Bookable hours start at {earliestStartTime}.</p>
        </div>

        <div className={styles.section}>
          <label>End Time (Max {maxDuration} hours from start)</label>
          <input
            type="time"
            step={60}
            min={selectedStartTime || earliestStartTime}
            max={latestEndTime}
            value={selectedEndTime || ''}
            onChange={(e) => {
              setSelectedEndTime(e.target.value || null);
              setError('');
            }}
            className={styles.textarea}
            disabled={!selectedStartTime}
          />
        </div>

        {availability.timeSlots.length > 0 && (
          <div className={styles.section}>
            <label>Booked Hour Blocks</label>
            <p className={styles.dateInfo}>
              {availability.timeSlots
                .filter((slot) => slot.booked)
                .map((slot) => formatHourWindow(slot.time))
                .join(', ') || 'None'}
            </p>
          </div>
        )}

        {selectedStartTime && (
          <>
            {selectedEndTime && (
              <div className={styles.section}>
                <label>Purpose of Visit *</label>
                <textarea
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="Describe the reason for your appointment..."
                  className={styles.textarea}
                  rows={3}
                />
              </div>
            )}

            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Date:</span>
                <strong>{format(date, 'MMM dd, yyyy')}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Time:</span>
                <strong>{selectedStartTime} - {selectedEndTime || '?'}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Student ID:</span>
                <strong>{submissionData.studentId || '⚠️ Not Found'}</strong>
              </div>
              {submissionData.department && (
                <div className={styles.summaryRow}>
                  <span>Department:</span>
                  <strong>{submissionData.department}</strong>
                </div>
              )}
              {!submissionData.studentId && (
                <p style={{ color: '#e74c3c', fontSize: '12px', margin: '10px 0 0 0' }}>
                  ⚠️ Warning: Student ID could not be found. Please ensure you're logged in.
                </p>
              )}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={loading || !selectedEndTime || !purpose}
            >
              {loading ? 'Booking...' : '✓ Confirm Appointment'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

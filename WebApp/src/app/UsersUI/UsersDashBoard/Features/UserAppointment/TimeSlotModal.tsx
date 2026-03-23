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
    timeSlots: TimeSlot[];
  };
  maxDuration: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TimeSlotModal({
  date,
  availability,
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

  const getAvailableEndTimes = () => {
    if (!selectedStartTime) return [];

    const startHour = parseInt(selectedStartTime.split(':')[0]);
    const maxEndHour = startHour + maxDuration;
    const availableTimes: string[] = [];

    availability.timeSlots.forEach(slot => {
      const slotHour = parseInt(slot.time.split(':')[0]);
      if (slotHour > startHour && slotHour <= maxEndHour && slot.available) {
        availableTimes.push(slot.time);
      }
    });

    return availableTimes;
  };

  const handleSubmit = async () => {
    if (!selectedStartTime || !selectedEndTime || !purpose) {
      setError('Please select time slot and enter purpose');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const appointmentDate = `${format(date, 'yyyy-MM-dd')}T${selectedStartTime}`;
      const appointmentEndTime = `${format(date, 'yyyy-MM-dd')}T${selectedEndTime}`;

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

  const availableEndTimes = getAvailableEndTimes();

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

        {/* Timeline */}
        <div className={styles.timeline}>
          <div className={styles.timelineScroll}>
            {availability.timeSlots.map(slot => (
              <div
                key={slot.time}
                className={`${styles.timeSlot} ${
                  slot.booked ? styles.booked : styles.available
                } ${selectedStartTime === slot.time ? styles.selected : ''}`}
                onClick={() => {
                  if (!slot.booked) {
                    setSelectedStartTime(slot.time);
                    setSelectedEndTime(null);
                  }
                }}
              >
                <span className={styles.timeLabel}>{slot.time}</span>
                {slot.booked && <span className={styles.bookedBadge}>BOOKED</span>}
              </div>
            ))}
          </div>
        </div>

        {selectedStartTime && (
          <>
            <div className={styles.section}>
              <label>End Time (Max {maxDuration} hours from start)</label>
              <div className={styles.endTimeSelectionGrid}>
                {availableEndTimes.map(endTime => (
                  <button
                    key={endTime}
                    className={`${styles.endTimeBtn} ${
                      selectedEndTime === endTime ? styles.selectedEndTime : ''
                    }`}
                    onClick={() => setSelectedEndTime(endTime)}
                  >
                    {endTime}
                  </button>
                ))}
              </div>
            </div>

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

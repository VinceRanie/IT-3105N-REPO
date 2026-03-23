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
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUserInfo(JSON.parse(storedUser));
        return;
      }
      
      // Fallback: try to get from backend (silent fail if not available)
      const res = await fetch('/API/users/me');
      if (res.ok) {
        const data = await res.json();
        setUserInfo(data);
      }
      // 404 is expected if backend doesn't have /users/me - proceed without user info
    } catch (err) {
      // Silent error - user can still book without pre-filled info
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

      // Extract student ID from email or use stored value
      let studentId = '';
      if (userInfo?.email) {
        studentId = userInfo.email.split('@')[0];
      } else {
        // Try to get from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          studentId = parsed.email?.split('@')[0] || parsed.student_id || '';
        }
      }

      const response = await fetch('/API/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userInfo?.user_id || null,
          student_id: studentId,
          department: userInfo?.department || '',
          purpose,
          date: appointmentDate
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
              {userInfo && (
                <>
                  <div className={styles.summaryRow}>
                    <span>Student ID:</span>
                    <strong>{userInfo.email?.split('@')[0]}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Department:</span>
                    <strong>{userInfo.department || 'N/A'}</strong>
                  </div>
                </>
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

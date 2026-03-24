'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import jsQR from 'jsqr';
import { Check, X, QrCode, Search } from 'lucide-react';

interface Appointment {
  appointment_id: number;
  student_id: string;
  department: string;
  purpose: string;
  date: string;
  end_time: string;
  status: 'pending' | 'approved' | 'denied' | 'ongoing' | 'visited';
  qr_code: string | null;
  admin_remarks: string | null;
  denial_reason?: string | null;
}

type TabType = 'pending' | 'ongoing' | 'visited' | 'denied';

export default function RAStaffAppointmentDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, ongoing: 0, visited: 0, denied: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'deny' | 'scan'>('approve');
  const [remarks, setRemarks] = useState('');
  const [reason, setReason] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [lastVerifiedQR, setLastVerifiedQR] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tabs: { key: TabType; label: string; color: string }[] = [
    { key: 'pending', label: 'Pending', color: 'yellow' },
    { key: 'ongoing', label: 'Ongoing', color: 'blue' },
    { key: 'visited', label: 'Visited', color: 'green' },
    { key: 'denied', label: 'Denied', color: 'red' },
  ];

  // Handle camera stream when available
  useEffect(() => {
    if (!cameraStream || !cameraActive) return;

    if (!videoRef.current) {
      console.error('Video element not available');
      return;
    }

    videoRef.current.srcObject = cameraStream;

    const checkVideoReady = setInterval(() => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        clearInterval(checkVideoReady);
        const playPromise = videoRef.current!.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setTimeout(() => {
                scanQRCode();
              }, 300);
            })
            .catch(err => {
              console.error('Play error:', err);
              alert('Error playing video: ' + err.message);
              stopCamera();
            });
        }
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkVideoReady);
      if (!videoRef.current || videoRef.current.readyState < 2) {
        console.error('Video did not reach ready state');
        alert('Camera stream timeout');
        stopCamera();
      }
    }, 5000);

    return () => {
      clearInterval(checkVideoReady);
      clearTimeout(timeout);
    };
  }, [cameraStream, cameraActive]);

  useEffect(() => {
    fetchAllAppointmentsAndCount();
  }, []);

  // Auto-verify when valid appointment QR is detected
  useEffect(() => {
    if (modalType !== 'scan' || !cameraActive || !qrInput || qrInput === lastVerifiedQR) {
      return;
    }

    if (qrInput.includes('/verify-appointment?')) {
      try {
        const url = new URL(qrInput);
        const token = url.searchParams.get('token');
        const appointmentId = url.searchParams.get('id');

        if (token && appointmentId) {
          console.log('Valid appointment QR detected, auto-verifying...');
          setLastVerifiedQR(qrInput);
          autoVerifyQR(token, appointmentId);
        }
      } catch (e) {
        console.log('Not a valid URL');
      }
    }
  }, [qrInput, modalType, cameraActive]);

  useEffect(() => {
    if (allAppointments.length > 0) {
      const tabAppointments = allAppointments.filter((app: Appointment) => app.status === activeTab);
      setAppointments(tabAppointments);
      setError(null);
    }
  }, [activeTab, allAppointments]);

  const fetchAllAppointmentsAndCount = async (retries = 3) => {
    if (retries === 0) {
      setError('Failed to fetch appointments after 3 attempts');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/API/appointments`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch appointments');
      const data = await res.json();
      setAllAppointments(data);

      const counts = { pending: 0, ongoing: 0, visited: 0, denied: 0 };
      data.forEach((apt: Appointment) => {
        if (apt.status in counts) {
          counts[apt.status as keyof typeof counts]++;
        }
      });
      setStatusCounts(counts);
    } catch (err) {
      console.error('Error:', err);
      if (retries > 1) {
        setTimeout(() => fetchAllAppointmentsAndCount(retries - 1), 1000);
      } else {
        setError('Connection error. Please check your network.');
      }
    } finally {
      setLoading(false);
    }
  };

  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    const processFrame = () => {
      if (!videoRef.current || videoRef.current.readyState !== 2) {
        if (cameraActive) requestAnimationFrame(processFrame);
        return;
      }

      canvasRef.current!.width = videoRef.current.videoWidth;
      canvasRef.current!.height = videoRef.current.videoHeight;

      context.drawImage(videoRef.current, 0, 0);
      const imageData = context.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        console.log('QR Code detected:', code.data);
        setQrInput(code.data);
      }

      if (cameraActive) {
        requestAnimationFrame(processFrame);
      }
    };

    processFrame();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setQrInput('');
  };

  const autoVerifyQR = async (token: string, appointmentId: string) => {
    try {
      const response = await fetch('/API/appointments/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrCode: token,
          appointmentId: appointmentId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Auto-verified! Student:', data.appointment.student_id);
        alert(`✅ Appointment verified! Student: ${data.appointment.student_id}`);
        stopCamera();
        setShowModal(false);
        fetchAllAppointmentsAndCount();
      } else {
        console.warn('⚠️ Verification failed:', data.message);
        alert('❌ ' + (data.message || 'QR verification failed'));
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error verifying appointment');
    }
  };

  const handleApprove = async () => {
    if (!selectedAppointment) return;

    try {
      const response = await fetch(`/API/appointments/${selectedAppointment.appointment_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          remarks
        }),
      });

      if (response.ok) {
        alert('Appointment approved! Email sent to user with QR code.');
        fetchAllAppointmentsAndCount();
        setShowModal(false);
        setRemarks('');
      } else {
        alert('Failed to approve appointment');
      }
    } catch (err) {
      console.error('Error approving appointment:', err);
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to approve'));
    }
  };

  const handleDeny = async () => {
    if (!selectedAppointment) return;

    try {
      const response = await fetch(`/API/appointments/${selectedAppointment.appointment_id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: reason
        }),
      });

      if (response.ok) {
        alert('Appointment denied. Email sent to user.');
        fetchAllAppointmentsAndCount();
        setShowModal(false);
        setReason('');
      } else {
        alert('Failed to deny appointment');
      }
    } catch (err) {
      console.error('Error denying appointment:', err);
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to deny'));
    }
  };



  const getFilteredAppointments = () => {
    let filtered = appointments;

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.student_id.includes(searchTerm) ||
          a.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      denied: 'bg-red-100 text-red-800',
      ongoing: 'bg-blue-100 text-blue-800',
      visited: 'bg-purple-100 text-purple-800',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Appointment Management</h1>
        <button
          onClick={() => {
            setCameraActive(false);
            setShowModal(true);
            setModalType('scan');
            setQrInput('');
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-semibold"
        >
          📷 Scan QR Code
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-1 text-xs rounded-full font-semibold ${
              statusCounts[tab.key] > 0 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {statusCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-amber-700 font-bold text-lg">⚠️ CONNECTION WARNING</div>
            <button
              onClick={() => setError(null)}
              className="text-amber-600 hover:text-amber-800 font-semibold ml-auto"
            >
              ✕
            </button>
          </div>
          <div className="text-amber-800 mb-3">
            <p className="font-semibold mb-1">Backend API is currently unavailable or unstable</p>
            <p className="text-sm text-amber-700">
              The system attempted 3 automatic retries. Please click "Retry Now" to try again.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchAllAppointmentsAndCount()}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? '⏳ Retrying...' : '🔄 Retry Now'}
            </button>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Appointments List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="text-gray-600 font-medium">Loading appointments...</div>
            <div className="text-sm text-gray-500">If connection is unstable, it may retry automatically</div>
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No {activeTab} appointments</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <div
              key={appointment.appointment_id}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Student ID: {appointment.student_id}
                    </h3>
                    {getStatusBadge(appointment.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">Department:</span> {appointment.department}
                    </div>
                    <div>
                      <span className="font-medium">Purpose:</span> {appointment.purpose}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    📅 {format(new Date(appointment.date), 'MMM dd, yyyy hh:mm a')} - {appointment.end_time.slice(11, 16)}
                  </div>

                  {appointment.admin_remarks && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Remarks:</span> {appointment.admin_remarks}
                      </p>
                    </div>
                  )}

                  {appointment.denial_reason && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-red-600">
                        <span className="font-medium">Denial Reason:</span> {appointment.denial_reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  {activeTab === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setModalType('approve');
                          setShowModal(true);
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-semibold text-sm whitespace-nowrap"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setModalType('deny');
                          setShowModal(true);
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-semibold text-sm whitespace-nowrap"
                      >
                        ✕ Deny
                      </button>
                    </>
                  )}

                  {activeTab === 'ongoing' && (
                    <button
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setModalType('scan');
                        setShowModal(true);
                        setQrInput('');
                        setLastVerifiedQR('');
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors font-semibold text-sm whitespace-nowrap"
                    >
                      📷 Verify QR
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Approve/Deny/Scan */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {modalType === 'approve' && selectedAppointment && (
              <>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Approve Appointment</h2>
                <div className="mb-4 p-4 bg-gray-50 rounded-md text-sm">
                  <p><strong>Student:</strong> {selectedAppointment.student_id}</p>
                  <p><strong>Date:</strong> {format(new Date(selectedAppointment.date), 'MMM dd, yyyy hh:mm a')}</p>
                </div>
                
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional remarks..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {modalType === 'deny' && selectedAppointment && (
              <>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Deny Appointment</h2>
                <div className="mb-4 p-4 bg-gray-50 rounded-md text-sm">
                  <p><strong>Student:</strong> {selectedAppointment.student_id}</p>
                  <p><strong>Date:</strong> {format(new Date(selectedAppointment.date), 'MMM dd, yyyy hh:mm a')}</p>
                </div>
                
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for denial..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={handleDeny}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-semibold"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {modalType === 'scan' && (
              <>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Scan QR Code</h2>
                {!cameraActive ? (
                  <div className="space-y-4">
                    <button
                      onClick={startCamera}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 transition-colors font-semibold"
                    >
                      📷 Start Camera
                    </button>
                    <p className="text-gray-600 text-center text-sm">Or paste QR code here:</p>
                    <input
                      type="text"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder="Paste QR code content or result here"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowModal(false)}
                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative bg-black rounded-md overflow-hidden" style={{ paddingTop: '100%' }}>
                      <video
                        ref={videoRef}
                        autoPlay={true}
                        playsInline={true}
                        muted={true}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          backgroundColor: '#000',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                        }}
                      />
                    </div>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {qrInput && (
                      <div className="bg-green-100 border-l-4 border-green-600 text-green-700 p-4 rounded">
                        ✓ QR Code detected: {qrInput.substring(0, 50)}...
                      </div>
                    )}
                    <button
                      onClick={stopCamera}
                      className="w-full bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500 transition-colors font-semibold"
                    >
                      ✕ Stop Camera
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

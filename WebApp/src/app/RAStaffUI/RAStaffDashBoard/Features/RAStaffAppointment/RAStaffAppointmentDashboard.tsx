'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import jsQR from 'jsqr';
import { Check, X, QrCode, Search, Calendar } from 'lucide-react';
import { API_URL } from '@/config/api';
import { getAuthHeader, getUserData } from '@/app/utils/authUtil';

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
      const res = await fetch(`${API_URL}/appointments`, {
        headers: getAuthHeader(),
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
      const res = await fetch(`${API_URL}/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status: 'visited' }),
      });

      if (!res.ok) throw new Error('Verification failed');

      stopCamera();
      setShowModal(false);
      alert('Appointment verified successfully!');
      fetchAllAppointmentsAndCount();
    } catch (err) {
      console.error('Error:', err);
      alert('Error verifying appointment');
    }
  };

  const handleApprove = async () => {
    if (!selectedAppointment) return;

    try {
      const res = await fetch(`${API_URL}/appointments/${selectedAppointment.appointment_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status: 'approved', admin_remarks: remarks }),
      });

      if (!res.ok) throw new Error('Failed to approve');

      setShowModal(false);
      setRemarks('');
      fetchAllAppointmentsAndCount();
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to approve'));
    }
  };

  const handleDeny = async () => {
    if (!selectedAppointment) return;

    try {
      const res = await fetch(`${API_URL}/appointments/${selectedAppointment.appointment_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status: 'denied', denial_reason: reason }),
      });

      if (!res.ok) throw new Error('Failed to deny');

      setShowModal(false);
      setReason('');
      fetchAllAppointmentsAndCount();
    } catch (err) {
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

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#113F67] flex items-center gap-2">
              <Calendar className="w-8 h-8" />
              Appointment Management
            </h1>
            <p className="text-gray-600 mt-1">Manage student appointments and scan QR codes</p>
          </div>

        </div>
      </div>

      {/* Tabs with Status Counts */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 font-semibold border-b-2 transition flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-[#113F67] text-[#113F67]'
                    : 'border-transparent text-gray-600 hover:text-[#113F67]'
                }`}
              >
                {tab.label}
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-800">
                  {statusCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student ID or purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Appointments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10">Loading appointments...</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
            No appointments found
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div key={apt.appointment_id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{apt.student_id}</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {apt.department}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">Purpose: {apt.purpose}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    📅 {format(new Date(apt.date), 'MMM dd, yyyy HH:mm')} - {apt.end_time.slice(11, 16)}
                  </p>
                  {apt.admin_remarks && (
                    <p className="text-sm text-gray-600 mt-2">Remarks: {apt.admin_remarks}</p>
                  )}
                  {apt.denial_reason && (
                    <p className="text-sm text-red-600 mt-2">Reason: {apt.denial_reason}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  {activeTab === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setModalType('approve');
                          setShowModal(true);
                        }}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm whitespace-nowrap"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setModalType('deny');
                          setShowModal(true);
                        }}
                        className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 flex items-center gap-1 text-sm whitespace-nowrap"
                      >
                        <X className="w-4 h-4" />
                        Deny
                      </button>
                    </>
                  )}

                  {activeTab === 'ongoing' && (
                    <button
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setModalType('scan');
                        setShowModal(true);
                        setQrInput('');
                        setLastVerifiedQR('');
                      }}
                      className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm whitespace-nowrap"
                    >
                      <QrCode className="w-4 h-4" />
                      Scan QR
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for Approve/Deny/Scan */}
      {showModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {modalType === 'approve' && (
              <>
                <h2 className="text-2xl font-bold mb-4 text-[#113F67]">Approve Appointment</h2>
                <p className="text-gray-600 mb-4">
                  Approve appointment for <strong>{selectedAppointment.student_id}</strong>?
                </p>
                <textarea
                  placeholder="Add remarks (optional)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-4 h-24 focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {modalType === 'deny' && (
              <>
                <h2 className="text-2xl font-bold mb-4 text-[#113F67]">Deny Appointment</h2>
                <p className="text-gray-600 mb-4">
                  Deny appointment for <strong>{selectedAppointment.student_id}</strong>?
                </p>
                <textarea
                  placeholder="Reason for denial"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-4 h-24 focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  required
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDeny}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {modalType === 'scan' && (
              <>
                <h2 className="text-2xl font-bold mb-4 text-[#113F67]">Scan QR Code</h2>
                {!cameraActive ? (
                  <div className="text-center space-y-4">
                    <button
                      onClick={startCamera}
                      className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-5 h-5" />
                      Start Camera
                    </button>
                    <p className="text-gray-600 text-sm">Or scan the code manually:</p>
                    <input
                      type="text"
                      placeholder="Paste QR code URL here"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <video
                      ref={videoRef}
                      className="w-full rounded-lg bg-black"
                      style={{ maxHeight: '400px' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    {qrInput && (
                      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                        QR Code detected: {qrInput.substring(0, 50)}...
                      </div>
                    )}
                    <button
                      onClick={stopCamera}
                      className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
                    >
                      Stop Camera
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

'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import jsQR from 'jsqr';

interface Appointment {
  appointment_id: number;
  user_id: number;
  student_id: string;
  department: string;
  purpose: string;
  date: string;
  status: 'pending' | 'approved' | 'denied' | 'ongoing' | 'visited';
  qr_code: string | null;
  created_at: string;
  pending_at: string | null;
  approved_at: string | null;
  denied_at: string | null;
  ongoing_at: string | null;
  visited_at: string | null;
  denial_reason: string | null;
  admin_remarks: string | null;
}

type TabType = 'pending' | 'ongoing' | 'visited' | 'denied';

export default function AdminAppointmentDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, ongoing: 0, visited: 0, denied: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'deny' | 'scan'>('approve');
  const [remarks, setRemarks] = useState('');
  const [qrInput, setQrInput] = useState('');
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

  useEffect(() => {
    // On initial load, fetch all appointments to get status counts
    fetchAllAppointmentsAndCount();
  }, []);

  useEffect(() => {
    // When tab changes, update the displayed appointments for that tab
    if (allAppointments.length > 0) {
      const tabAppointments = allAppointments.filter((app: Appointment) => app.status === activeTab);
      setAppointments(tabAppointments);
      setError(null);
    }
  }, [activeTab, allAppointments]);

  // Retry helper with exponential backoff
  const fetchWithRetry = async (
    url: string,
    options: any = {},
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<Response> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Fetch attempt ${attempt}/${maxRetries} for ${url}`);
        const response = await fetch(url, options);
        
        if (response.ok) {
          console.log(`✅ Fetch successful on attempt ${attempt}`);
          return response;
        }
        
        // If response not ok, wait and retry
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Response not ok (status: ${response.status}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      } catch (error: any) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.log(`⚠️ Fetch attempt ${attempt} failed: ${error.message}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    // All retries failed
    if (lastError) {
      throw lastError;
    }
    
    throw new Error('All fetch attempts failed');
  };

  const fetchAllAppointmentsAndCount = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📋 Fetching all appointments for counting (with retry logic)`);
      const response = await fetchWithRetry(`/API/appointments`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }, 3, 800); // 3 retries with 800ms initial delay (exponential: 800ms, 1600ms, 3200ms)
      
      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ Error fetching appointments (${response.status}):`, error);
        const errorMessage = error.error || `HTTP error! status: ${response.status}`;
        setError(errorMessage);
        setAllAppointments([]);
        setStatusCounts({ pending: 0, ongoing: 0, visited: 0, denied: 0 });
      } else {
        const data = await response.json();
        console.log(`✅ Fetched ${data.data?.length || data.length || 0} total appointments`);
        
        const allAppts = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setAllAppointments(allAppts);
        
        // Count appointments by status
        const counts = {
          pending: allAppts.filter((app: Appointment) => app.status === 'pending').length,
          ongoing: allAppts.filter((app: Appointment) => app.status === 'ongoing').length,
          visited: allAppts.filter((app: Appointment) => app.status === 'visited').length,
          denied: allAppts.filter((app: Appointment) => app.status === 'denied').length,
        };
        
        console.log(`📊 Status counts:`, counts);
        setStatusCounts(counts);
        
        // Filter for active tab
        const tabAppointments = allAppts.filter((app: Appointment) => app.status === activeTab);
        setAppointments(tabAppointments);
        setError(null);
      }
    } catch (error: any) {
      const errorMessage = `Failed to fetch appointments: ${error.message}`;
      console.error(errorMessage);
      setError(errorMessage);
      setAllAppointments([]);
      setStatusCounts({ pending: 0, ongoing: 0, visited: 0, denied: 0 });
    } finally {
      setLoading(false);
    }
  };

  const refreshAppointmentCounts = async () => {
    // Refresh the counts after an action (approve, deny, etc.)
    try {
      const response = await fetchWithRetry(`/API/appointments`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }, 3, 800);
      
      if (response.ok) {
        const data = await response.json();
        const allAppts = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setAllAppointments(allAppts);
        
        // Recount
        const counts = {
          pending: allAppts.filter((app: Appointment) => app.status === 'pending').length,
          ongoing: allAppts.filter((app: Appointment) => app.status === 'ongoing').length,
          visited: allAppts.filter((app: Appointment) => app.status === 'visited').length,
          denied: allAppts.filter((app: Appointment) => app.status === 'denied').length,
        };
        
        setStatusCounts(counts);
        
        // Update current tab display
        const tabAppointments = allAppts.filter((app: Appointment) => app.status === activeTab);
        setAppointments(tabAppointments);
      }
    } catch (error) {
      console.error('Error refreshing appointment counts:', error);
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
        refreshAppointmentCounts();
        closeModal();
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      alert('Failed to approve appointment');
    }
  };

  const handleDeny = async () => {
    if (!selectedAppointment) return;
    
    try {
      const response = await fetch(`/API/appointments/${selectedAppointment.appointment_id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: remarks
        }),
      });

      if (response.ok) {
        alert('Appointment denied. Email sent to user.');
        refreshAppointmentCounts();
        closeModal();
      }
    } catch (error) {
      console.error('Error denying appointment:', error);
      alert('Failed to deny appointment');
    }
  };

  const handleScanQR = async () => {
    try {
      const response = await fetch('/API/appointments/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: qrInput }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Appointment verified! Student: ${data.appointment.student_id}`);
        refreshAppointmentCounts();
        closeModal();
      } else {
        alert(data.message || 'Invalid QR code');
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
      alert('Failed to verify QR code');
    }
  };

  const openModal = (appointment: Appointment, type: 'approve' | 'deny' | 'scan') => {
    setSelectedAppointment(appointment);
    setModalType(type);
    setShowModal(true);
    setRemarks('');
  };

  const closeModal = () => {
    // Stop camera when closing modal
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setShowModal(false);
    setSelectedAppointment(null);
    setRemarks('');
    setQrInput('');
  };

  const startCamera = async () => {
    try {
      console.log('📷 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: false
      });
      
      console.log('✅ Camera stream obtained:', stream.getTracks());
      
      // Store the stream in state
      setCameraStream(stream);

      // Now set the video source
      if (videoRef.current) {
        console.log('🎥 Setting stream to video element...');
        videoRef.current.srcObject = stream;
        
        // Use a more reliable method to wait for video to be ready
        const checkVideoReady = setInterval(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA = 2
            clearInterval(checkVideoReady);
            console.log('✅ Video ready state:', videoRef.current.readyState);
            
            // Now attempt to play
            const playPromise = videoRef.current!.play();
            
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log('▶️ Video playing successfully');
                  setCameraActive(true);
                  
                  // Give video a moment to stabilize
                  setTimeout(() => {
                    console.log('🔍 Starting QR code scanner...');
                    scanQRCode();
                  }, 300);
                })
                .catch(err => {
                  console.error('❌ Play error:', err);
                  alert('Error playing video: ' + err.message);
                  stopCamera();
                });
            }
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkVideoReady);
          if (!videoRef.current || videoRef.current.readyState < 2) {
            console.error('❌ Video did not reach ready state within 5 seconds');
            alert('Camera stream loading timeout');
            stopCamera();
          }
        }, 5000);
      }
    } catch (err: any) {
      const errorMsg = err.message || JSON.stringify(err);
      console.error('❌ Camera access error:', err);
      alert(`Unable to access camera: ${errorMsg}`);
      setCameraActive(false);
    }
  };

  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video) {
      console.error('❌ Video ref not available');
      return;
    }

    if (!canvas) {
      console.error('❌ Canvas ref not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Canvas context not available');
      return;
    }

    console.log('🎬 Video element state:', {
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      paused: video.paused,
      muted: video.muted
    });

    let lastDetectedCode = '';
    let frameCount = 0;

    const scanFrame = () => {
      // Use a ref-based check instead of state
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) {
        console.warn('⚠️ Video or canvas lost');
        return;
      }

      // Wait for video to have dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        frameCount++;
        if (frameCount % 20 === 0) {
          console.log(`⏳ Waiting for video dimensions... (attempt ${frameCount})`);
        }
        setTimeout(scanFrame, 50);
        return;
      }

      frameCount++;
      
      // Log once per second
      if (frameCount % 30 === 0) {
        console.log(`📹 Scanning... frame ${frameCount}, video: ${video.videoWidth}x${video.videoHeight}`);
      }

      try {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (!imageData || !imageData.data) {
          console.error('❌ Failed to get image data');
          setTimeout(scanFrame, 100);
          return;
        }

        // Scan for QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          console.log('✅ QR Code detected:', code.data);
          
          // Only update if it's a different code
          if (code.data !== lastDetectedCode) {
            lastDetectedCode = code.data;
            setQrInput(code.data);
            console.log('📝 Updated QR input: ' + code.data);
          }
        }

        // Continue scanning
        if (cameraActive) {
          requestAnimationFrame(scanFrame);
        } else {
          console.log('🛑 Camera no longer active, stopping scan');
        }
      } catch (error) {
        console.error('❌ Scan error:', error);
        if (cameraActive) {
          setTimeout(scanFrame, 100);
        }
      }
    };

    console.log('🚀 Starting scan loop...');
    scanFrame();
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Camera track stopped');
      });
      setCameraStream(null);
    }
    setCameraActive(false);
    console.log('📷 Camera stopped');
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Appointment Management</h1>
        <button
          onClick={() => {
            setCameraActive(false)
            setShowModal(true)
            setModalType('scan')
            setQrInput('')
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
              onClick={() => refreshAppointmentCounts()}
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
          {appointments.map((appointment) => (
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
                      <span className="font-medium">Date:</span>{' '}
                      {format(new Date(appointment.date), 'MMM dd, yyyy hh:mm a')}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Purpose:</span> {appointment.purpose}
                    </div>
                  </div>

                  {appointment.denial_reason && (
                    <div className="mt-2 p-3 bg-red-50 rounded-md">
                      <span className="font-medium text-red-800">Denial Reason:</span>
                      <p className="text-red-700 text-sm">{appointment.denial_reason}</p>
                    </div>
                  )}

                  {appointment.admin_remarks && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <span className="font-medium text-blue-800">Admin Remarks:</span>
                      <p className="text-blue-700 text-sm">{appointment.admin_remarks}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-4">
                  {activeTab === 'pending' && (
                    <>
                      <button
                        onClick={() => openModal(appointment, 'approve')}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openModal(appointment, 'deny')}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                      >
                        Deny
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 grid grid-cols-3 gap-2">
                {appointment.pending_at && (
                  <div>Pending: {format(new Date(appointment.pending_at), 'MMM dd, HH:mm')}</div>
                )}
                {appointment.approved_at && (
                  <div>Approved: {format(new Date(appointment.approved_at), 'MMM dd, HH:mm')}</div>
                )}
                {appointment.visited_at && (
                  <div>Visited: {format(new Date(appointment.visited_at), 'MMM dd, HH:mm')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {modalType === 'scan' && 'Scan QR Code'}
              {modalType === 'approve' && 'Approve Appointment'}
              {modalType === 'deny' && 'Deny Appointment'}
            </h2>

            {modalType === 'scan' ? (
              <div className="space-y-4">
                {!cameraActive ? (
                  <div className="space-y-3">
                    <button
                      onClick={startCamera}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold flex items-center justify-center gap-2"
                    >
                      📷 Start Camera Scanner
                    </button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or enter manually</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg flex items-start gap-2">
                      <span>👁️</span>
                      <span>Point camera at QR code. It will scan automatically.</span>
                    </div>
                    <div className="w-full bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
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
                          backgroundColor: '#000'
                        }}
                        onPlay={() => console.log('🎬 Video onPlay event fired')}
                        onLoadedMetadata={() => console.log('📊 Video onLoadedMetadata fired')}
                        onCanPlay={() => console.log('▶️ Video onCanPlay fired')}
                      />
                    </div>
                    <canvas
                      ref={canvasRef}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={stopCamera}
                      className="w-full bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors font-semibold"
                    >
                      ✕ Stop Camera
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Paste QR code content or result here"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleScanQR}
                    disabled={!qrInput || cameraActive}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    ✓ Verify
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {selectedAppointment && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-md text-sm">
                    <p><strong>Student:</strong> {selectedAppointment.student_id}</p>
                    <p><strong>Date:</strong> {format(new Date(selectedAppointment.date), 'MMM dd, yyyy hh:mm a')}</p>
                  </div>
                )}
                
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={modalType === 'deny' ? 'Reason for denial...' : 'Optional remarks...'}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={modalType === 'approve' ? handleApprove : handleDeny}
                    className={`flex-1 text-white px-4 py-2 rounded-md ${
                      modalType === 'approve' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {modalType === 'approve' ? 'Approve' : 'Deny'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

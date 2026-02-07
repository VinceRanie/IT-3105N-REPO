'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

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
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'deny' | 'scan'>('approve');
  const [remarks, setRemarks] = useState('');
  const [qrInput, setQrInput] = useState('');

  const tabs: { key: TabType; label: string; color: string }[] = [
    { key: 'pending', label: 'Pending', color: 'yellow' },
    { key: 'ongoing', label: 'Ongoing', color: 'blue' },
    { key: 'visited', label: 'Visited', color: 'green' },
    { key: 'denied', label: 'Denied', color: 'red' },
  ];

  useEffect(() => {
    fetchAppointments();
  }, [activeTab]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/API/appointments/status/${activeTab}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
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
        fetchAppointments();
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
        fetchAppointments();
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
        fetchAppointments();
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
    setShowModal(false);
    setSelectedAppointment(null);
    setRemarks('');
    setQrInput('');
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
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Scan QR Code
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
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200">
              {appointments.length}
            </span>
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
              <div>
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Enter QR code or scan"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleScanQR}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Verify
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
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

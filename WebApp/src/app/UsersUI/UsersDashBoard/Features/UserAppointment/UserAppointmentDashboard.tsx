'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { API_URL } from '@/config/api';
import { getUserData } from '@/app/utils/authUtil';

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

type TabType = 'pending' | 'approved' | 'denied' | 'visited';

export default function UserAppointmentDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ department: '', date: '', purpose: '' });
  const [userId, setUserId] = useState<number | null>(null);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved & Ongoing' },
    { key: 'denied', label: 'Denied' },
    { key: 'visited', label: 'Visited' },
  ];

  useEffect(() => {
    // Get the logged in user from auth context
    const user = getUserData();
    if (user?.userId) {
      setUserId(user.userId);
    }
    
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Assuming GET /appointments returns all, and we should just show them 
      // since the backend might filter by token later, or we can just show all for demo
      const res = await fetch(`${API_URL}/appointments`);
      const data = await res.json();
      if (data.data) {
        setAppointments(data.data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    try {
      const res = await fetch(`${API_URL}/appointments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
    if (!userId) {
      alert('User not authenticated');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/appointments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
      });
      if(res.ok) {
        setShowModal(false);
        setForm({ department: '', date: '', purpose: '' });
        fetchAppointments();
      } else {
        alert('Failed to create appointment');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'visited': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAppointments = appointments.filter(app => {
    if (activeTab === 'approved') return app.status === 'approved' || app.status === 'ongoing';
    return app.status === activeTab;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Appointments</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#113F67] text-white px-4 py-2 rounded-md hover:bg-[#0d2f4d] transition-colors"
        >
          Book Appointment
        </button>
      </div>

      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-[#113F67] text-[#113F67]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No appointments found</div>
          ) : (
            filteredAppointments.map((app) => (
              <div key={app.appointment_id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold cursor-pointer text-blue-600">
                      Appointment #{app.appointment_id}
                    </h3>
                    <p className="text-gray-600 mt-1">Date: {format(new Date(app.date), 'MMMM dd, yyyy')}</p>
                    <p className="text-gray-600">Department: {app.department}</p>
                    <p className="text-gray-600 mt-2">Purpose: {app.purpose}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                    {app.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-[#113F67]">Book Appointment</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Department"
                value={form.department}
                onChange={(e) => setForm({...form, department: e.target.value})}
                className="w-full px-4 py-2 border rounded-md"
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({...form, date: e.target.value})}
                className="w-full px-4 py-2 border rounded-md"
              />
              <textarea
                placeholder="Purpose of visit"
                value={form.purpose}
                onChange={(e) => setForm({...form, purpose: e.target.value})}
                className="w-full px-4 py-2 border rounded-md"
                rows={3}
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleBook}
                  className="flex-1 bg-[#113F67] text-white px-4 py-2 rounded-md hover:bg-[#0d2f4d]"
                >
                  Confirm Request
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Check, X, QrCode, Plus, Search, Calendar, AlertCircle } from "lucide-react";
import { API_URL } from "@/config/api";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { getAuthHeader, getUserData } from "@/app/utils/authUtil";

interface Appointment {
  appointment_id: number;
  student_id: string;
  department: string;
  purpose: string;
  date: string;
  end_time: string;
  status: "pending" | "approved" | "denied" | "ongoing" | "visited";
  qr_code: string | null;
  admin_remarks: string | null;
}

type TabType = "pending" | "approved" | "ongoing" | "visited";

export default function RAStaffAppointmentDashboard() {
  // Protect route
  useProtectedRoute({ requiredRole: "staff" });

  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"approve" | "deny" | "scan" | "add">("approve");
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Add appointment form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    student_id: "",
    department: "",
    purpose: "",
    date: "",
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/appointments`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAppointments = () => {
    let filtered = appointments.filter((a) => a.status === activeTab);

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.student_id.includes(searchTerm) ||
          a.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const handleApprove = async () => {
    if (!selectedAppointment) return;

    try {
      const res = await fetch(`${API_URL}/appointments/${selectedAppointment.appointment_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status: "approved", admin_remarks: remarks }),
      });

      if (!res.ok) throw new Error("Failed to approve");

      setShowModal(false);
      setRemarks("");
      fetchAppointments();
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : "Failed to approve"));
    }
  };

  const handleDeny = async () => {
    if (!selectedAppointment) return;

    try {
      const res = await fetch(`${API_URL}/appointments/${selectedAppointment.appointment_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status: "denied", denial_reason: reason }),
      });

      if (!res.ok) throw new Error("Failed to deny");

      setShowModal(false);
      setReason("");
      fetchAppointments();
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : "Failed to deny"));
    }
  };

  const handleAddAppointment = async () => {
    try {
      const userData = getUserData();
      const res = await fetch(`${API_URL}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          user_id: userData?.userId,
          student_id: newAppointment.student_id,
          department: newAppointment.department,
          purpose: newAppointment.purpose,
          date: newAppointment.date,
          end_time: new Date(
            new Date(newAppointment.date).getTime() + 2 * 60 * 60 * 1000
          )
            .toISOString()
            .slice(0, 19)
            .replace("T", " "),
        }),
      });

      if (!res.ok) throw new Error("Failed to add appointment");

      setShowAddModal(false);
      setNewAppointment({ student_id: "", department: "", purpose: "", date: "" });
      fetchAppointments();
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : "Failed to add appointment"));
    }
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
            <p className="text-gray-600 mt-1">Manage student appointments</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#113F67] text-white px-4 py-2 rounded-lg hover:bg-[#0d2947] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Appointment
          </button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            {(["pending", "approved", "ongoing", "visited"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-semibold border-b-2 transition ${
                  activeTab === tab
                    ? "border-[#113F67] text-[#113F67]"
                    : "border-transparent text-gray-600 hover:text-[#113F67]"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                    📅 {format(new Date(apt.date), "MMM dd, yyyy HH:mm")} - {apt.end_time.slice(11, 16)}
                  </p>
                  {apt.admin_remarks && (
                    <p className="text-sm text-gray-600 mt-2">Remarks: {apt.admin_remarks}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  {activeTab === "pending" && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setModalType("approve");
                          setShowModal(true);
                        }}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setModalType("deny");
                          setShowModal(true);
                        }}
                        className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 flex items-center gap-1 text-sm"
                      >
                        <X className="w-4 h-4" />
                        Deny
                      </button>
                    </>
                  )}

                  {activeTab === "approved" && (
                    <button
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setModalType("scan");
                        setShowModal(true);
                        setShowCamera(true);
                      }}
                      className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            {modalType === "approve" && (
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

            {modalType === "deny" && (
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

            {modalType === "scan" && (
              <>
                <h2 className="text-2xl font-bold mb-4 text-[#113F67]">Scan QR Code</h2>
                {selectedAppointment.qr_code ? (
                  <div className="text-center">
                    <img
                      src={`data:image/png;base64,${selectedAppointment.qr_code}`}
                      alt="QR Code"
                      className="mx-auto mb-4"
                    />
                    <p className="text-green-600 font-semibold mb-4">✓ QR Code Available</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
                    <p className="text-gray-600">No QR code generated yet</p>
                  </div>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 mt-4"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-[#113F67]">Add Appointment</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Student ID"
                value={newAppointment.student_id}
                onChange={(e) =>
                  setNewAppointment({ ...newAppointment, student_id: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              />
              <input
                type="text"
                placeholder="Department"
                value={newAppointment.department}
                onChange={(e) =>
                  setNewAppointment({ ...newAppointment, department: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              />
              <input
                type="text"
                placeholder="Purpose"
                value={newAppointment.purpose}
                onChange={(e) =>
                  setNewAppointment({ ...newAppointment, purpose: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              />
              <input
                type="datetime-local"
                value={newAppointment.date}
                onChange={(e) =>
                  setNewAppointment({
                    ...newAppointment,
                    date: new Date(e.target.value).toISOString().slice(0, 19).replace("T", " "),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              />
            </div>
            <div className="flex gap-3 pt-6">
              <button
                onClick={handleAddAppointment}
                className="flex-1 bg-[#113F67] text-white py-2 rounded-lg hover:bg-[#0d2947]"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

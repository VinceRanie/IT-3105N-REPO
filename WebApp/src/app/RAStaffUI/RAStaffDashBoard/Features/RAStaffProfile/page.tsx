"use client";

import { useState, useEffect } from "react";
import { User, Mail, Building2, Calendar, Edit2 } from "lucide-react";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { getUserData } from "@/app/utils/authUtil";

interface UserProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  role: string;
  created_at: string;
}

export default function RAStaffProfile() {
  // Protect route
  useProtectedRoute({ requiredRole: "staff" });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    department: "",
  });

  useEffect(() => {
    const userData = getUserData();
    if (userData) {
      setProfile({
        user_id: userData.userId,
        email: userData.email,
        first_name: userData.firstName || "",
        last_name: userData.lastName || "",
        department: userData.department || "",
        role: "Staff",
        created_at: new Date().toISOString(),
      });
      setFormData({
        first_name: userData.firstName || "",
        last_name: userData.lastName || "",
        department: userData.department || "",
      });
    }
    setLoading(false);
  }, []);

  const handleSave = async () => {
    // In a real app, you would send this to the backend
    if (profile) {
      setProfile({
        ...profile,
        first_name: formData.first_name,
        last_name: formData.last_name,
        department: formData.department,
      });
      setIsEditing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-[#113F67] flex items-center gap-2">
            <User className="w-8 h-8" />
            My Profile
          </h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-[#113F67] text-white px-4 py-2 rounded-lg hover:bg-[#0d2947] flex items-center gap-2"
            >
              <Edit2 className="w-5 h-5" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Profile Card */}
      {profile && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left side - Avatar & Basic Info */}
            <div className="flex flex-col items-center md:items-start">
              <div className="w-24 h-24 bg-gradient-to-br from-[#113F67] to-[#0d2947] rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl font-bold text-white">
                  {profile.first_name.charAt(0)}{profile.last_name.charAt(0)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="text-[#113F67] font-semibold mt-1">Staff Member</p>
            </div>

            {/* Right side - Details */}
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-[#113F67]" />
                    <div>
                      <p className="text-xs text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-[#113F67]" />
                    <div>
                      <p className="text-xs text-gray-600">Department</p>
                      <p className="font-semibold text-gray-900">
                        {profile.department || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-[#113F67]" />
                    <div>
                      <p className="text-xs text-gray-600">User ID</p>
                      <p className="font-semibold text-gray-900">{profile.user_id}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Permissions Section */}
          <div className="mt-8 pt-8 border-t">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Your Permissions</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="font-semibold text-green-900">✓ Inventory Management</p>
                <p className="text-sm text-green-700">Add and update chemicals</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="font-semibold text-green-900">✓ Appointment Management</p>
                <p className="text-sm text-green-700">Add, update, approve appointments</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="font-semibold text-green-900">✓ QR Code Scanning</p>
                <p className="text-sm text-green-700">Scan appointment verification codes</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-600">✗ User Management</p>
                <p className="text-sm text-gray-600">Admin only</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

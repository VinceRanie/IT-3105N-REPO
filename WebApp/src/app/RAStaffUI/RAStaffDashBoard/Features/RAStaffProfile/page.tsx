"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { User, Mail, Building2, Calendar, Edit2 } from "lucide-react";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { API_URL } from "@/config/api";
import { getAuthHeader } from "@/app/utils/authUtil";

interface UserProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  department: string | null;
  course: string | null;
  profile_photo: string | null;
  role: string;
}

const DEFAULT_PROFILE_IMAGE = "/UI/img/corporateWorker.jpg";

export default function RAStaffProfile() {
  // Protect route
  useProtectedRoute({ requiredRole: "staff" });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageSrc, setImageSrc] = useState(DEFAULT_PROFILE_IMAGE);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    department: "",
    course: "",
    profile_photo: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers = {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        };

        const response = await fetch(`${API_URL}/auth/profile`, { headers });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load profile.");
        }

        const user = data.user as UserProfile;
        setProfile(user);
        setFormData({
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          department: user.department || "",
          course: user.course || "",
          profile_photo: user.profile_photo || "",
        });
        setImageSrc(user.profile_photo || DEFAULT_PROFILE_IMAGE);
      } catch (err: any) {
        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          department: formData.department,
          course: formData.course,
          profile_photo: formData.profile_photo.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile.");
      }

      const updatedUser = data.user as UserProfile;
      setProfile(updatedUser);
      setFormData({
        first_name: updatedUser.first_name || "",
        last_name: updatedUser.last_name || "",
        department: updatedUser.department || "",
        course: updatedUser.course || "",
        profile_photo: updatedUser.profile_photo || "",
      });
      setImageSrc(updatedUser.profile_photo || DEFAULT_PROFILE_IMAGE);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="text-center py-10 text-red-600">{error || "Unable to load profile."}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
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
              <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4">
                <Image
                  src={imageSrc || DEFAULT_PROFILE_IMAGE}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  fill
                  className="object-cover"
                  onError={() => setImageSrc(DEFAULT_PROFILE_IMAGE)}
                />
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
                  <div>
                    <label className="block text-sm font-semibold mb-2">Course</label>
                    <input
                      type="text"
                      value={formData.course}
                      onChange={(e) =>
                        setFormData({ ...formData, course: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Profile Photo URL</label>
                    <input
                      type="url"
                      value={formData.profile_photo}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setFormData({ ...formData, profile_photo: nextValue });
                        setImageSrc(nextValue.trim() || DEFAULT_PROFILE_IMAGE);
                      }}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave empty to use default profile image.</p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          first_name: profile.first_name || "",
                          last_name: profile.last_name || "",
                          department: profile.department || "",
                          course: profile.course || "",
                          profile_photo: profile.profile_photo || "",
                        });
                        setImageSrc(profile.profile_photo || DEFAULT_PROFILE_IMAGE);
                      }}
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
                    <Building2 className="w-5 h-5 text-[#113F67]" />
                    <div>
                      <p className="text-xs text-gray-600">Course</p>
                      <p className="font-semibold text-gray-900">
                        {profile.course || "N/A"}
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

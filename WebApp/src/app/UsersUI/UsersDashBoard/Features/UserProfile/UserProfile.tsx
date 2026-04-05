"use client";

import { useEffect, useMemo, useState } from "react";
import { User, GraduationCap, Shield, Lock, Save, Eye, EyeOff, Upload } from "lucide-react";
import Image from "next/image";
import { API_URL } from "@/config/api";
import { getAuthHeader } from "@/app/utils/authUtil";

const departments = [
  "Engineering",
  "Psychology", 
  "Computer Science",
  "Business Administration",
  "Medicine",
  "Law",
  "Arts & Humanities",
  "Natural Sciences",
  "Mathematics",
  "Education"
];

const courses = {
  "Engineering": ["Mechanical Engineering", "Electrical Engineering", "Civil Engineering", "Chemical Engineering"],
  "Psychology": ["Clinical Psychology", "Cognitive Psychology", "Social Psychology", "Developmental Psychology"],
  "Computer Science": ["Software Engineering", "Data Science", "Cybersecurity", "AI & Machine Learning"],
  "Business Administration": ["Marketing", "Finance", "Operations Management", "Human Resources"],
  "Medicine": ["General Medicine", "Surgery", "Pediatrics", "Cardiology"],
  "Law": ["Corporate Law", "Criminal Law", "Constitutional Law", "International Law"],
  "Arts & Humanities": ["Literature", "History", "Philosophy", "Fine Arts"],
  "Natural Sciences": ["Biology", "Chemistry", "Physics", "Environmental Science"],
  "Mathematics": ["Pure Mathematics", "Applied Mathematics", "Statistics", "Actuarial Science"],
  "Education": ["Elementary Education", "Secondary Education", "Special Education", "Educational Psychology"]
};

interface UserProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  profile_photo: string | null;
  department: string | null;
  course: string | null;
  role: string;
}

const roleLabelMap: Record<string, string> = {
  admin: "Administrator",
  staff: "Research Assistant",
  faculty: "Faculty",
  student: "Student",
};

const DEFAULT_PROFILE_IMAGE = "/UI/img/corporateWorker.jpg";

const resolveProfilePhotoSrc = (photo: string | null | undefined) => {
  const trimmed = String(photo || "").trim();
  if (!trimmed) {
    return DEFAULT_PROFILE_IMAGE;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `${API_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
};

export default function ProfilePage() {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileImageInput, setProfileImageInput] = useState("");
  const [profileImageSrc, setProfileImageSrc] = useState(DEFAULT_PROFILE_IMAGE);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

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

      const profile = data.user as UserProfile;
      setUserData(profile);
      setSelectedDepartment(profile.department || "");
      setSelectedCourse(profile.course || "");
      setProfileImageInput(profile.profile_photo || "");
      setProfileImageSrc(resolveProfilePhotoSrc(profile.profile_photo));
    } catch (err: any) {
      setError(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!userData) {
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert("Password Mismatch: New password and confirm password do not match.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const body: Record<string, string> = {
        department: selectedDepartment,
        course: selectedCourse,
        profile_photo: profileImageInput.trim(),
      };

      if (formData.newPassword) {
        body.newPassword = formData.newPassword;
        body.confirmPassword = formData.confirmPassword;
      }

      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile.");
      }

      setUserData(data.user as UserProfile);
      const updatedPhoto = (data.user as UserProfile).profile_photo || "";
      setProfileImageInput(updatedPhoto);
      setProfileImageSrc(resolveProfilePhotoSrc(updatedPhoto));
      setFormData({ newPassword: "", confirmPassword: "" });
      alert("Profile Updated: Your profile has been successfully updated.");
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);

      const uploadFormData = new FormData();
      uploadFormData.append("image", file);

      const response = await fetch(`${API_URL}/auth/profile/upload`, {
        method: "POST",
        headers: {
          ...getAuthHeader(),
        },
        body: uploadFormData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload profile photo.");
      }

      const updatedUser = data.user as UserProfile;
      setUserData(updatedUser);
      setProfileImageInput(updatedUser.profile_photo || "");
      setProfileImageSrc(resolveProfilePhotoSrc(updatedUser.profile_photo));
    } catch (err: any) {
      setError(err.message || "Failed to upload profile photo.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const roleLabel = useMemo(() => {
    const role = (userData?.role || "").toLowerCase();
    return roleLabelMap[role] || role || "-";
  }, [userData?.role]);

  const availableCourses = selectedDepartment ? courses[selectedDepartment as keyof typeof courses] || [] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p className="text-[#113F67] font-medium">Loading profile...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p className="text-red-600 font-medium">{error || "Unable to load profile."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="text-center">
        <div className="flex justify-center items-center mt-4">
  <div className="relative w-40 h-40">
    <Image
      src={profileImageSrc || DEFAULT_PROFILE_IMAGE}
      alt={`${userData.first_name} ${userData.last_name}`}
      fill
      className="rounded-full object-cover"
      sizes="120px"
      onError={() => setProfileImageSrc(DEFAULT_PROFILE_IMAGE)}
    />
  </div>
</div>
          <h1 className="text-3xl font-bold text-[#113F67]">Edit Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Profile Info */}
        <div className="bg-white shadow rounded-xl p-4 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#113F67]">
            <User className="h-5 w-5 text-[#113F67]" /> Profile Information
          </h2>
          <p className="text-sm text-gray-500">Your basic information (read-only)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#113F67]">First Name</label>
              <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.first_name} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#113F67]">Last Name</label>
              <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.last_name} readOnly />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#113F67]">Email</label>
            <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.email || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#113F67]">Profile Photo URL</label>
            <input
              className="w-full border rounded p-2 text-[#113F67]"
              value={profileImageInput}
              onChange={(e) => {
                const nextValue = e.target.value;
                setProfileImageInput(nextValue);
                setProfileImageSrc(resolveProfilePhotoSrc(nextValue));
              }}
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty to use the default profile image.</p>
            <div className="mt-2">
              <label className="inline-flex items-center gap-2 rounded-md bg-[#113F67] px-3 py-2 text-sm font-medium text-white cursor-pointer hover:bg-[#0d2f4d]">
                <Upload className="h-4 w-4" />
                {uploadingPhoto ? "Uploading..." : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium flex items-center gap-2 text-[#113F67]">
              <Shield className="h-4 w-4 text-[#113F67]" /> Role
            </label>
            <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={roleLabel} readOnly />
          </div>
        </div>

        {/* Academic Info */}
        <div className="bg-white shadow rounded-xl p-4 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#113F67]">
            <GraduationCap className="h-5 w-5 text-[#113F67]" /> Academic Information
          </h2>
          <p className="text-sm text-gray-500">Select your university department and course</p>
          <div>
            <label className="block text-sm font-medium text-[#113F67]">Department</label>
            <select
              className="w-full border rounded p-2 text-[#113F67]"
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedCourse("");
              }}
            >
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#113F67]">Course</label>
            <select
              className="w-full border rounded p-2 text-[#113F67]"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              disabled={!selectedDepartment}
            >
              <option value="">{selectedDepartment ? "Select course" : "Select department first"}</option>
              {availableCourses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white shadow rounded-xl p-4 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#113F67]">
            <Lock className="h-5 w-5 text-[#113F67]" /> Change Password
          </h2>
          <p className="text-sm text-gray-500">Update your account password</p>
          <div>
            <label className="block text-sm font-medium text-[#113F67]">New Password</label>
            <div className="relative">
              <input
                className="w-full border rounded p-2 text-[#113F67]"
                type={showPassword ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handlePasswordChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-gray-500 text-[#113F67]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#113F67]">Confirm Password</label>
            <div className="relative">
              <input
                className="w-full border rounded p-2 text-[#113F67]"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handlePasswordChange}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-2 text-gray-500"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#113F67] text-white px-4 py-2 rounded-lg shadow cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="inline-block h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

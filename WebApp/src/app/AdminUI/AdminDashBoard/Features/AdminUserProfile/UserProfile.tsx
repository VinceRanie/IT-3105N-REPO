"use client";

import { useState } from "react";
import { User, GraduationCap, Shield, Lock, Save, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

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

export default function ProfilePage() {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  const userData = {
    firstName: "John",
    lastName: "Doe", 
    middleName: "Michael",
    email: "john.doe@gmail.com",
    role: "Student",
    url:"/UI/img/corporateWorker.jpg"
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert("Password Mismatch: New password and confirm password do not match.");
      return;
    }
    alert("Profile Updated: Your profile has been successfully updated.");
  };

  const availableCourses = selectedDepartment ? courses[selectedDepartment as keyof typeof courses] || [] : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
        <div className="flex justify-center items-center mt-4">
  <div className="relative w-40 h-40">
    <Image
      src={userData.url}
      alt={`${userData.firstName} ${userData.lastName}`}
      fill
      className="rounded-full object-cover"
      sizes="120px"
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
              <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.firstName} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#113F67]">Last Name</label>
              <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.lastName} readOnly />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#113F67]">Middle Name</label>
            <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.middleName} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#113F67]">Email</label>
            <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.email} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium flex items-center gap-2 text-[#113F67]">
              <Shield className="h-4 w-4 text-[#113F67]" /> Role
            </label>
            <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.role} readOnly />
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
            className="bg-[#113F67] text-white px-4 py-2 rounded-lg shadow cursor-pointer"
          >
            <Save className="inline-block h-4 w-4 mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

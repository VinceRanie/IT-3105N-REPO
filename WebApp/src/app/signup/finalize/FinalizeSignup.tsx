"use client";

import { useState } from "react";
import Image from "next/image";

export default function FinalizeSignup({
  userData = {
    firstName: "Ken Rod",
    lastName: "Babatido",
    middleInitial: "E",
    department: "",
    course: "",
    email: "20102188@usc.edu.ph",
    role: "student",
  },
}) {
  const [formData, setFormData] = useState({
    department: userData.department,
    course: userData.course,
    password: "",
    retypePassword: "",
  });

  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.retypePassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("/API/auth/finalize-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData.email,
          department: formData.department,
          course: formData.course,
          password: formData.password,
          retypePassword: formData.retypePassword,
        }),
      });

      const data = await res.json();
      setMessage(data.message);

      if (res.ok) {
        // Redirect to login or dashboard
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Finalize signup error:", error);
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white">
      {/* Left Side Image */}
      <div className="relative hidden md:block">
        <Image
          src="/UI/img/Laboratory.jpg"
          alt="Laboratory Background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/70" />
      </div>

      {/* Right Side Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
          <div className="pb-6 text-left">
            <Image src="/UI/img/logo-biocella.png" alt="Logo" width={120} height={40} />
            <h2 className="text-2xl font-bold text-[#113F67] mt-4">Complete Your Signup</h2>
            <p className="text-sm text-gray-600">Finalize your details below</p>
          </div>

          {message && (
            <div className="mb-4 text-center text-sm text-red-600">{message}</div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Read-only fields */}
            <div>
              <label className="text-sm text-gray-500">First Name</label>
              <input type="text" value={userData.firstName} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500" />
            </div>
            <div>
              <label className="text-sm text-gray-500">Last Name</label>
              <input type="text" value={userData.lastName} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500" />
            </div>
            <div>
              <label className="text-sm text-gray-500">Middle Initial</label>
              <input type="text" value={userData.middleInitial} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500" />
            </div>
            <div>
              <label className="text-sm text-gray-700">Department</label>
              <input type="text" placeholder="Enter department" value={formData.department} onChange={(e) => handleChange("department", e.target.value)} className="w-full border rounded-md px-3 py-2" required />
            </div>
            <div>
              <label className="text-sm text-gray-700">Course</label>
              <input type="text" placeholder="Enter course" value={formData.course} onChange={(e) => handleChange("course", e.target.value)} className="w-full border rounded-md px-3 py-2" required />
            </div>
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <input type="email" value={userData.email} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500" />
            </div>
            <div>
              <label className="text-sm text-gray-500">Role</label>
              <input type="text" value={userData.role} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500" />
            </div>

            {/* Editable Password Fields */}
            <div>
              <label className="text-sm text-gray-700">Password</label>
              <input type="password" placeholder="Enter password" value={formData.password} onChange={(e) => handleChange("password", e.target.value)} className="w-full border rounded-md px-3 py-2" required />
            </div>
            <div>
              <label className="text-sm text-gray-700">Retype Password</label>
              <input type="password" placeholder="Retype password" value={formData.retypePassword} onChange={(e) => handleChange("retypePassword", e.target.value)} className="w-full border rounded-md px-3 py-2" required />
            </div>

            {/* Agreement and Submit */}
            <div className="col-span-full pt-2">
              <label className="flex items-start space-x-2 text-sm text-gray-600">
                <input type="checkbox" className="mt-1" required />
                <span>By signing up, you agree to our Terms of Service and responsible account use.</span>
              </label>
            </div>

            <div className="col-span-full flex justify-center pt-4">
              <button type="submit" className="bg-[#113F67] hover:bg-[#0a2a4a] text-white font-medium py-2 px-4 rounded transition-colors cursor-pointer">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

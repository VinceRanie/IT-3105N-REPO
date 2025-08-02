"use client";

import { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Signup attempt:", formData);

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // TODO: Handle signup logic or API call here
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left: Form */}
      <div className="bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-1 pb-6">
            <h2 className="text-2xl font-bold text-center text-[#113F67]">
              Biocella
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[#113F67]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="email"
                  type="email"
                  placeholder="usc.edu.ph"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="text-[#113F67] w-full pl-10 pr-3 py-2 border border-[#113F67] rounded-md focus:ring-2 focus:ring-[#113F67] focus:border-transparent transition-all duration-200 text-left placeholder:text-right"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-[#113F67] text-white py-2 px-4 rounded-md hover:bg-[#0a2a4a] transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
            >
              Send
            </button>
          </form>

          {/* Login Redirect */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                className="text-[#113F67] hover:text-[#0a2a4a] font-medium transition-colors"
                onClick={() => console.log("Redirect to login")}
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right: Image Section */}
      <div className="relative hidden md:block">
        <Image
          src="/UI/img/Laboratory.jpg"
          alt="Scientific laboratory research"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/10" />
      </div>
    </div>
  );
}

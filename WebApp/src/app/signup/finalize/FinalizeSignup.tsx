"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

// Configure API endpoint
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: any;
  }
}

interface UserData {
  firstName?: string;
  lastName?: string;
  email: string;
  department?: string;
  course?: string;
  role?: string;
}

export default function FinalizeSignup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [userData, setUserData] = useState<UserData>({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    course: "",
    role: "student",
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    department: "",
    course: "",
    password: "",
    retypePassword: "",
  });

  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);

  // Fetch user data by token
  useEffect(() => {
    const fetchUserByToken = async () => {
      if (!token) {
        setMessage({ text: "Invalid or missing token", type: 'error' });
        setLoading(false);
        return;
      }

      try {
        // Note: You may need to add a new endpoint to get user by token
        // For now, we'll try to use the reset-password endpoint logic
        // This endpoint should return user info based on the reset token
        const res = await fetch(`${API_BASE_URL}/auth/get-user-by-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          setUserData({
            firstName: data.user?.first_name || "",
            lastName: data.user?.last_name || "",
            email: data.user?.email || "",
            department: data.user?.department || "",
            course: data.user?.course || "",
            role: data.user?.role || "student",
          });
          setFormData((prev) => ({
            ...prev,
            firstName: data.user?.first_name || "",
            lastName: data.user?.last_name || "",
            department: data.user?.department || "",
            course: data.user?.course || "",
          }));
        } else {
          setMessage({ text: "Failed to load user data. Token may be invalid or expired.", type: 'error' });
        }
      } catch (error) {
        console.error("Error fetching user by token:", error);
        setMessage({ text: "Failed to connect to server.", type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserByToken();
  }, [token]);

  // Load Google Identity script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (window.google) {
      setGoogleReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    script.onerror = () => setMessage({ text: 'Failed to load Google services. You can continue manually.', type: 'error' });
    document.body.appendChild(script);
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password || !formData.retypePassword) {
      setMessage({ text: "Password fields are required", type: 'error' });
      return;
    }

    if (formData.password !== formData.retypePassword) {
      setMessage({ text: "Passwords do not match", type: 'error' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/finalize-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          department: formData.department,
          course: formData.course,
          password: formData.password,
          retypePassword: formData.retypePassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: "Account setup completed successfully! Redirecting to login...", type: 'success' });
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/Login');
        }, 2000);
      } else {
        setMessage({ text: data.message || "Failed to finalize signup", type: 'error' });
      }
    } catch (error) {
      console.error("Finalize signup error:", error);
      setMessage({ text: "Something went wrong. Please try again.", type: 'error' });
    }
  };

  const handleGooglePrefill = () => {
    if (!googleReady || !window.google || !GOOGLE_CLIENT_ID) {
      setMessage({ text: 'Google sign-in is not available right now.', type: 'error' });
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: any) => {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/google-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential, email: userData.email }),
          });

          const data = await res.json();
          if (!res.ok) {
            setMessage({ text: data.message || 'Failed to verify Google account.', type: 'error' });
            return;
          }

          setUserData((prev) => ({
            ...prev,
            firstName: data.profile.first_name || prev.firstName,
            lastName: data.profile.last_name || prev.lastName,
          }));

          setFormData((prev) => ({
            ...prev,
            firstName: data.profile.first_name || prev.firstName,
            lastName: data.profile.last_name || prev.lastName,
          }));

          setMessage({ text: 'Google info imported. Please review and submit.', type: 'success' });
        } catch (err) {
          console.error('Google verify error:', err);
          setMessage({ text: 'Failed to verify Google account.', type: 'error' });
        }
      },
    });

    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed()) {
        setMessage({ text: 'Google prompt not displayed. You may need to allow pop-ups or try another browser.', type: 'error' });
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
            <h2 className="text-2xl font-bold text-[#113F67] mt-4">Complete Your Account Setup</h2>
            <p className="text-sm text-gray-600">Fill in your details to finish registration</p>
            {GOOGLE_CLIENT_ID && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleGooglePrefill}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 cursor-pointer"
                >
                  <span role="img" aria-label="Google">🔒</span>
                  <span>Prefill with Google</span>
                </button>
              </div>
            )}
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded text-sm text-center ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Editable name fields */}
            <div>
              <label className="text-sm font-medium text-gray-700">First Name</label>
              <input 
                type="text" 
                value={formData.firstName || ''} 
                onChange={(e) => handleChange('firstName', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <input 
                type="text" 
                value={formData.lastName || ''} 
                onChange={(e) => handleChange('lastName', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input 
                type="email" 
                value={userData.email || ''} 
                readOnly 
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600"
              />
            </div>

            {/* Editable fields */}
            <div>
              <label className="text-sm font-medium text-gray-700">Department</label>
              <input 
                type="text" 
                placeholder="Enter department" 
                value={formData.department} 
                onChange={(e) => handleChange("department", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:ring-2 focus:ring-[#113F67] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Course</label>
              <input 
                type="text" 
                placeholder="Enter course" 
                value={formData.course} 
                onChange={(e) => handleChange("course", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:ring-2 focus:ring-[#113F67] focus:border-transparent"
                required
              />
            </div>

            {/* Password Fields */}
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input 
                type="password" 
                placeholder="Enter password" 
                value={formData.password} 
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:ring-2 focus:ring-[#113F67] focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">At least 6 characters, with uppercase, lowercase, and number</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <input 
                type="password" 
                placeholder="Retype password" 
                value={formData.retypePassword} 
                onChange={(e) => handleChange("retypePassword", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:ring-2 focus:ring-[#113F67] focus:border-transparent"
                required
              />
            </div>

            {/* Agreement and Submit */}
            <div className="col-span-full pt-2">
              <label className="flex items-start space-x-2 text-sm text-gray-600">
                <input type="checkbox" className="mt-1" required />
                <span>By completing this signup, you agree to our Terms of Service and responsible account use.</span>
              </label>
            </div>

            <div className="col-span-full flex justify-center pt-4">
              <button 
                type="submit" 
                className="bg-[#113F67] hover:bg-[#0a2a4a] text-white font-medium py-2 px-6 rounded transition-colors cursor-pointer"
              >
                Complete Setup
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

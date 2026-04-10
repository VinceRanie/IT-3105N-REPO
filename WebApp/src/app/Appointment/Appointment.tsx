'use client';

import { useState } from 'react';
import Image from 'next/image';
import {useRouter} from "next/navigation"
import { Calendar, Clock, FileText, CheckCircle, Mail, User } from 'lucide-react';

interface AppointmentFormData {
  date: string;
  time: string;
  purpose: string;
}

export default function AppointmentBooking() {
  const [formData, setFormData] = useState<AppointmentFormData>({
    date: '',
    time: '',
    purpose: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.date && formData.time && formData.purpose) {
      console.log('Appointment scheduled:', formData);
      setSubmitted(true);
      setFormData({ date: '', time: '', purpose: '' });
      setTimeout(() => setSubmitted(false), 3000);
    }
  };


  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const router = useRouter();
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 ease-in-out duration-300">
      {/* Left: Image Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#113F67] p-6 text-white">
          <h1 className="text-2xl font-bold">Schedule Appointment</h1>
          <p className="text-sm opacity-80 mt-1">
            Set up your meeting with us
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

{submitted && (
  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
    <CheckCircle size={18} />
    Appointment scheduled successfully!
  </div>
)}

{/* Email + Name */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  
  {/* Email */}
  <div>
    <label className="text-sm font-semibold text-[#113F67] flex items-center gap-2 mb-1">
      <Mail size={16} /> Email
    </label>
    <input
      type="email"
      name="email"
      // value={formData.email}
      onChange={handleChange}
      required
      className="w-full border border-[#113F67]/30 rounded-md px-3 py-2  focus:outline-none focus:ring-2 focus:ring-[#113F67]/30"
    />
  </div>

  {/* Name */}
  <div>
    <label className="text-sm font-semibold text-[#113F67] flex items-center gap-2 mb-1">
      <User size={16} /> Name
    </label>
    <input
      type="text"
      name="name"
      // value={formData.name}
      onChange={handleChange}
      required
      className="w-full border border-[#113F67]/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#113F67]/30"
    />
  </div>

</div>

{/* Date */}
<div>
  <label className="text-sm font-semibold text-[#113F67] flex items-center gap-2 mb-1">
    <Calendar size={16} /> Date
  </label>
  <input
    type="date"
    name="date"
    value={formData.date}
    onChange={handleChange}
    required
    className="w-full border border-[#113F67]/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#113F67]/30"
  />
</div>

{/* Time */}
<div>
  <label className="text-sm font-semibold text-[#113F67] flex items-center gap-2 mb-1">
    <Clock size={16} /> Time
  </label>
  <input
    type="time"
    name="time"
    value={formData.time}
    onChange={handleChange}
    required
    className="w-full border border-[#113F67]/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#113F67]/30"
  />
</div>

{/* Purpose */}
<div>
  <label className="text-sm font-semibold text-[#113F67] flex items-center gap-2 mb-1">
    <FileText size={16} /> Purpose
  </label>
  <textarea
    name="purpose"
    value={formData.purpose}
    onChange={handleChange}
    required
    rows={4}
    placeholder="Tell us the reason for your appointment..."
    className="text-[#113F67] w-full border border-[#113F67]/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#113F67]/30 resize-none"
  />
</div>

{/* Button */}
<button
  type="submit"
  className="cursor-pointer w-full bg-[#113F67] hover:bg-[#0d2f4d] text-white font-semibold py-2 rounded-md transition"
>
  Schedule Appointment
</button>
</form>
       
        {/* Footer */}
        <div className="border-t border-[#113F67] text-center text-xs text-gray-500 py-4 bg-gray-50">
        We'll confirm your appointment within 24 hours
        <div className="text-center pt-4 border-t border-gray-200">
            <button
              type="button"
              className="text-sm text-[#113F67] hover:text-[#0a2a4a] font-medium transition-colors cursor-pointer hover:underline"
              onClick={() => router.push('/')}
            >
              Back to Homepage
            </button>
            <p className="text-sm text-gray-400 mt-2">or</p>
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}

              <button
                className="text-[#113F67] hover:text-[#0a2a4a] font-medium transition-colors cursor-pointer hover:underline"
                onClick={()=>router.push("/signup")}
              >Sign up</button>
            </p>
          </div>
        </div>
      </div>
    </div>

      {/* Right: Form Section */}
      <div className="relative hidden md:block">
        <Image
          src="/UI/img/BioOffice.webp"
          alt="USC Biology Laboratory (Arnoldus Science Building)"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/10" />
      </div>
    </div>
  );
}

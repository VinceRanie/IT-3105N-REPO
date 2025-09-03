"use client";

import { useState } from "react";

export default function AdminControls() {
  const [active, setActive] = useState("Students");

  const buttons = ["Students", "Faculty", "Research Assistant"];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
      {/* Buttons */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {buttons.map((label) => (
          <button
            key={label}
            onClick={() => setActive(label)}
            className={`h-8 px-3 py-1 text-sm cursor-pointer rounded-lg shadow-md transition-colors ${
              active === label
                ? "bg-[#113F67] text-white"
                : "bg-white text-[#113F67]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="w-full sm:w-auto">
        <input
          className="shadow-md transition-colors w-full sm:w-80 h-8 text-sm text-[#113F67] rounded-lg border border-gray-300 px-3 py-1 focus:outline-none focus:ring focus:ring-[#113F67]"
          placeholder="Search"
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export default function AdminControls() {
  // Separate active states for each button group
  const [activeStatus, setActiveStatus] = useState("Published");
  const [activeAction, setActiveAction] = useState("");

  const statusButtons = ["Published", "Unpublished"];
  const actionButtons = ["Select", "Remove", "Add"];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
      {/* Left group: Published / Unpublished */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {statusButtons.map((label) => (
          <button
            key={label}
            onClick={() => setActiveStatus(label)}
            className={`h-8 px-3 py-1 text-sm cursor-pointer rounded-lg shadow-md transition-colors ${
              activeStatus === label
                ? "bg-[#113F67] text-white"
                : "bg-white text-[#113F67]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Right group: Action buttons + Search */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:items-center">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {actionButtons.map((label) => (
            <button
              key={label}
              onClick={() => setActiveAction(label)}
              className={`h-8 px-3 py-1 text-sm cursor-pointer rounded-lg shadow-md transition-colors ${
                activeAction === label
                  ? "bg-[#113F67] text-white"
                  : "bg-white text-[#113F67]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <input
          className="shadow-md transition-colors w-full sm:w-80 h-8 text-sm text-[#113F67] rounded-lg border border-gray-300 px-3 py-1 focus:outline-none focus:ring focus:ring-[#113F67]"
          placeholder="Search"
        />
      </div>
    </div>
  );
}

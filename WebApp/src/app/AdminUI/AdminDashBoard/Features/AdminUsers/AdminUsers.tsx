"use client";

import React, { useState } from "react";

interface User {
  id: number;
  department: string;
  course: string;
  fullname: string;
  idNumber: string;
  email: string;
}

const sampleUsers: User[] = [
  {
    id: 1,
    department: "Department of Computer, Information, Sciences and Mathematics",
    course: "Computer Science",
    fullname: "Ken Rod E. Babatido",
    idNumber: "20102188",
    email: "20102188@usc.edu.ph",
  },
  {
    id: 2,
    department: "Department of Computer, Information, Sciences and Mathematics",
    course: "Computer Science",
    fullname: "Ken Rod E. Babatido",
    idNumber: "20102188",
    email: "20102188@usc.edu.ph",
  },
  {
    id: 3,
    department: "Department of Computer, Information, Sciences and Mathematics",
    course: "Computer Science",
    fullname: "Ken Rod E. Babatido",
    idNumber: "20102188",
    email: "20102188@usc.edu.ph",
  },
  {
    id: 4,
    department: "Department of Computer, Information, Sciences and Mathematics",
    course: "Computer Science",
    fullname: "Ken Rod E. Babatido",
    idNumber: "20102188",
    email: "20102188@usc.edu.ph",
  },
  {
    id: 5,
    department: "Department of Computer, Information, Sciences and Mathematics",
    course: "Computer Science",
    fullname: "Ken Rod E. Babatido",
    idNumber: "20102188",
    email: "20102188@usc.edu.ph",
  },
  {
    id: 6,
    department: "Department of Computer, Information, Sciences and Mathematics",
    course: "Computer Science",
    fullname: "Ken Rod E. Babatido",
    idNumber: "20102188",
    email: "20102188@usc.edu.ph",
  },
  {
    id: 7,
    department: "Department of Computer, Information, Sciences and Mathematics",
    course: "Computer Science",
    fullname: "Ken Rod E. Babatido",
    idNumber: "20102188",
    email: "20102188@usc.edu.ph",
  },
  {
    id: 8,
    department: "Department of Computer, Information, Sciences and Mathematics",
    course: "Computer Science",
    fullname: "Ken Rod E. Babatido",
    idNumber: "20102188",
    email: "20102188@usc.edu.ph",
  },
  {
    id: 9,
    department: "Department of Computer, Information, Sciences and Mathematics",
    course: "Computer Science",
    fullname: "Ken Rod E. Babatido",
    idNumber: "20102188",
    email: "20102188@usc.edu.ph",
  },

  {
    id: 10,
    department: "Department of Computer, Information, Sciences and Mathematics",
    course: "Computer Science",
    fullname: "Ken Rod E. Babatido",
    idNumber: "20102188",
    email: "20102189@usc.edu.ph",
  },
];

export default function UserTable() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const handleRowClick = (id: number) => {
    setSelectedUserId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full  h-210 mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-full">
        <div className="overflow-auto max-h-[32rem] relative">
          <table className="table-auto w-full relative">
            <thead className="bg-[#113F67] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  No.
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Course
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Full Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  ID Number
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Email Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sampleUsers.map((user, index) => (
                <React.Fragment key={user.id}>
                  <tr
                    className="bg-white hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => handleRowClick(user.id)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {user.department}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {user.course}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {user.fullname}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {user.idNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.email}
                    </td>
                  </tr>

                  {selectedUserId === user.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={6}>
                        <div className="flex justify-end gap-3 p-3">
                          <button className="bg-green-500 text-white px-3 py-1 rounded-md shadow hover:bg-green-600 cursor-pointer">
                            Student
                          </button>
                          <button className="bg-blue-500 text-white px-3 py-1 rounded-md shadow hover:bg-blue-600 cursor-pointer">
                            Faculty
                          </button>
                          <button className="bg-yellow-500 text-white px-3 py-1 rounded-md shadow hover:bg-yellow-600 cursor-pointer">
                            Research Asst.
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {sampleUsers.length} students
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";

interface collections {
  id: number;
  code: string;
  name: string;
  Project: string;
  Locale: string;
  source: string;
  classifications: string;
}

const sampleCollections: collections[] = [
  {
    id: 1,
    code: "CBN1",
    name: "Bacillus cereus strain DZ102",
    Project: "NRCP sediment Project",
    Locale: "Bantayan Island, Cebu",
    source: "Mangrove Sediment",
    classifications: "Bacteria",
  },
  {
    id: 2,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 3,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 4,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 5,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 6,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 7,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 8,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 9,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 10,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 11,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 12,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 13,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 14,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 15,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 16,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 17,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 18,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 19,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 20,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 21,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 22,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 23,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 24,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 25,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 26,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 27,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },
  {
    id: 28,
    code: "CBN2",
    name: "Escherichia coli strain X10",
    Project: "NRCP water Project",
    Locale: "Mactan Channel, Cebu",
    source: "Water",
    classifications: "Bacteria",
  },

  
];

export default function UserTable() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleRowClick = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full h-210 flex flex-col px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col flex-1 overflow-hidden">
        {/* Scroll only when needed */}
        <div className="flex-1 overflow-y-auto">
          <table className="table-auto w-full">
            <thead className="bg-[#113F67] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  No.
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Locale
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Classification
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sampleCollections.map((collection, index) => (
                <React.Fragment key={collection.id}>
                  <tr
                    className="bg-white hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => handleRowClick(collection.id)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {collection.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {collection.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {collection.Project}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {collection.Locale}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {collection.source}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {collection.classifications}
                    </td>
                  </tr>

                  {selectedId === collection.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={7}>
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

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {sampleCollections.length} collections
          </p>
        </div>
      </div>
    </div>
  );
}

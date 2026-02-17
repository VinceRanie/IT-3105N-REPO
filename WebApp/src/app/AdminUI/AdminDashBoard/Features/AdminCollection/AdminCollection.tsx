"use client";

import React, { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import { Eye, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Collection {
  _id: string;
  code_name: string;
  accession_number: string;
  project_id: {
    _id: string;
    title: string;
    code: string;
    classification: string;
  };
  description: string;
  custom_fields?: {
    locale?: string;
    source?: string;
    storage_type?: string;
    shelf?: string;
    funded_by?: string;
  };
}

const sampleCollections_backup = [
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
];

export default function CollectionTable({ specimens, onEdit, onDelete, onView }: { 
  specimens: Collection[], 
  onEdit: (specimen: Collection) => void,
  onDelete: (id: string) => void,
  onView: (specimen: Collection) => void 
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleRowClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full flex flex-col px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col flex-1 overflow-hidden">
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
                  Accession No.
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {specimens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No specimens found. Add your first specimen to get started.
                  </td>
                </tr>
              ) : (
                specimens.map((specimen, index) => (
                  <React.Fragment key={specimen._id}>
                    <tr
                      className="bg-white hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
                      onClick={() => handleRowClick(specimen._id)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.code_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.accession_number || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.project_id?.title || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.custom_fields?.locale || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.custom_fields?.source || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.project_id?.classification || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(specimen);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(specimen);
                            }}
                            className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to delete this specimen?")) {
                                onDelete(specimen._id);
                              }
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {selectedId === specimen._id && (
                      <tr className="bg-gray-50">
                        <td colSpan={8}>
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-700 mb-2">Description:</h4>
                            <p className="text-sm text-gray-600">
                              {specimen.description || "No description available"}
                            </p>
                            {specimen.custom_fields && (
                              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                {specimen.custom_fields.storage_type && (
                                  <div>
                                    <span className="font-medium">Storage:</span>{" "}
                                    {specimen.custom_fields.storage_type}
                                  </div>
                                )}
                                {specimen.custom_fields.shelf && (
                                  <div>
                                    <span className="font-medium">Shelf:</span>{" "}
                                    {specimen.custom_fields.shelf}
                                  </div>
                                )}
                                {specimen.custom_fields.funded_by && (
                                  <div>
                                    <span className="font-medium">Funded by:</span>{" "}
                                    {specimen.custom_fields.funded_by}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {specimens.length} specimen{specimens.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

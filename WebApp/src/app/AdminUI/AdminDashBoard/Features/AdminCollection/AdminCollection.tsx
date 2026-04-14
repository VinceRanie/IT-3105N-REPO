"use client";

import React, { useState } from "react";
import { Eye, Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface Collection {
  _id: string;
  publish_status?: "published" | "unpublished";
  code_name: string;
  classification: string;
  source: string;
  date_accessed: string;
  locale?: string;
  project_fund?: string;
  accession_number?: string;
  accession_no?: string;
  similarity_percent?: string;
  project_id:
    | string
    | {
        _id: string;
        title: string;
        code: string;
        classification: string;
      };
  description?: string;
  custom_fields?: Record<string, string>;
  catalase?: string;
  oxidase?: string;
  growth_media?: string;
}

export default function CollectionTable({
  specimens,
  onEdit,
  onDelete,
  onView,
  onTogglePublish,
}: {
  specimens: Collection[];
  onEdit: (specimen: Collection) => void;
  onDelete: (id: string) => void;
  onView: (specimen: Collection) => void;
  onTogglePublish: (specimen: Collection) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleRowClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const getSortedData = () => {
    if (!sortColumn) return [...specimens].reverse();

    return [...specimens].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Collection];
      let bVal: any = b[sortColumn as keyof Collection];

      if (sortColumn === "project_id") {
        aVal =
          typeof a.project_id === "object"
            ? a.project_id?.title
            : a.project_id;
        bVal =
          typeof b.project_id === "object"
            ? b.project_id?.title
            : b.project_id;
      }

      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column)
      return <div className="w-4 h-4 opacity-30" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const SortableHeader = ({
    column,
    label,
  }: {
    column: string;
    label: string;
  }) => {
    const isActive = sortColumn === column;

    return (
      <th
        onClick={() => handleSort(column)}
        className={`px-4 py-3 text-left text-sm font-semibold uppercase cursor-pointer transition-all
          ${
            isActive
              ? "bg-white text-[#113F67]"
              : "text-white hover:bg-[#0d2f4d]"
          }`}
      >
        <div className="flex items-center gap-2">
          {label}
          <span
            className={`transition ${
              isActive ? "text-[#113F67]" : "text-white"
            }`}
          >
            <SortIcon column={column} />
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto">
          <table className="w-full">
            <thead className="bg-[#113F67] sticky top-0 z-10">
              <tr>
                <SortableHeader column="code_name" label="Code" />
                <SortableHeader column="accession_no" label="Accession No." />
                <SortableHeader column="project_id" label="Project" />
                <SortableHeader column="locale" label="Locale" />
                <SortableHeader column="source" label="Source" />
                <SortableHeader column="classification" label="Classification" />
                <SortableHeader column="publish_status" label="Status" />
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {getSortedData().length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500">
                    No specimens found.
                  </td>
                </tr>
              ) : (
                getSortedData().map((specimen) => (
                  <React.Fragment key={specimen._id}>
                    <tr
                      onClick={() => handleRowClick(specimen._id)}
                      className="bg-white hover:bg-[#f4f8fb] transition cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.code_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.accession_number ||
                          specimen.accession_no ||
                          "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {typeof specimen.project_id === "object"
                          ? specimen.project_id?.title
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.locale || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.source || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.classification || "N/A"}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            specimen.publish_status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {specimen.publish_status === "published"
                            ? "Published"
                            : "Unpublished"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(specimen);
                            }}
                            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(specimen);
                            }}
                            className="p-1.5 rounded-md text-yellow-600 hover:bg-yellow-50 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePublish(specimen);
                            }}
                            className="px-2 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                          >
                            {specimen.publish_status === "published"
                              ? "Unpublish"
                              : "Publish"}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(specimen._id);
                            }}
                            className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {selectedId === specimen._id && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="p-4 text-sm text-gray-600">
                          {specimen.description || "No description available"}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
          Showing {specimens.length} specimen
          {specimens.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Search, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { API_URL } from "@/config/api";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { getAuthHeader } from "@/app/utils/authUtil";

interface Chemical {
  chemical_id: number;
  name: string;
  type: string;
  unit: string;
  quantity: number;
  reorder_level: number;
  qr_code: string | null;
}

interface Batch {
  batch_id: number;
  chemical_id: number;
  quantity: number;
  date_received: string;
}

export default function RAStaffInventory() {
  // Protect route - only RA/Staff can access
  useProtectedRoute({ requiredRole: 'staff' });

  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [filteredChemicals, setFilteredChemicals] = useState<Chemical[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChemical, setEditingChemical] = useState<Chemical | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "Acid",
    unit: "mL",
    quantity: 0,
    reorder_level: 10,
  });
  const router = useRouter();

  useEffect(() => {
    fetchChemicals();
  }, []);

  useEffect(() => {
    filterChemicals();
  }, [searchTerm, typeFilter, chemicals]);

  const fetchChemicals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/chemicals`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch chemicals");
      const data = await res.json();
      setChemicals(data);
    } catch (err) {
      setError("Failed to fetch inventory");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterChemicals = () => {
    let filtered = chemicals;

    if (searchTerm) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((c) => c.type === typeFilter);
    }

    setFilteredChemicals(filtered);
    setCurrentPage(1);
  };

  const handleAddClick = () => {
    setEditingChemical(null);
    setFormData({
      name: "",
      type: "Acid",
      unit: "mL",
      quantity: 0,
      reorder_level: 10,
    });
    setShowAddModal(true);
  };

  const handleEditClick = (chemical: Chemical) => {
    setEditingChemical(chemical);
    setFormData({
      name: chemical.name,
      type: chemical.type,
      unit: chemical.unit,
      quantity: chemical.quantity,
      reorder_level: chemical.reorder_level,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingChemical
        ? `${API_URL}/chemicals/${editingChemical.chemical_id}`
        : `${API_URL}/chemicals`;

      const method = editingChemical ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error(`Failed to ${editingChemical ? "update" : "add"} chemical`);

      setShowAddModal(false);
      fetchChemicals();
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const paginatedChemicals = filteredChemicals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredChemicals.length / itemsPerPage);
  const types = ["all", "Acid", "Base", "Salt", "Organic", "Inorganic"];

  if (loading) {
    return <div className="text-center py-10">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#113F67] flex items-center gap-2">
              <Package className="w-8 h-8" />
              Inventory Management
            </h1>
            <p className="text-gray-600 mt-1">Add and update chemical inventory</p>
          </div>
          <button
            onClick={handleAddClick}
            className="bg-[#113F67] text-white px-4 py-2 rounded-lg hover:bg-[#0d2947] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Chemical
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search chemicals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              />
            </div>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All Types" : type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chemicals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#113F67] text-white">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Quantity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Unit</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedChemicals.map((chemical) => (
              <tr key={chemical.chemical_id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{chemical.name}</td>
                <td className="px-6 py-3 text-gray-600">{chemical.type}</td>
                <td className="px-6 py-3 text-gray-600">
                  <span
                    className={
                      chemical.quantity <= chemical.reorder_level
                        ? "text-red-600 font-semibold"
                        : ""
                    }
                  >
                    {chemical.quantity}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-600">{chemical.unit}</td>
                <td className="px-6 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      chemical.quantity <= chemical.reorder_level
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {chemical.quantity <= chemical.reorder_level ? "Low Stock" : "In Stock"}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => handleEditClick(chemical)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedChemicals.length === 0 && (
          <div className="text-center py-10 text-gray-500">No chemicals found</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white rounded-lg shadow p-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#113F67] text-white disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#113F67] text-white disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-[#113F67]">
              {editingChemical ? "Edit Chemical" : "Add Chemical"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                >
                  <option>Acid</option>
                  <option>Base</option>
                  <option>Salt</option>
                  <option>Organic</option>
                  <option>Inorganic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                >
                  <option>mL</option>
                  <option>L</option>
                  <option>g</option>
                  <option>kg</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Reorder Level</label>
                <input
                  type="number"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({...formData, reorder_level: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-[#113F67] text-white py-2 rounded-lg hover:bg-[#0d2947]"
                >
                  {editingChemical ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { ChemicalFormData } from "./types";
import { API_URL } from "@/config/api";

interface AddChemicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExistingChemical {
  chemical_id: number;
  name: string;
  type: string;
}

interface ExistingBatch {
  chemical_id: number;
  lot_number?: string | null;
}

const ALL_UNITS = ["mL", "L", "g", "kg", "mg", "μL", "pieces", "bottles"] as const;
const MASS_UNITS = ["g", "kg", "mg"] as const;
const VOLUME_UNITS = ["mL", "L", "μL"] as const;

const getAllowedUnitsForType = (type: string) => {
  const normalized = type.trim().toLowerCase();

  if (["agar", "protein", "salt", "dye", "stain", "enzyme", "antibody"].includes(normalized)) {
    return [...MASS_UNITS];
  }

  if (["acid", "base", "buffer", "solvent"].includes(normalized)) {
    return [...VOLUME_UNITS];
  }

  return [...ALL_UNITS];
};

export default function AddChemicalModal({
  isOpen,
  onClose,
  onSuccess,
}: AddChemicalModalProps) {
  const [formData, setFormData] = useState<ChemicalFormData>({
    name: "",
    type: "General",
    quantity: 0,
    unit: "mL",
    threshold: 0,
    expiration_date: "",
    location: "",
    lot_number: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customType, setCustomType] = useState("");
  const [existingChemicals, setExistingChemicals] = useState<ExistingChemical[]>([]);
  const [existingBatches, setExistingBatches] = useState<ExistingBatch[]>([]);

  useEffect(() => {
    const fetchLotSuggestions = async () => {
      try {
        const [chemicalsRes, batchesRes] = await Promise.all([
          fetch(`${API_URL}/chemicals`),
          fetch(`${API_URL}/batches`),
        ]);

        if (!chemicalsRes.ok || !batchesRes.ok) {
          return;
        }

        const chemicalsData = await chemicalsRes.json();
        const batchesData = await batchesRes.json();
        setExistingChemicals(chemicalsData);
        setExistingBatches(batchesData);
      } catch {
        setExistingChemicals([]);
        setExistingBatches([]);
      }
    };

    if (isOpen) {
      fetchLotSuggestions();
    }
  }, [isOpen]);

  const resolvedType = useMemo(() => {
    return formData.type === "Other" ? customType.trim() : formData.type;
  }, [formData.type, customType]);

  const allowedUnits = useMemo(() => getAllowedUnitsForType(resolvedType), [resolvedType]);

  useEffect(() => {
    if (!allowedUnits.includes(formData.unit as (typeof allowedUnits)[number])) {
      setFormData((prev) => ({ ...prev, unit: allowedUnits[0] }));
    }
  }, [allowedUnits, formData.unit]);

  const lotSuggestions = useMemo(() => {
    const normalizedName = formData.name.trim().toLowerCase();
    const normalizedType = resolvedType.trim().toLowerCase();

    if (!normalizedName || !normalizedType) {
      return [];
    }

    const matchedChemicalIds = existingChemicals
      .filter(
        (chemical) =>
          chemical.name.trim().toLowerCase() === normalizedName &&
          chemical.type.trim().toLowerCase() === normalizedType
      )
      .map((chemical) => chemical.chemical_id);

    if (!matchedChemicalIds.length) {
      return [];
    }

    const suggestionSet = new Set(
      existingBatches
        .filter(
          (batch) =>
            matchedChemicalIds.includes(batch.chemical_id) &&
            !!batch.lot_number &&
            batch.lot_number.trim() !== ""
        )
        .map((batch) => batch.lot_number!.trim())
    );

    return Array.from(suggestionSet).sort((a, b) => a.localeCompare(b));
  }, [existingChemicals, existingBatches, formData.name, resolvedType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (formData.type === "Other" && !customType.trim()) {
        throw new Error("Please specify the custom chemical type.");
      }

      if (!Number.isFinite(formData.quantity) || formData.quantity <= 0) {
        throw new Error("Quantity must be greater than 0.");
      }

      if (!Number.isFinite(formData.threshold) || formData.threshold < 0) {
        throw new Error("Threshold must be 0 or greater.");
      }

      if (formData.threshold >= formData.quantity) {
        throw new Error("Threshold must be less than quantity.");
      }

      if (!formData.lot_number.trim()) {
        throw new Error("Lot Number is required.");
      }

      if (!allowedUnits.includes(formData.unit as (typeof allowedUnits)[number])) {
        throw new Error(`Selected unit is not valid for type ${resolvedType || formData.type}.`);
      }

      const payload = {
        ...formData,
        type: resolvedType,
        lot_number: formData.lot_number.trim(),
      };

      const response = await fetch(`${API_URL}/chemicals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add chemical");
      }

      // Reset form
      setFormData({
        name: "",
        type: "General",
        quantity: 0,
        unit: ALL_UNITS[0],
        threshold: 0,
        expiration_date: "",
        location: "",
        lot_number: "",
      });
      setCustomType("");

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const parsedQuantity = Number.parseFloat(value);
    const parsedThreshold = Number(value);

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "quantity"
          ? Number.isNaN(parsedQuantity)
            ? 0
            : parsedQuantity
          : name === "threshold"
          ? Number.isNaN(parsedThreshold)
            ? 0
            : parsedThreshold
          : value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-[#113F67]">Add New Chemical</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chemical Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="Enter chemical name"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              >
                <option value="General">General</option>
                <option value="Agar">Agar</option>
                <option value="Protein">Protein</option>
                <option value="Acid">Acid</option>
                <option value="Base">Base</option>
                <option value="Salt">Salt</option>
                <option value="Buffer">Buffer</option>
                <option value="Enzyme">Enzyme</option>
                <option value="Antibody">Antibody</option>
                <option value="Dye">Dye</option>
                <option value="Stain">Stain</option>
                <option value="Solvent">Solvent</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {formData.type === "Other" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Type *
                </label>
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="Enter custom type"
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="Enter quantity"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit *
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              >
                {allowedUnits.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Unit options are filtered based on selected type.
              </p>
            </div>

            {/* Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Low Stock Threshold *
              </label>
              <input
                type="number"
                name="threshold"
                value={formData.threshold}
                onChange={handleChange}
                required
                min="0"
                max={formData.quantity > 0 ? formData.quantity - 0.01 : undefined}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="Enter threshold"
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be less than the quantity
              </p>
            </div>

            {/* Expiration Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date (Optional)
              </label>
              <input
                type="date"
                name="expiration_date"
                value={formData.expiration_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank if chemical does not expire
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="e.g., Shelf A-3, Cabinet 2, Refrigerator"
              />
              <p className="mt-1 text-xs text-gray-500">
                Physical location where this container is stored
              </p>
            </div>

            {/* Lot Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lot Number *
              </label>
              <input
                type="text"
                list="admin-lot-number-options"
                name="lot_number"
                value={formData.lot_number}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="e.g., AGR-2026-03"
              />
              <datalist id="admin-lot-number-options">
                {lotSuggestions.map((lot) => (
                  <option key={lot} value={lot} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-gray-500">
                Suggestions are based on current name and type. You can also type a new lot number.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#113F67] text-white rounded-lg hover:bg-[#0d2f4d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add Chemical"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

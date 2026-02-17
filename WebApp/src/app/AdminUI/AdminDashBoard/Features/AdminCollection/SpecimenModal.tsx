"use client";

import { useState, useEffect } from "react";
import { X, Upload } from "lucide-react";
import Image from "next/image";

interface SpecimenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (specimen: FormData) => void;
  specimen?: any;
  projects: any[];
}

export default function SpecimenModal({ isOpen, onClose, onSave, specimen, projects }: SpecimenModalProps) {
  const [formData, setFormData] = useState({
    project_id: "",
    code_name: "",
    accession_number: "",
    description: "",
    custom_fields: {
      locale: "",
      source: "",
      storage_type: "",
      shelf: "",
      funded_by: "",
    }
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    if (specimen) {
      setFormData({
        project_id: specimen.project_id?._id || specimen.project_id || "",
        code_name: specimen.code_name || "",
        accession_number: specimen.accession_number || "",
        description: specimen.description || "",
        custom_fields: specimen.custom_fields || {
          locale: "",
          source: "",
          storage_type: "",
          shelf: "",
          funded_by: "",
        }
      });
      // Set existing image preview if available
      if (specimen.image_url) {
        setImagePreview(specimen.image_url);
      }
    } else {
      setFormData({
        project_id: "",
        code_name: "",
        accession_number: "",
        description: "",
        custom_fields: {
          locale: "",
          source: "",
          storage_type: "",
          shelf: "",
          funded_by: "",
        }
      });
      setImageFile(null);
      setImagePreview("");
    }
  }, [specimen]);

  const handleCustomFieldChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      custom_fields: {
        ...formData.custom_fields,
        [field]: value
      }
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create FormData for multipart upload
    const submitData = new FormData();
    submitData.append('project_id', formData.project_id);
    submitData.append('code_name', formData.code_name);
    submitData.append('accession_number', formData.accession_number);
    submitData.append('description', formData.description);
    submitData.append('custom_fields', JSON.stringify(formData.custom_fields));
    
    // Add image file if selected
    if (imageFile) {
      submitData.append('image', imageFile);
    }
    
    onSave(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 my-8">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-[#113F67]">
            {specimen ? "Edit Specimen" : "Add New Specimen"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project *
              </label>
              <select
                required
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              >
                <option value="">Select a Project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.title} ({project.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Code Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code Name *
              </label>
              <input
                type="text"
                required
                value={formData.code_name}
                onChange={(e) => setFormData({ ...formData, code_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="e.g., CBN001"
              />
            </div>

            {/* Accession Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Accession Number
              </label>
              <input
                type="text"
                value={formData.accession_number}
                onChange={(e) => setFormData({ ...formData, accession_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="e.g., ACC-2024-001"
              />
            </div>

            {/* Locale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Locale
              </label>
              <input
                type="text"
                value={formData.custom_fields.locale}
                onChange={(e) => handleCustomFieldChange("locale", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="e.g., Bantayan Island, Cebu"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <input
                type="text"
                value={formData.custom_fields.source}
                onChange={(e) => handleCustomFieldChange("source", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="e.g., Mangrove Sediment, Water, Soil"
              />
            </div>

            {/* Storage Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage Type
              </label>
              <select
                value={formData.custom_fields.storage_type}
                onChange={(e) => handleCustomFieldChange("storage_type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              >
                <option value="">Select Storage Type</option>
                <option value="Cryogenic">Cryogenic (-80°C)</option>
                <option value="Freezer">Freezer (-20°C)</option>
                <option value="Refrigerator">Refrigerator (4°C)</option>
                <option value="Room Temp">Room Temperature</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Shelf */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shelf Location
              </label>
              <input
                type="text"
                value={formData.custom_fields.shelf}
                onChange={(e) => handleCustomFieldChange("shelf", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="e.g., C-12-A4"
              />
            </div>

            {/* Funded By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Funded By
              </label>
              <input
                type="text"
                value={formData.custom_fields.funded_by}
                onChange={(e) => handleCustomFieldChange("funded_by", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="e.g., National Science Foundation"
              />
            </div>

            {/* Image Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specimen Image
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#113F67] transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                  {imageFile && (
                    <p className="mt-2 text-sm text-green-600">
                      Selected: {imageFile.name}
                    </p>
                  )}
                </div>
                
                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                    <Image
                      src={imagePreview.startsWith('/uploads') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${imagePreview}` : imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="Detailed description of the specimen..."
              />
            </div>
          </div>

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
              className="px-4 py-2 bg-[#113F67] text-white rounded-lg hover:bg-[#0d2f4d] transition-colors"
            >
              {specimen ? "Update" : "Add"} Specimen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

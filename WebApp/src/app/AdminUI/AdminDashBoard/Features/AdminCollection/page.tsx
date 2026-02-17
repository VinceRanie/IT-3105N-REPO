"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import AdminCollection from "./AdminCollection";
import AdminControls from "./AdminControls";
import ProjectModal from "./ProjectModal";
import SpecimenModal from "./SpecimenModal";
import { useRouter } from "next/navigation";

interface Project {
  _id: string;
  title: string;
  code: string;
  classification: string;
  user_id: number;
}

interface Specimen {
  _id: string;
  code_name: string;
  accession_number: string;
  project_id: Project;
  description: string;
  qr_code?: string;
  image_url?: string;
  custom_fields?: {
    locale?: string;
    source?: string;
    storage_type?: string;
    shelf?: string;
    funded_by?: string;
  };
}

export default function AdminCollectionPage() {
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSpecimenModalOpen, setIsSpecimenModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
  
  const router = useRouter();

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // Fetch specimens
  const fetchSpecimens = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/microbials`);
      if (response.ok) {
        const data = await response.json();
        setSpecimens(data);
      }
    } catch (error) {
      console.error("Error fetching specimens:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchSpecimens();
  }, []);

  // Project handlers
  const handleSaveProject = async (projectData: any) => {
    try {
      const method = selectedProject ? "PUT" : "POST";
      const url = selectedProject
        ? `${API_URL}/projects/${selectedProject._id}`
        : `${API_URL}/projects`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        await fetchProjects();
        setIsProjectModalOpen(false);
        setSelectedProject(null);
        alert(selectedProject ? "Project updated successfully!" : "Project created successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to save project"}`);
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Error saving project");
    }
  };

  // Specimen handlers
  const handleSaveSpecimen = async (specimenData: FormData) => {
    try {
      const method = selectedSpecimen ? "PUT" : "POST";
      const url = selectedSpecimen
        ? `${API_URL}/microbials/${selectedSpecimen._id}`
        : `${API_URL}/microbials`;

      const response = await fetch(url, {
        method,
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
        body: specimenData,
      });

      if (response.ok) {
        await fetchSpecimens();
        setIsSpecimenModalOpen(false);
        setSelectedSpecimen(null);
        alert(selectedSpecimen ? "Specimen updated successfully! QR code has been generated." : "Specimen added successfully! QR code has been generated.");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to save specimen"}`);
      }
    } catch (error) {
      console.error("Error saving specimen:", error);
      alert("Error saving specimen");
    }
  };

  const handleDeleteSpecimen = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/microbials/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchSpecimens();
        alert("Specimen deleted successfully!");
      } else {
        alert("Failed to delete specimen");
      }
    } catch (error) {
      console.error("Error deleting specimen:", error);
      alert("Error deleting specimen");
    }
  };

  const handleViewSpecimen = (specimen: any) => {
    // Navigate to specimen details page or open a detailed modal
    router.push(`/AdminUI/AdminDashBoard/Features/AdminCollection/specimen/${specimen._id}`);
  };

  const handleEditSpecimen = (specimen: any) => {
    setSelectedSpecimen(specimen);
    setIsSpecimenModalOpen(true);
  };

  // Filter specimens based on search query
  const filteredSpecimens = specimens.filter((specimen: any) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      specimen.code_name?.toLowerCase().includes(query) ||
      specimen.accession_number?.toLowerCase().includes(query) ||
      specimen.project_id?.title?.toLowerCase().includes(query) ||
      specimen.custom_fields?.locale?.toLowerCase().includes(query) ||
      specimen.custom_fields?.source?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading specimens...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminControls
        onAddProject={() => {
          setSelectedProject(null);
          setIsProjectModalOpen(true);
        }}
        onAddSpecimen={() => {
          setSelectedSpecimen(null);
          setIsSpecimenModalOpen(true);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <AdminCollection
        specimens={filteredSpecimens}
        onEdit={handleEditSpecimen}
        onDelete={handleDeleteSpecimen}
        onView={handleViewSpecimen}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setSelectedProject(null);
        }}
        onSave={handleSaveProject}
        project={selectedProject}
      />

      <SpecimenModal
        isOpen={isSpecimenModalOpen}
        onClose={() => {
          setIsSpecimenModalOpen(false);
          setSelectedSpecimen(null);
        }}
        onSave={handleSaveSpecimen}
        specimen={selectedSpecimen}
        projects={projects}
      />
    </>
  );
}

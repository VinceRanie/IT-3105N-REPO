"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/config/api";
import Navbar from "../UI Components/Nav";
import Form from "../UI Components/Form";
import AboutUs from "../UI Components/About";
import Collections from "../UI Components/Collection";
import Features from "../UI Components/Features";
import Footer from "../UI Components/Footer";

type SpecimenTypeStat = {
    type: string;
    count: number;
};

type HomepageStats = {
    carolinianCount: number;
    totalSpecimens: number;
    specimenTypes: SpecimenTypeStat[];
};

const defaultStats: HomepageStats = {
    carolinianCount: 0,
    totalSpecimens: 0,
    specimenTypes: [],
};

export default function Homepage() {
    const [stats, setStats] = useState<HomepageStats>(defaultStats);

    useEffect(() => {
        const fetchHomepageStats = async () => {
            try {
                const response = await fetch(`${API_URL}/microbials/public/stats`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.error || "Failed to fetch homepage stats");
                }

                setStats({
                    carolinianCount: Number(data?.carolinianCount || 0),
                    totalSpecimens: Number(data?.totalSpecimens || 0),
                    specimenTypes: Array.isArray(data?.specimenTypes) ? data.specimenTypes : [],
                });
            } catch {
                setStats(defaultStats);
            }
        };

        fetchHomepageStats();
    }, []);

    return (
        <>
            <Navbar />
            <Form />
            <AboutUs
                totalSpecimens={stats.totalSpecimens}
                carolinianCount={stats.carolinianCount}
            />
            <Collections
                totalSpecimens={stats.totalSpecimens}
                specimenTypes={stats.specimenTypes}
            />
            <Features />
            <Footer />
        </>
    );
}

"use client";

import { useEffect, useState } from "react";
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
    publishedSpecimens: number;
    carolinianCount: number;
    totalSpecimens: number;
    collectionCategories: number;
    specimenTypes: SpecimenTypeStat[];
};

const defaultStats: HomepageStats = {
    publishedSpecimens: 0,
    carolinianCount: 0,
    totalSpecimens: 0,
    collectionCategories: 0,
    specimenTypes: [],
};

export default function Homepage() {
    const [stats, setStats] = useState<HomepageStats>(defaultStats);

    useEffect(() => {
        const fetchHomepageStats = async () => {
            try {
                const response = await fetch("/API/home/stats", { cache: "no-store" });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.error || "Failed to fetch homepage stats");
                }

                setStats({
                    publishedSpecimens: Number(data?.publishedSpecimens || 0),
                    carolinianCount: Number(data?.carolinianCount || 0),
                    totalSpecimens: Number(data?.totalSpecimens || 0),
                    collectionCategories: Number(data?.collectionCategories || 0),
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
                totalSpecimens={stats.publishedSpecimens}
                carolinianCount={stats.carolinianCount}
            />
            <Collections
                totalSpecimens={stats.totalSpecimens}
                collectionCategories={stats.collectionCategories}
                specimenTypes={stats.specimenTypes}
            />
            <Features />
            <Footer />
        </>
    );
}

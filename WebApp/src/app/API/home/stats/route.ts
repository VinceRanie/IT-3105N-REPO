import { NextResponse } from "next/server";

const DEFAULT_API_BASE_URL = "https://22102959.dcism.org/biocella-api";
const ENV_API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

type MicrobialItem = {
  classification?: string | null;
  publish_status?: string | null;
};

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

const isPublished = (item: MicrobialItem) => {
  const status = (item.publish_status || "published").toString().trim().toLowerCase();
  return status !== "unpublished";
};

const toSpecimenTypeStats = (items: MicrobialItem[]): SpecimenTypeStat[] => {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const typeRaw = (item.classification || "Unknown").toString().trim();
    const type = typeRaw.length > 0 ? typeRaw : "Unknown";
    counts.set(type, (counts.get(type) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
};

const getApiBaseCandidates = (): string[] => {
  const normalized = ENV_API_BASE_URL;
  const candidates = new Set<string>([normalized, DEFAULT_API_BASE_URL]);

  if (normalized.endsWith("/biocella-api")) {
    candidates.add(normalized.replace(/\/biocella-api$/, ""));
  } else {
    candidates.add(`${normalized}/biocella-api`);
  }

  return Array.from(candidates).filter(Boolean);
};

const tryParseJson = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getClassification = (item: MicrobialItem) => {
  const typeRaw = (item.classification || "Unknown").toString().trim();
  return typeRaw.length > 0 ? typeRaw : "Unknown";
};

const fetchJson = async (url: string) => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    return await tryParseJson(response);
  } catch {
    return null;
  }
};

const fetchHomepageStats = async (apiBaseUrl: string): Promise<HomepageStats | null> => {
  const allMicrobialsData = await fetchJson(`${apiBaseUrl}/microbials?role=staff`);
  if (!Array.isArray(allMicrobialsData)) {
    return null;
  }

  const publishedMicrobialsData = await fetchJson(`${apiBaseUrl}/microbials?role=staff&publish_status=published`);
  const usersData = await fetchJson(`${apiBaseUrl}/auth/users`);
  const users = Array.isArray(usersData?.users) ? usersData.users : [];

  const allMicrobials = allMicrobialsData as MicrobialItem[];
  const publishedMicrobials = Array.isArray(publishedMicrobialsData)
    ? (publishedMicrobialsData as MicrobialItem[])
    : allMicrobials.filter(isPublished);

  const studentUsers = users.filter((user: { role?: string | null }) => {
    return String(user?.role || "").trim().toLowerCase() === "student";
  });

  const allSpecimenTypes = toSpecimenTypeStats(
    allMicrobials.map((item) => ({ ...item, classification: getClassification(item) }))
  );

  return {
    publishedSpecimens: publishedMicrobials.filter(isPublished).length,
    carolinianCount: studentUsers.length,
    totalSpecimens: allMicrobials.length,
    collectionCategories: allSpecimenTypes.length,
    specimenTypes: allSpecimenTypes,
  };
};

export async function GET() {
  try {
    const apiBaseCandidates = getApiBaseCandidates();

    for (const apiBaseUrl of apiBaseCandidates) {
      try {
        const data = await fetchHomepageStats(apiBaseUrl);
        if (data) {
          return NextResponse.json(data);
        }
      } catch {
        // Continue trying other possible base URL variants.
      }
    }

    return NextResponse.json(
      {
        publishedSpecimens: 0,
        carolinianCount: 0,
        totalSpecimens: 0,
        collectionCategories: 0,
        specimenTypes: [],
        error: "Failed to fetch homepage stats",
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch homepage stats" },
      { status: 500 }
    );
  }
}

import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { getHomeBuyerDataServer } from "@/lib/services/server/home-admin.service";

export const metadata: Metadata = {
  title: "KalaSetu — Discover Authentic Indian Art",
  description:
    "A global art ecosystem connecting collectors with authentic Indian artisans. Explore curated collections, live auctions, community discussions, and heritage events.",
  openGraph: {
    title: "KalaSetu — Discover Authentic Indian Art",
    description:
      "A global art ecosystem connecting collectors with authentic Indian artisans. Explore curated collections, live auctions, and heritage events.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "KalaSetu",
  description:
    "A global art ecosystem connecting collectors with authentic Indian artisans. Explore curated collections, support heritage, and discover unique stories.",
  potentialAction: {
    "@type": "SearchAction",
    target: "/marketplace",
    "query-input": "required name=search_term_string",
  },
};

export default async function HomePage() {
  const initialData = await getHomeBuyerDataServer();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <HomeClient initialData={initialData} />
    </>
  );
}

import type { APIRoute, GetStaticPaths } from "astro";
import { generateOgImage } from "../../lib/og";
import { getCollection } from "astro:content";

// Define all OG images to generate
const staticPages = [
  {
    slug: "home",
    title: "Self-hosted waitlist software",
    subtitle: "Fast, free, and forever yours. Deploy to Cloudflare Workers in minutes.",
    showScreenshot: true,
    type: "landing" as const,
  },
  {
    slug: "docs",
    title: "Documentation",
    subtitle: "Learn how to set up and customize your waitlist.",
    showScreenshot: false,
    type: "docs" as const,
  },
];

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection("docs");

  const docPages = docs.map((doc) => ({
    slug: `docs/${doc.id}`,
    title: doc.data.title,
    subtitle: doc.data.description || "0list documentation",
    showScreenshot: doc.id === "getting-started",
    type: "docs" as const,
  }));

  const allPages = [...staticPages, ...docPages];

  return allPages.map((page) => ({
    params: { slug: page.slug },
    props: page,
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title, subtitle, showScreenshot, type } = props as {
    title: string;
    subtitle: string;
    showScreenshot: boolean;
    type: "landing" | "docs";
  };

  const webp = await generateOgImage({
    title,
    subtitle,
    showScreenshot,
    type,
  });

  return new Response(webp, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

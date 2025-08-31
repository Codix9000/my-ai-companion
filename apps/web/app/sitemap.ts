import { MetadataRoute } from "next";
// import { api } from "../convex/_generated/api";
// import { ConvexHttpClient } from "convex/browser";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // const baseUrl = process.env.NEXTAUTH_URL || "https://my-ai-companion.vercel.app";
  const baseUrl = process.env.NEXTAUTH_URL;


  // Static sitemap - temporarily disabled dynamic generation
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/characters`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/models`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/crystals`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/images`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/stories`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];
}

/* 
=== ORIGINAL DYNAMIC SITEMAP CODE (COMMENTED OUT FOR LATER USE) ===

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://my-ai-companion.vercel.app";

  // Base sitemap entries
  const baseSitemap: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/models`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/crystals`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    // Check if we have the required environment variables
    if (!process.env["NEXT_PUBLIC_CONVEX_URL"]) {
      console.warn("NEXT_PUBLIC_CONVEX_URL not found, returning base sitemap");
      return baseSitemap;
    }

    // Create Convex client
    const client = new ConvexHttpClient(process.env["NEXT_PUBLIC_CONVEX_URL"]);

    
    // Set deploy key for admin access during build
    //if (process.env["CONVEX_DEPLOY_KEY"]) {
    //  client.setAuth(process.env["CONVEX_DEPLOY_KEY"]);
    //}
 
    // Fetch data with proper error handling
    const [charactersResult, imagesResult] = await Promise.allSettled([
      client.query(api.characters.listBackend, {}),
      client.query(api.public.listImages, {}),
    ]);

  // Process characters if successful
    const characterUrls: MetadataRoute.Sitemap = [];
    if (charactersResult.status === "fulfilled" && charactersResult.value) {
      characterUrls.push(
        ...charactersResult.value.map((character) => ({
          url: `${baseUrl}/character/${character._id}`,
          lastModified: new Date(character.updatedAt),
          changeFrequency: "daily" as const,
          priority: 0.8,
        }))
      );
    } else {
      console.warn("Failed to fetch characters for sitemap:", 
        charactersResult.status === "rejected" ? charactersResult.reason : "Unknown error");
    }

    // Process images if successful
    const imageUrls: MetadataRoute.Sitemap = [];
    if (imagesResult.status === "fulfilled" && imagesResult.value) {
      imageUrls.push(
        ...imagesResult.value.map((image) => ({
          url: `${baseUrl}/image/${image._id}`,
          lastModified: new Date(image._creationTime),
          changeFrequency: "daily" as const,
          priority: 0.8,
        }))
      );
    } else {
      console.warn("Failed to fetch images for sitemap:", 
        imagesResult.status === "rejected" ? imagesResult.reason : "Unknown error");
    }

    return [...baseSitemap, ...characterUrls, ...imageUrls];

  } catch (error) {
    console.error("Sitemap generation failed:", error);
    return baseSitemap;
  }
}

=== END ORIGINAL CODE ===
*/
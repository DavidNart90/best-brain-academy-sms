import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Best Brain Academy School Management",
    short_name: "Best Brain Academy",
    description:
      "Secure school administration, finance, reporting and Library operations for Best Brain Academy staff.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F3F4F8",
    theme_color: "#BD3B36",
    orientation: "any",
    categories: ["education", "business", "finance"],
    icons: [
      {
        src: "/pwa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/pwa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

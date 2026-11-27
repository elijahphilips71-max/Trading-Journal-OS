import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OS Journal",
    short_name: "OS Journal",
    description: "Your swing trading journal. Your road to a real account.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0E13",
    theme_color: "#0B0E13",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

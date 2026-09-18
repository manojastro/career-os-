import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Career OS",
    short_name: "Career OS",
    description: "A private workspace for focused career progress.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f8",
    theme_color: "#182531",
    icons: [
      { src: "/career-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/career-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

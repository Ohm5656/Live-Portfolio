import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Live Portfolio",
    short_name: "Portfolio",
    description: "Track your portfolio with live market prices and exchange rates.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0A1128",
    theme_color: "#0A1128",
    icons: [
      {
        src: "/icons/live-portfolio-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/live-portfolio-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

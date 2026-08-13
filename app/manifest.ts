import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MATT Booking PRO",
    short_name: "MATT Driver",
    description: "Panel kierowcy MATT TRANSPORT",
    start_url: "/kierowca",
    display: "standalone",
    background_color: "#0b0e13",
    theme_color: "#0b0e13",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}

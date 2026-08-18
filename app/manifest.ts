import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MATT DRIVER",
    short_name: "MATT Driver",
    description: "Panel kierowcy MATT TRANSPORT",
    start_url: "/kierowca",
    scope: "/",
    display: "standalone",
    background_color: "#090b10",
    theme_color: "#090b10",
    orientation: "portrait",
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}

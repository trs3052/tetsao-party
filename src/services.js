// Keep service links server-side and unconfigured; endpoint data is returned only by the authenticated API.
export const SERVICES = [
  { name: "Zima Admin", description: "Manage the Zima server", href: "" },
  { name: "Zima VM", description: "Virtual machines & lab", href: "" },
  { name: "Jellyseerr", description: "Request movies & shows", href: "" },
  { name: "Jellyfin", description: "Stream your media library", href: "" },
  { name: "Audiobookshelf", description: "Books, wherever you are", href: "" },
  { name: "Immich", description: "Photos & memories", href: "" },
  {
    name: "Minecraft Java Edition",
    description: "Join the server",
    href: "",
    address: "chords-mann.tun.ply.gg",
    sectionTitle: "Join Our Minecraft Server",
    subtitle: "Must share username with Tom for whitelisting."
  }
];

export const YOUTUBE_CHANNELS = [
  { name: "Sloth Slime ASMR", href: "https://www.youtube.com/@SlothSlimeASMR", description: "Slime videos and ASMR", icon: "slime" },
  { name: "Scale Trail Adventures", href: "https://www.youtube.com/@scaletrailadventures", description: "RC crawlers and trail adventures", icon: "crawler" }
];

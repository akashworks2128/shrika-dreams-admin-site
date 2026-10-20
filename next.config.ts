import type { NextConfig } from "next";
import path from "node:path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  // Keep Turbopack rooted in this project instead of accidentally selecting
  // a package-lock.json from a parent directory.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/**",
          },
        ]
      : [],
  },
};

export default nextConfig;

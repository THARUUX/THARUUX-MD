import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pjetqsuhocnrqhblgmjd.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqZXRxc3Vob2NucnFoYmxnbWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDYyMTksImV4cCI6MjEwNTk4MjIxOX0.qCtt0G5MTm2OSDrUm-1F2TQF8UaFYKajpmHPu4OU27A"
  );
}

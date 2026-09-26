import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pjetqsuhocnrqhblgmjd.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqZXRxc3Vob2NucnFoYmxnbWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDYyMTksImV4cCI6MjEwNTk4MjIxOX0.qCtt0G5MTm2OSDrUm-1F2TQF8UaFYKajpmHPu4OU27A",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can be ignored if called from Server Components
          }
        },
      },
    }
  );
}

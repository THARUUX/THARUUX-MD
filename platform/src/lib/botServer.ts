export function getBotServerUrl(): string {
  const url =
    process.env.BOT_SERVER_URL ||
    process.env.NEXT_PUBLIC_BOT_API_URL ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

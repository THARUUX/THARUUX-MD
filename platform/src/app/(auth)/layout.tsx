import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f5f5f7] dark:bg-[#09090b] relative">
      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>

      <div className="w-full max-w-md">{children}</div>

      <div className="mt-8 text-center text-xs text-zinc-400">
        Powered by <strong className="text-zinc-600 dark:text-zinc-300">THARUUX &amp; ZYNEX Developments</strong>
      </div>
    </div>
  );
}

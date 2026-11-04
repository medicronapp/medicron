"use client";
import { ErrorView } from "@/components/error-view";

// Pega falhas no layout de (app) (ex.: banco fora do ar), que o error.tsx do próprio segmento não cobre.
export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <div className="w-full"><ErrorView retry={retry} /></div>
    </main>
  );
}

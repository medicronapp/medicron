"use client";
import "./globals.css";
import { ErrorView } from "@/components/error-view";

// Último recurso: substitui o layout raiz quando ele mesmo falha.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
          <div className="w-full"><ErrorView retry={retry} /></div>
        </main>
      </body>
    </html>
  );
}

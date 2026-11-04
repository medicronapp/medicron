"use client";
import { ErrorView } from "@/components/error-view";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView retry={retry} />;
}

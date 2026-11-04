export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <div className="text-center">
        <div className="text-4xl">🐱</div>
        <h1 className="text-2xl font-semibold">Medicron</h1>
        <p className="text-sm text-muted-foreground">Horários de remédios e cuidados dos seus gatos</p>
      </div>
      {children}
    </main>
  );
}

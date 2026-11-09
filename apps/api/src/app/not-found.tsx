export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-2 px-4">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">
        Este endereço é da API do Medicron. O aplicativo está em <a className="underline" href="https://medicron.com.br">medicron.com.br</a>.
      </p>
    </main>
  );
}

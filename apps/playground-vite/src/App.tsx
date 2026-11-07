export function App() {
  return (
    <main className="min-h-screen bg-neshel-background p-10 text-neshel-foreground">
      <div className="mx-auto max-w-2xl rounded-2xl border border-neshel-border bg-neshel-surface p-8">
        <p className="text-sm font-medium text-neshel-primary">Neshel-UI</p>
        <h1 className="mt-3 text-3xl font-semibold">Foundation playground</h1>
        <p className="mt-3 text-sm">
          Tokens and Tailwind v4 can render here. Components arrive in a future Spec Kit slice.
        </p>
        <button
          type="button"
          onClick={() => {
            const root = document.documentElement;
            root.dataset.neshelTheme = root.dataset.neshelTheme === "dark" ? "light" : "dark";
          }}
          className="mt-6 rounded-lg bg-neshel-primary px-4 py-2 font-medium text-neshel-primary-foreground"
        >
          Toggle sample theme
        </button>
      </div>
    </main>
  );
}

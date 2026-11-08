import { useState } from "react";

type Choice = "none" | "light" | "dark" | "system";
const choices: readonly Choice[] = ["none", "light", "dark", "system"];

function applyTheme(choice: Choice) {
  const root = document.documentElement;
  if (choice === "none") delete root.dataset.neshelTheme;
  else root.dataset.neshelTheme = choice;
}

export function App() {
  const [choice, setChoice] = useState<Choice>("none");
  return (
    <main className="min-h-screen bg-neshel-background p-10 font-neshel-body text-neshel-foreground">
      <div className="mx-auto max-w-2xl rounded-neshel-xl border border-neshel-border bg-neshel-surface p-8 text-neshel-surface-foreground">
        <p className="text-sm font-medium text-neshel-primary">Neshel-UI</p>
        <h1 className="mt-3 font-neshel-display text-3xl font-semibold">Token playground</h1>
        <p className="mt-3 text-sm text-neshel-muted-foreground">
          Themes switch with one attribute; no provider. Without an attribute the page is light.
        </p>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Root theme</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {choices.map((value) => (
              <label
                key={value}
                className="flex items-center gap-2 rounded-neshel-md border border-neshel-input px-3 py-1 text-sm"
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={choice === value}
                  onChange={() => {
                    setChoice(value);
                    applyTheme(value);
                  }}
                  className="accent-neshel-primary focus-visible:outline-2 focus-visible:outline-neshel-focus"
                />
                {value === "none" ? "no attribute" : value}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-neshel-md bg-neshel-primary px-4 py-2 font-medium text-neshel-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neshel-focus"
          >
            Primary
          </button>
          <span className="rounded-neshel-full bg-neshel-accent px-3 py-2 text-sm text-neshel-accent-foreground">
            Accent
          </span>
          <span className="rounded-neshel-md bg-neshel-selected px-3 py-2 text-sm text-neshel-selected-foreground">
            Selected
          </span>
        </div>

        <section
          data-neshel-theme="dark"
          className="mt-8 rounded-neshel-lg bg-neshel-background p-6 text-neshel-foreground"
        >
          <h2 className="font-semibold">Nested dark scope</h2>
          <p className="mt-1 text-sm text-neshel-muted-foreground">
            Always dark, whatever the root theme.
          </p>
        </section>
      </div>
    </main>
  );
}

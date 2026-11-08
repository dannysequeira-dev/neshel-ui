import { type ColorRole, colorRoles, contrastPairs, defaults } from "@neshel-ui/config";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";

const variable = (role: ColorRole) =>
  `--neshel-${role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
const swatch = (role: ColorRole): CSSProperties => ({ background: `var(${variable(role)})` });

type Theme = "light" | "dark";

function Palette({ theme }: { theme: Theme }) {
  return (
    <section
      data-neshel-theme={theme}
      className="rounded-neshel-lg border border-neshel-border bg-neshel-background p-6 font-neshel-body text-neshel-foreground"
    >
      <h2 className="font-neshel-display text-xl font-semibold">Colour roles — {theme}</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {colorRoles.map((role) => (
          <li key={role} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="size-8 rounded-neshel-sm border border-neshel-border"
              style={swatch(role)}
            />
            <span className="text-sm">
              <code className="font-neshel-mono">{variable(role)}</code>
              <br />
              <span className="text-neshel-muted-foreground">{defaults.themes[theme][role]}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pairs({ theme }: { theme: Theme }) {
  return (
    <section
      data-neshel-theme={theme}
      className="rounded-neshel-lg border border-neshel-border bg-neshel-background p-6 text-neshel-foreground"
    >
      <h2 className="text-xl font-semibold">Contrast pairs — {theme}</h2>
      <p className="mt-1 text-sm text-neshel-muted-foreground">
        Minimums are WCAG 2.1 ratios enforced by the CLI tests. Passing them does not by itself make
        an interface conformant.
      </p>
      <ul className="mt-4 grid gap-2">
        {contrastPairs.map((pair) => {
          const label = `${pair.foreground} on ${pair.background}`;
          const style: CSSProperties = {
            color: `var(${variable(pair.foreground)})`,
            background: `var(${variable(pair.background)})`,
          };
          return (
            <li key={label} className="flex items-center justify-between gap-4">
              {pair.minimum === null ? (
                // Exempt pair (inactive UI): rendered as a real disabled control.
                <button
                  type="button"
                  disabled
                  className="rounded-neshel-sm px-3 py-1"
                  style={style}
                >
                  {label} (exempt)
                </button>
              ) : (
                <span className="rounded-neshel-sm px-3 py-1" style={style}>
                  {label}
                </span>
              )}
              <span className="text-sm text-neshel-muted-foreground">
                {pair.minimum === null ? "exempt" : `≥ ${pair.minimum}:1 (${pair.criterion})`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Precedence() {
  return (
    <div
      data-neshel-theme="system"
      className="grid gap-4 bg-neshel-background p-6 text-neshel-foreground"
    >
      <p>
        <code className="font-neshel-mono">data-neshel-theme="system"</code> follows the OS
        preference.
      </p>
      <div
        data-neshel-theme="dark"
        className="rounded-neshel-md bg-neshel-surface p-4 text-neshel-surface-foreground"
      >
        Nested <code className="font-neshel-mono">dark</code> scope
        <div
          data-neshel-theme="light"
          className="mt-3 rounded-neshel-md bg-neshel-surface p-4 text-neshel-surface-foreground"
        >
          Nested <code className="font-neshel-mono">light</code> scope inside dark
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: "Foundations/Tokens",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const LightPalette: Story = { render: () => <Palette theme="light" /> };
export const DarkPalette: Story = { render: () => <Palette theme="dark" /> };
export const LightContrastPairs: Story = { render: () => <Pairs theme="light" /> };
export const DarkContrastPairs: Story = { render: () => <Pairs theme="dark" /> };
export const ThemePrecedence: Story = { render: () => <Precedence /> };

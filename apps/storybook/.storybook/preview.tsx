import type { Decorator, Preview } from "@storybook/react-vite";
import "../src/styles.css";

/** Theme toolbar: sets `data-neshel-theme` on a wrapper, exactly like an application would. */
const withTheme: Decorator = (Story, context) => {
  const theme = String(context.globals.theme ?? "light");
  return (
    <div
      data-neshel-theme={theme}
      className="min-h-full bg-neshel-background p-4 font-neshel-body text-neshel-foreground"
    >
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Neshel theme (data-neshel-theme)",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "system", title: "System" },
          { value: "sepia", title: "Sepia (custom)" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: {
    controls: { expanded: true },
    a11y: { test: "todo" },
  },
};

export default preview;

import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  // Applies to `storybook dev` and `storybook build`, locally and in CI.
  core: { disableTelemetry: true },
  viteFinal: async (config) => mergeConfig(config, { plugins: [tailwindcss()] }),
};

export default config;

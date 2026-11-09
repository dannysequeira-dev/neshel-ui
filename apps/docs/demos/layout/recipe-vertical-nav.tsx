import { Stack } from "@neshel-ui/layout";
import { Caption, Text } from "@neshel-ui/typography";

const sections = [
  { title: "Account", links: ["Profile", "Security"] },
  { title: "Workspace", links: ["Members", "Billing", "Integrations"] },
];

/** Vertical navigation built from layout primitives only (no Sidebar behaviour needed). */
export default function RecipeVerticalNav() {
  return (
    <Stack as="nav" aria-label="Settings" space="5" className="max-w-56">
      {sections.map((section) => (
        <Stack key={section.title} space="2">
          <Caption as="span">{section.title}</Caption>
          <Stack as="ul" space="1">
            {section.links.map((link, index) => (
              <li key={link}>
                <Text asChild size="sm" weight={index === 0 ? "semibold" : "regular"}>
                  <a
                    href={`#${link.toLowerCase()}`}
                    aria-current={index === 0 ? "page" : undefined}
                  >
                    {link}
                  </a>
                </Text>
              </li>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

"use client";
import { Button } from "@neshel-ui/components";
import { Inline, Stack } from "@neshel-ui/layout";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function ButtonSizes() {
  const [saving, setSaving] = useState(false);
  return (
    <Stack space="4">
      <Inline space="3" align="center" wrap>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        {/* Responsive: small on phones, medium from md, large from lg. */}
        <Button size={{ base: "sm", md: "md", lg: "lg" }}>Responsive</Button>
      </Inline>
      <Inline space="3" align="center" wrap>
        <Button iconOnly aria-label="Add item" variant="outline">
          <Plus aria-hidden="true" />
        </Button>
        <Button
          loading={saving}
          onClick={() => {
            setSaving(true);
            setTimeout(() => setSaving(false), 1500);
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button asChild variant="link">
          <a href="#api-buttonprops">Read the API</a>
        </Button>
      </Inline>
    </Stack>
  );
}

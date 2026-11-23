"use client";
import { Button, createToaster, Toaster } from "@neshel-ui/components";

// One store for the application; no provider. Create it once (module scope or a memo).
const toaster = createToaster({ max: 3 });

export default function ToastBasic() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Button variant="outline" onClick={() => toaster.show({ title: "Draft saved" })}>
        Neutral
      </Button>
      <Button
        variant="outline"
        onClick={() => toaster.show({ title: "Payment received", tone: "success" })}
      >
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() => toaster.show({ title: "Upload failed", tone: "error" })}
      >
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toaster.show({
            title: "Message archived",
            action: { label: "Undo", onAction: () => toaster.show({ title: "Restored" }) },
          })
        }
      >
        With action
      </Button>
      <Toaster toaster={toaster} />
    </div>
  );
}

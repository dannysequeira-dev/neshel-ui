"use client";
import { Button, createToaster, Toaster } from "@neshel-ui/components";

const toaster = createToaster({ max: 2, overflow: "queue" });

function upload() {
  // The same id: the second call replaces the content of the first toast.
  toaster.show({ id: "upload", title: "Uploading…", duration: Number.POSITIVE_INFINITY });
  setTimeout(() => toaster.show({ id: "upload", title: "Uploaded", tone: "success" }), 1500);
}

export default function ToastQueue() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Button variant="outline" onClick={upload}>
        Update one toast
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          for (const name of ["One", "Two", "Three"]) toaster.show({ title: `File ${name}` });
        }}
      >
        Queue three
      </Button>
      <Toaster toaster={toaster} placement="bottom-start" label="Uploads" hotkey="F7" />
    </div>
  );
}

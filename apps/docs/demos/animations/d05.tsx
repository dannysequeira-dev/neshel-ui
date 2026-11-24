"use client";
import "@neshel-ui/animations/advanced.css";
import { CornerRecede } from "@neshel-ui/animations/advanced";

export default function D05Example() {
  return (
    <CornerRecede className="h-40 w-64">
      <div className="h-full w-full rounded-xl bg-neshel-primary p-4 text-neshel-primary-foreground">
        <p>The corner under the pointer folds away.</p>
        <a href="#d05" className="underline">
          Read more
        </a>
      </div>
    </CornerRecede>
  );
}

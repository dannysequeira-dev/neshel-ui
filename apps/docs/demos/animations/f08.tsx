"use client";
import "@neshel-ui/animations/feedback.css";
import { OptimisticPulse, type OptimisticStatus } from "@neshel-ui/animations/feedback";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function F08Example() {
  const [status, setStatus] = useState<OptimisticStatus>("idle");
  const [likes, setLikes] = useState(10);
  return (
    <div className="flex flex-wrap gap-2">
      <OptimisticPulse status={status} onRollback={() => setLikes((n) => n - 1)}>
        <Button
          variant="outline"
          onClick={() => {
            setLikes((n) => n + 1);
            setStatus("pending");
          }}
        >
          Likes: {likes}
        </Button>
      </OptimisticPulse>
      <Button variant="outline" onClick={() => setStatus("confirmed")}>
        Server confirms
      </Button>
      <Button variant="outline" onClick={() => setStatus("failed")}>
        Server fails
      </Button>
    </div>
  );
}

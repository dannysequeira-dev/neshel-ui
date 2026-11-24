"use client";
import "@neshel-ui/animations/press.css";
import { burst, Press } from "@neshel-ui/animations/press";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function P06Example() {
  const [likes, setLikes] = useState(0);
  return (
    <Press preset={burst} options={{ trigger: likes, count: 14 }} asChild>
      <Button variant="outline" onClick={() => setLikes(likes + 1)}>
        Like ({likes})
      </Button>
    </Press>
  );
}

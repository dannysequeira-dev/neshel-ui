"use client";
import "@neshel-ui/animations/gestures.css";
import { Reorder, ReorderHandle, ReorderItem } from "@neshel-ui/animations/gestures";
import { useState } from "react";

export default function G10Example() {
  const [tasks, setTasks] = useState(["Draft", "Review", "Translate", "Publish"]);
  return (
    <Reorder
      onReorder={(from, to) =>
        setTasks((all) => all.toSpliced(from, 1).toSpliced(to, 0, all[from] as string))
      }
      className="grid max-w-sm gap-2"
    >
      {tasks.map((task, index) => (
        <ReorderItem
          key={task}
          index={index}
          label={task}
          className="flex items-center gap-3 rounded-lg bg-neshel-muted p-3"
        >
          <ReorderHandle /> {task}
        </ReorderItem>
      ))}
    </Reorder>
  );
}

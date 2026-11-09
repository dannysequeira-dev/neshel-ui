"use client";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Select,
} from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { useState } from "react";

const themes = [
  { value: "default", label: "Neshel (default)" },
  { value: "evergreen", label: "Evergreen" },
  { value: "aurora", label: "Aurora" },
  { value: "dark", label: "Dark" },
];

/** Interactive showcase on the home page: real components, a theme scope switched by a Select. */
export function HomeDemo({
  labels,
}: {
  labels: {
    theme: string;
    title: string;
    description: string;
    open: string;
    body: string;
    close: string;
  };
}) {
  const [theme, setTheme] = useState<string | null>("default");
  return (
    <div
      data-neshel-theme={theme === "default" || theme === null ? undefined : theme}
      className="rounded-2xl bg-[var(--neshel-background)] p-6 text-[var(--neshel-foreground)]"
    >
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Stack space="2">
            <Label htmlFor="home-theme">{labels.theme}</Label>
            <Select id="home-theme" options={themes} value={theme} onValueChange={setTheme} />
          </Stack>
        </CardContent>
        <CardFooter>
          <Dialog>
            <DialogTrigger asChild>
              <Button>{labels.open}</Button>
            </DialogTrigger>
            <DialogContent size="sm">
              <DialogHeader>
                <DialogTitle>{labels.title}</DialogTitle>
                <DialogDescription>{labels.body}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{labels.close}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="ghost">Ghost</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@neshel-ui/components";
import { Inline, Stack } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { PlusIcon } from "./icons";

const meta = {
  title: "Components/Overlays",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Radix-based dialogs, alert dialogs, sheets, popovers and tooltips. Focus moves into the overlay and returns to the trigger; Escape closes the innermost layer. Portals copy the theme of the trigger's nearest `data-neshel-theme` (try the theme toolbar). Selection popups opened inside an overlay render inside it.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const countries = [
  { value: "cr", label: "Costa Rica" },
  { value: "es", label: "Spain" },
  { value: "jp", label: "Japan" },
];

export const DialogUncontrolled: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your account information.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Stack space="3">
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" defaultValue="Ana" />
            <Label htmlFor="profile-country">Country</Label>
            <Select id="profile-country" options={countries} placeholder="Choose a country" />
          </Stack>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

function ControlledDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Stack space="3">
      <Inline space="3" alignY="center">
        <Button onClick={() => setOpen(true)}>Open (controlled)</Button>
        <output>open: {String(open)}</output>
      </Inline>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm" aria-describedby={undefined}>
          <DialogTitle>Controlled dialog</DialogTitle>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

export const DialogControlled: Story = { render: () => <ControlledDialog /> };

export const NestedDialogs: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>First dialog</DialogTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">Open nested</Button>
          </DialogTrigger>
          <DialogContent size="sm" aria-describedby={undefined}>
            <DialogTitle>Nested dialog</DialogTitle>
            <DialogClose asChild>
              <Button>Done</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  ),
};

export const AlertDialogDestructive: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete project</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the project and its data. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const Sheets: Story = {
  render: () => (
    <Inline space="3">
      {(["left", "right", "top", "bottom"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline">{side}</Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Filters ({side})</SheetTitle>
              <SheetDescription>Narrow the results.</SheetDescription>
            </SheetHeader>
            <Input aria-label="Keyword" placeholder="Keyword" />
          </SheetContent>
        </Sheet>
      ))}
    </Inline>
  ),
};

export const PopoverAndTooltip: Story = {
  render: () => (
    <Inline space="3" alignY="center">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Details</Button>
        </PopoverTrigger>
        <PopoverContent>
          <Stack space="2">
            <strong>Popover</strong>
            <span>Anchored, collision-aware content.</span>
          </Stack>
        </PopoverContent>
      </Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button iconOnly variant="ghost" aria-label="Add item">
            <PlusIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add item</TooltipContent>
      </Tooltip>
    </Inline>
  ),
};

/** The dialog opened inside the dark region computes the dark tokens through its portal. */
export const NestedThemePortal: Story = {
  render: () => (
    <Inline space="4">
      <div data-neshel-theme="dark" style={{ padding: 16, background: "var(--neshel-background)" }}>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Dark region dialog</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Inherits the dark theme</DialogTitle>
            <Select options={countries} aria-label="Country" placeholder="Choose" />
          </DialogContent>
        </Dialog>
      </div>
      <div
        data-neshel-theme="sepia"
        style={{ padding: 16, background: "var(--neshel-background)" }}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Sepia region popover</Button>
          </PopoverTrigger>
          <PopoverContent>Inherits the sepia theme.</PopoverContent>
        </Popover>
      </div>
    </Inline>
  ),
};

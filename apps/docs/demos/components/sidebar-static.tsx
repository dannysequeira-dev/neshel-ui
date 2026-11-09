import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
} from "@neshel-ui/components";
import { Text } from "@neshel-ui/typography";
import { FileText, Inbox } from "lucide-react";

/** Outside an AppShell a Sidebar renders statically expanded (no drawer, no collapse). */
export default function SidebarStatic() {
  return (
    <Sidebar
      aria-label="Mailbox"
      className="!h-auto max-w-64 rounded-lg border border-[var(--neshel-border)]"
    >
      <SidebarHeader>
        <Text weight="semibold">Mail</Text>
      </SidebarHeader>
      <SidebarContent aria-label="Folders">
        <SidebarGroup label="Folders">
          <SidebarItem active icon={<Inbox aria-hidden="true" />}>
            Inbox
          </SidebarItem>
          <SidebarItem icon={<FileText aria-hidden="true" />}>Drafts</SidebarItem>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

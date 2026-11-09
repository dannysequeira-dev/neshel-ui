import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@neshel-ui/components";

export default function NavigationMenuBasic() {
  return (
    <NavigationMenu aria-label="Products">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#analytics">
              <strong>Analytics</strong>
              <span>Dashboards and reports</span>
            </NavigationMenuLink>
            <NavigationMenuLink href="#billing">
              <strong>Billing</strong>
              <span>Invoices and plans</span>
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#pricing" active>
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

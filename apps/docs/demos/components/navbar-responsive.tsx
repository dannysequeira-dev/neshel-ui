import {
  Button,
  MobileMenu,
  MobileMenuContent,
  MobileMenuLink,
  MobileMenuNav,
  MobileMenuTrigger,
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarLink,
  NavbarNav,
} from "@neshel-ui/components";

const links = [
  { href: "#home", label: "Home", active: true },
  { href: "#docs", label: "Docs" },
  { href: "#blog", label: "Blog" },
];

/** Desktop links from md; below md the MobileMenu trigger replaces them (never both). */
export default function NavbarResponsive() {
  return (
    <Navbar>
      <NavbarBrand asChild>
        <a href="#home">Acme</a>
      </NavbarBrand>
      <NavbarNav hideBelow="md">
        {links.map((link) => (
          <NavbarLink key={link.href} href={link.href} active={link.active}>
            {link.label}
          </NavbarLink>
        ))}
      </NavbarNav>
      <NavbarActions>
        <Button size="sm">Sign in</Button>
        <MobileMenu breakpoint="md">
          <MobileMenuTrigger />
          <MobileMenuContent>
            <MobileMenuNav>
              {links.map((link) => (
                <MobileMenuLink key={link.href} href={link.href} active={link.active}>
                  {link.label}
                </MobileMenuLink>
              ))}
            </MobileMenuNav>
          </MobileMenuContent>
        </MobileMenu>
      </NavbarActions>
    </Navbar>
  );
}

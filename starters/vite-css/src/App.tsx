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
  Input,
  Label,
} from "@neshel-ui/components";
import { Container, Inline, Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";

const themes = ["light", "dark", "system"] as const;

export function App() {
  return (
    <Container size="md" gutter={{ base: "4", md: "8" }} className="page">
      <Stack space="8">
        <Stack space="3">
          <Heading as="h1" size={{ base: "2xl", md: "4xl" }}>
            Hello, Neshel-UI
          </Heading>
          <Paragraph tone="muted" measure="comfortable">
            A starter with React, Vite and plain CSS — no Tailwind. Edit <code>src/App.tsx</code>
            and <code>src/index.css</code>.
          </Paragraph>
          <Inline space="2" wrap>
            {themes.map((theme) => (
              <Button
                key={theme}
                size="sm"
                variant="outline"
                onClick={() => {
                  document.documentElement.dataset.neshelTheme = theme;
                }}
              >
                {theme}
              </Button>
            ))}
          </Inline>
        </Stack>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Subscribe</CardTitle>
            <CardDescription>Neshel components with your own CSS classes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Stack space="2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" className="email-field" />
            </Stack>
          </CardContent>
          <CardFooter>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Subscribe</Button>
              </DialogTrigger>
              <DialogContent size="sm">
                <DialogHeader>
                  <DialogTitle>Thank you</DialogTitle>
                  <DialogDescription>You are subscribed.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button>Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </Stack>
    </Container>
  );
}

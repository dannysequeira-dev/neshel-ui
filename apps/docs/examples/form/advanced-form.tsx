"use client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  Input,
  Label,
  MultiSelect,
  Select,
} from "@neshel-ui/components";
import { Grid, Inline, Stack } from "@neshel-ui/layout";
import { Caption, Heading, Paragraph, Text } from "@neshel-ui/typography";
import { type FormEvent, useState } from "react";
import { cities, countries, roles, skills } from "./options";

type Errors = Partial<Record<"email" | "country" | "skills", string>>;

/**
 * Native form submission with FormData. Uncontrolled: email, name, city, role (defaultValue).
 * Controlled: country (drives the city list) and skills (validated as you change them).
 */
export function AdvancedForm() {
  const [country, setCountry] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState<Record<string, string | string[]> | null>(null);

  const cityItems = country ? (cities[country] ?? []) : [];

  function validate(data: FormData): Errors {
    const next: Errors = {};
    const email = String(data.get("email") ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Enter a valid email address.";
    if (!data.get("country")) next.country = "Choose a country.";
    if (data.getAll("skills").length < 2) next.skills = "Choose at least two skills.";
    return next;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = validate(data);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setSubmitted(null);
      return;
    }
    const result: Record<string, string | string[]> = {};
    for (const key of new Set(data.keys())) {
      const values = data.getAll(key).map(String);
      result[key] = values.length > 1 ? values : (values[0] ?? "");
    }
    setSubmitted(result);
  }

  return (
    <Grid columns={{ base: 1, lg: 3 }} space="8">
      <form noValidate onSubmit={onSubmit} className="lg:col-span-2" aria-labelledby="form-title">
        <Stack space="6">
          <Stack space="2">
            <Heading as="h2" size="xl" id="form-title">
              Join the beta
            </Heading>
            <Paragraph tone="muted" size="sm">
              Fields marked with * are required.
            </Paragraph>
          </Stack>

          <Grid columns={{ base: 1, md: 2 }} spaceX="4" spaceY="5">
            <Stack space="2">
              <Label htmlFor="beta-name">Full name</Label>
              <Input id="beta-name" name="name" autoComplete="name" defaultValue="Ana Rojas" />
            </Stack>
            <Stack space="2">
              <Label htmlFor="beta-email" required>
                Email
              </Label>
              <Input
                id="beta-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "beta-email-error" : undefined}
              />
              {errors.email ? (
                <Caption id="beta-email-error" tone="destructive">
                  {errors.email}
                </Caption>
              ) : null}
            </Stack>

            <Stack space="2">
              <Label htmlFor="beta-country" required>
                Country
              </Label>
              <Select
                id="beta-country"
                name="country"
                options={countries}
                value={country}
                onValueChange={setCountry}
                placeholder="Select a country"
                required
                invalid={Boolean(errors.country)}
                aria-describedby={errors.country ? "beta-country-error" : undefined}
              />
              {errors.country ? (
                <Caption id="beta-country-error" tone="destructive">
                  {errors.country}
                </Caption>
              ) : null}
            </Stack>
            <Stack space="2">
              <Label htmlFor="beta-city">City</Label>
              <Combobox
                key={country ?? "none"}
                id="beta-city"
                name="city"
                items={cityItems}
                disabled={!country}
                placeholder={country ? "Search a city" : "Choose a country first"}
              />
            </Stack>
          </Grid>

          <Stack space="2">
            <Label htmlFor="beta-skills" required>
              Skills
            </Label>
            <MultiSelect
              id="beta-skills"
              name="skills"
              options={skills}
              value={selectedSkills}
              onValueChange={(value) => {
                setSelectedSkills(value);
                if (errors.skills && value.length >= 2)
                  setErrors((e) => ({ ...e, skills: undefined }));
              }}
              placeholder="Select at least two"
              invalid={Boolean(errors.skills)}
              aria-describedby="beta-skills-hint"
            />
            <Caption id="beta-skills-hint" tone={errors.skills ? "destructive" : "muted"}>
              {errors.skills ?? `${selectedSkills.length} selected`}
            </Caption>
          </Stack>

          <Stack space="2">
            <Label htmlFor="beta-role">Role</Label>
            <Select id="beta-role" name="role" options={roles} defaultValue="engineer" />
          </Stack>

          <Inline space="3" justify="end">
            <Button
              type="reset"
              variant="ghost"
              onClick={() => {
                setCountry(null);
                setSelectedSkills([]);
                setErrors({});
                setSubmitted(null);
              }}
            >
              Reset
            </Button>
            <Button type="submit">Submit</Button>
          </Inline>
        </Stack>
      </form>

      <Card variant="muted" aria-live="polite">
        <CardHeader>
          <CardTitle as="h3">Submitted FormData</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <pre className="m-0 overflow-x-auto text-sm">
              <code>{JSON.stringify(submitted, null, 2)}</code>
            </pre>
          ) : (
            <Text tone="muted" size="sm">
              Submit the form to see the values the browser sends.
            </Text>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
}

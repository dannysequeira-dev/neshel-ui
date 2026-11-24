"use client";
/**
 * Switch (feature 017, contracts/switch-api.md) on Base UI Switch (no new dependency): a native `<button
 * role="switch" aria-checked>` (Space/Enter, click, touch) with a hidden input that takes part in forms (`name`,
 * `value`, `required`, reset). Associate a `<Label htmlFor>` with its `id`. Sizes follow Input/Select (`uiSize`).
 * Focus-visible ring, forced-colours outline and reduced motion (thumb moves without a transition).
 */
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { type ButtonHTMLAttributes, type Ref, useEffect, useRef, useState } from "react";
import { cx, oneOf } from "./internal/validate.js";
import type { FieldSize } from "./types.js";

export interface SwitchProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "value" | "defaultValue" | "onChange" | "type" | "children" | "name" | "form" | "dir"
  > {
  /** Id of the switch button; associate a `<Label htmlFor>` with it. */
  id?: string;
  /** Controlled state. */
  checked?: boolean;
  /** Initial state when uncontrolled (default false). */
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** The form cannot be submitted while the switch is off. */
  required?: boolean;
  /** Keeps focus and announcements but ignores toggling. */
  readOnly?: boolean;
  /** Form field name; submitted only while the switch is on. */
  name?: string;
  /** Submitted value while on (default `"on"`, like a checkbox). */
  value?: string;
  form?: string;
  /** Marks the switch `aria-invalid`. Describe the error with `aria-describedby`. */
  invalid?: boolean;
  /** Size (default `"md"`), consistent with Input and Select. */
  uiSize?: FieldSize;
  ref?: Ref<HTMLButtonElement>;
}

const SIZES: readonly FieldSize[] = ["sm", "md", "lg"];

export function Switch({
  id,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  required,
  readOnly,
  name,
  value = "on",
  form,
  invalid,
  uiSize,
  className,
  ref,
  ...rest
}: SwitchProps) {
  const size = oneOf("Switch", "uiSize", uiSize, SIZES, "md");
  // Uncontrolled state lives here so a form reset restores `defaultChecked` (like a native checkbox).
  const [inner, setInner] = useState(defaultChecked ?? false);
  const controlled = checked !== undefined;
  const input = useRef<HTMLInputElement | null>(null);
  const initial = useRef(defaultChecked ?? false);
  useEffect(() => {
    const owner = input.current?.form;
    if (!owner || controlled) return;
    const onReset = () => setInner(initial.current);
    owner.addEventListener("reset", onReset);
    return () => owner.removeEventListener("reset", onReset);
  }, [controlled]);
  return (
    <BaseSwitch.Root
      // Button attributes; Base UI types them for its default <span>, we render a native <button>.
      {...(rest as Record<string, unknown>)}
      id={id}
      ref={ref as Ref<HTMLElement>}
      nativeButton
      render={<button type="button" />}
      inputRef={input}
      checked={controlled ? checked : inner}
      onCheckedChange={(next) => {
        if (!controlled) setInner(next);
        onCheckedChange?.(next);
      }}
      disabled={disabled}
      required={required}
      readOnly={readOnly}
      name={name}
      value={value}
      form={form}
      aria-invalid={invalid || undefined}
      className={cx("neshel-switch", `neshel-switch-size-${size}`, className)}
    >
      <BaseSwitch.Thumb className="neshel-switch-thumb" />
    </BaseSwitch.Root>
  );
}

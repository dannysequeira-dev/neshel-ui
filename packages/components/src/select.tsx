"use client";
/**
 * Select (FR-070) and MultiSelect (FR-075) on Base UI Select (ADR 0012, research R13–R15).
 * String values; Base UI parts and event details are not exposed.
 */
import { Select as BaseSelect } from "@base-ui/react/select";
import { type ReactNode, type Ref, useContext, useEffect, useRef, useState } from "react";
import { componentsError } from "./internal/errors.js";
import { CheckIcon, ChevronDownIcon, CloseIcon } from "./internal/icons.js";
import {
  composeRefs,
  LayerContainerContext,
  SELECTION_POPUP_ATTRIBUTE,
  TriggerContext,
  useLivePortalTheme,
  usePopupName,
  useTriggerRegistry,
} from "./internal/layer.js";
import { cx, flag } from "./internal/validate.js";
import { fieldSizeClass } from "./primitives.js";
import type { FieldSize } from "./types.js";

export interface SelectOption {
  /** Value submitted with the form and passed to `onValueChange`. */
  value: string;
  /** Visible text (also used for typeahead and chips). */
  label: string;
  disabled?: boolean;
}
export interface SelectOptionGroup {
  /** Visible text (also used for typeahead and chips). */
  label: string;
  /** Options of the group. */
  options: readonly SelectOption[];
}
export type SelectOptions = readonly (SelectOption | SelectOptionGroup)[];

/** Props shared by Select, MultiSelect and Combobox. */
export interface SelectFieldProps {
  /** Id of the focusable control; associate a `<Label htmlFor>` with it. */
  id?: string;
  /** Form field name; one entry per selected value. */
  name?: string;
  form?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Marks the control `aria-invalid`. Describe the error with `aria-describedby`. */
  invalid?: boolean;
  /** Text shown when nothing is selected. */
  placeholder?: string;
  /** Field size (default `"md"`). */
  uiSize?: FieldSize;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Portal target for the popup (default: the enclosing Neshel overlay, else `document.body`). */
  container?: HTMLElement | null;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  className?: string;
}

export interface SelectProps extends SelectFieldProps {
  /** Options, flat or grouped. */
  options: SelectOptions;
  /** Controlled selected value (`null` = none). */
  value?: string | null;
  /** Initial selected value when uncontrolled. */
  defaultValue?: string | null;
  /** Called with the new value. */
  onValueChange?: (value: string | null) => void;
  ref?: Ref<HTMLButtonElement>;
}

export interface MultiSelectProps extends SelectFieldProps {
  /** Options, flat or grouped. */
  options: SelectOptions;
  /** Controlled selected values. */
  value?: readonly string[];
  /** Initial selected values when uncontrolled. */
  defaultValue?: readonly string[];
  /** Called with the new list of values. */
  onValueChange?: (value: string[]) => void;
  /** Show removable chips for the selected values (default true). */
  chips?: boolean;
  /** Show a "clear all" button when values are selected (default true). */
  clearable?: boolean;
  /** Accessible name of the clear-all button (default `"Clear selection"`). */
  clearLabel?: string;
  /** Accessible name of a chip's remove button (default: `Remove <label>`). */
  removeLabel?: (label: string) => string;
  /** Live-region announcement after a removal (default: `<label> removed`). */
  removedMessage?: (label: string) => string;
  /** Trigger text for the selection count (default: `<n> selected`). */
  summary?: (count: number) => string;
  ref?: Ref<HTMLButtonElement>;
}

const isGroup = (entry: SelectOption | SelectOptionGroup): entry is SelectOptionGroup =>
  Array.isArray((entry as SelectOptionGroup).options);

/** Validated, flattened options (throws for malformed entries or duplicate values). */
export function flattenOptions(component: string, options: unknown): SelectOption[] {
  if (!Array.isArray(options)) {
    throw componentsError(component, `"options" must be an array of options or option groups.`);
  }
  const flat: SelectOption[] = [];
  const seen = new Set<string>();
  const add = (option: unknown) => {
    const candidate = option as SelectOption;
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      typeof candidate.value !== "string" ||
      typeof candidate.label !== "string"
    ) {
      throw componentsError(
        component,
        `every option needs a string "value" and "label" (received ${JSON.stringify(option)}).`,
      );
    }
    if (seen.has(candidate.value)) {
      throw componentsError(
        component,
        `duplicate option value ${JSON.stringify(candidate.value)}.`,
      );
    }
    seen.add(candidate.value);
    flat.push(candidate);
  };
  for (const entry of options as SelectOptions) {
    if (entry && isGroup(entry)) entry.options.forEach(add);
    else add(entry);
  }
  return flat;
}

/** Portal shared by the selection popups: theme wrapper + Neshel overlay container. */
export function SelectionPortal({
  container,
  Portal,
  children,
}: {
  container: HTMLElement | null | undefined;
  Portal: typeof BaseSelect.Portal;
  children: ReactNode;
}) {
  const layer = useContext(LayerContainerContext);
  const theme = useLivePortalTheme();
  return (
    <Portal
      container={container ?? layer ?? undefined}
      className="neshel-portal"
      data-neshel-portal=""
      data-neshel-theme={theme}
    >
      {children}
    </Portal>
  );
}

/** `positionMethod` for popups inside a Neshel overlay: fixed, so overflow does not clip them. */
export function usePositionMethod(container: HTMLElement | null | undefined): "fixed" | "absolute" {
  const layer = useContext(LayerContainerContext);
  return container === undefined && layer ? "fixed" : "absolute";
}

function OptionItem({ option }: { option: SelectOption }) {
  return (
    <BaseSelect.Item
      value={option.value}
      label={option.label}
      disabled={option.disabled}
      className="neshel-select-item"
    >
      <BaseSelect.ItemIndicator className="neshel-select-item-indicator">
        <CheckIcon />
      </BaseSelect.ItemIndicator>
      <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}

function OptionList({ options }: { options: SelectOptions }) {
  return (
    <>
      {options.map((entry, index) =>
        isGroup(entry) ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: group labels may repeat; order is stable.
          <BaseSelect.Group key={`group-${index}`} className="neshel-select-group">
            <BaseSelect.GroupLabel className="neshel-select-group-label">
              {entry.label}
            </BaseSelect.GroupLabel>
            {entry.options.map((option) => (
              <OptionItem key={option.value} option={option} />
            ))}
          </BaseSelect.Group>
        ) : (
          <OptionItem key={entry.value} option={entry} />
        ),
      )}
    </>
  );
}

function Popup({
  options,
  container,
}: {
  /** Options, flat or grouped. */
  options: SelectOptions;
  container: HTMLElement | null | undefined;
}) {
  const positionMethod = usePositionMethod(container);
  const name = usePopupName();
  return (
    <SelectionPortal container={container} Portal={BaseSelect.Portal}>
      <BaseSelect.Positioner
        className="neshel-select-positioner"
        sideOffset={4}
        collisionPadding={8}
        alignItemWithTrigger={false}
        positionMethod={positionMethod}
      >
        <BaseSelect.Popup
          className="neshel-select-popup"
          {...name}
          {...{ [SELECTION_POPUP_ATTRIBUTE]: "" }}
        >
          <OptionList options={options} />
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </SelectionPortal>
  );
}

function triggerProps(component: string, props: SelectFieldProps) {
  return {
    className: cx(
      "neshel-select-trigger",
      fieldSizeClass(component, props.uiSize),
      props.className,
    ),
    "aria-label": props["aria-label"],
    "aria-labelledby": props["aria-labelledby"],
    "aria-describedby": props["aria-describedby"],
    "aria-invalid": flag(component, "invalid", props.invalid) ? true : undefined,
  } as const;
}

const placeholderNode = (text: string | undefined) => (
  <span className="neshel-select-placeholder">{text ?? ""}</span>
);

// ---------------------------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------------------------

/** Accessible single selection with typeahead, groups and native form serialisation. */
export function Select(props: SelectProps) {
  const {
    options,
    value,
    defaultValue,
    onValueChange,
    placeholder,
    id,
    name,
    form,
    required,
    disabled,
    readOnly,
    open,
    defaultOpen,
    onOpenChange,
    container,
    ref,
  } = props;
  const items = flattenOptions("Select", options);
  const registry = useTriggerRegistry();
  return (
    <TriggerContext.Provider value={registry}>
      <BaseSelect.Root<string>
        id={id}
        items={items}
        {...(value !== undefined ? { value } : {})}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        onValueChange={(next) => onValueChange?.((next as string | null) ?? null)}
        name={name}
        form={form}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        {...(open !== undefined ? { open } : {})}
        defaultOpen={defaultOpen}
        onOpenChange={(next) => onOpenChange?.(next)}
      >
        <BaseSelect.Trigger
          ref={composeRefs(ref, registry as Ref<HTMLButtonElement>)}
          {...triggerProps("Select", props)}
        >
          <BaseSelect.Value
            className="neshel-select-value"
            placeholder={placeholderNode(placeholder)}
          />
          <BaseSelect.Icon className="neshel-select-icon">
            <ChevronDownIcon />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
        <Popup options={options} container={container} />
      </BaseSelect.Root>
    </TriggerContext.Provider>
  );
}

// ---------------------------------------------------------------------------------------------
// MultiSelect
// ---------------------------------------------------------------------------------------------

/** Multiple selection: listbox stays open, removable chips beside the trigger, clear-all. */
export function MultiSelect(props: MultiSelectProps) {
  const {
    options,
    value,
    defaultValue,
    onValueChange,
    placeholder,
    id,
    name,
    form,
    required,
    disabled,
    readOnly,
    open,
    defaultOpen,
    onOpenChange,
    container,
    chips,
    clearable,
    clearLabel = "Clear selection",
    removeLabel = (label: string) => `Remove ${label}`,
    removedMessage = (label: string) => `${label} removed`,
    summary = (count: number) => `${count} selected`,
    ref,
  } = props;
  const component = "MultiSelect";
  const items = flattenOptions(component, options);
  const labels = new Map(items.map((item) => [item.value, item.label]));
  const showChips = chips === undefined ? true : flag(component, "chips", chips);
  const showClear = clearable === undefined ? true : flag(component, "clearable", clearable);
  const registry = useTriggerRegistry();
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const [internal, setInternal] = useState<readonly string[]>(defaultValue ?? []);
  const [announcement, setAnnouncement] = useState("");
  const current = value ?? internal;
  const interactive = !disabled && !readOnly;

  const commit = (next: string[]) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };
  const remove = (removed: string, index: number) => {
    commit(current.filter((item) => item !== removed));
    setAnnouncement(removedMessage(labels.get(removed) ?? removed));
    pendingFocus.current = index;
  };
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(".neshel-chip-remove");
    const index = pendingFocus.current;
    pendingFocus.current = null;
    const target =
      buttons && buttons.length > 0 ? buttons[Math.min(index, buttons.length - 1)] : null;
    (target ?? triggerRef.current)?.focus();
  });

  const describe = (selected: readonly string[]) => {
    if (selected.length === 0) return placeholderNode(placeholder);
    if (showChips) return summary(selected.length);
    return selected.map((item) => labels.get(item) ?? item).join(", ");
  };

  return (
    <TriggerContext.Provider value={registry}>
      <div className="neshel-multi-select">
        <BaseSelect.Root<string, true>
          multiple
          id={id}
          items={items}
          value={current}
          onValueChange={(next) => commit([...(next as string[])])}
          name={name}
          form={form}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          {...(open !== undefined ? { open } : {})}
          defaultOpen={defaultOpen}
          onOpenChange={(next) => onOpenChange?.(next)}
        >
          <BaseSelect.Trigger
            ref={composeRefs(ref, triggerRef, registry as Ref<HTMLButtonElement>)}
            {...triggerProps(component, props)}
          >
            <BaseSelect.Value className="neshel-select-value">
              {(selected: string[]) => describe(selected)}
            </BaseSelect.Value>
            <BaseSelect.Icon className="neshel-select-icon">
              <ChevronDownIcon />
            </BaseSelect.Icon>
          </BaseSelect.Trigger>
          <Popup options={options} container={container} />
        </BaseSelect.Root>
        {showChips && current.length > 0 ? (
          <ul className="neshel-chip-list" ref={listRef}>
            {current.map((item, index) => {
              const label = labels.get(item) ?? item;
              return (
                <li key={item} className="neshel-chip">
                  <span className="neshel-chip-label">{label}</span>
                  {interactive ? (
                    <button
                      type="button"
                      className="neshel-chip-remove"
                      aria-label={removeLabel(label)}
                      onClick={() => remove(item, index)}
                    >
                      <CloseIcon />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {showClear && interactive && current.length > 0 ? (
          <button
            type="button"
            className="neshel-multi-select-clear"
            onClick={() => {
              commit([]);
              setAnnouncement(clearLabel);
              pendingFocus.current = 0;
            }}
          >
            {clearLabel}
          </button>
        ) : null}
        <span className="neshel-visually-hidden" role="status" aria-live="polite">
          {announcement}
        </span>
      </div>
    </TriggerContext.Provider>
  );
}

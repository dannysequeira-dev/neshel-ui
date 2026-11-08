"use client";
/**
 * Combobox (FR-080) on Base UI Combobox: searchable single or multiple selection constrained to
 * the items (research R16). Local filtering by default; `filter={null}` for external filtering.
 */
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { type ReactNode, type Ref, useRef } from "react";
import { componentsError } from "./internal/errors.js";
import { CheckIcon, ChevronDownIcon, CloseIcon } from "./internal/icons.js";
import {
  composeRefs,
  SELECTION_POPUP_ATTRIBUTE,
  TriggerContext,
  useTriggerRegistry,
} from "./internal/layer.js";
import { cx, flag } from "./internal/validate.js";
import { fieldSizeClass } from "./primitives.js";
import {
  type SelectFieldProps,
  SelectionPortal,
  type SelectOption,
  usePositionMethod,
} from "./select.js";

export type ComboboxItem = SelectOption;
export interface ComboboxItemGroup {
  label: string;
  items: readonly ComboboxItem[];
}

interface ComboboxBaseProps extends SelectFieldProps {
  /** Items, or groups of items (not mixed). */
  items: readonly ComboboxItem[] | readonly ComboboxItemGroup[];
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (value: string) => void;
  /** Local filter (default: case-insensitive label match); `null` when the app filters `items`. */
  filter?: ((item: ComboboxItem, query: string) => boolean) | null;
  emptyMessage?: ReactNode;
  loading?: boolean;
  loadingMessage?: ReactNode;
  clearable?: boolean;
  clearLabel?: string;
  /** Accessible name of the button that opens the list (default "Show options"). */
  triggerLabel?: string;
  ref?: Ref<HTMLInputElement>;
}

export interface ComboboxSingleProps extends ComboboxBaseProps {
  multiple?: false;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
}

export interface ComboboxMultipleProps extends ComboboxBaseProps {
  multiple: true;
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  removeLabel?: (label: string) => string;
}

export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

const isGroup = (entry: ComboboxItem | ComboboxItemGroup): entry is ComboboxItemGroup =>
  Array.isArray((entry as ComboboxItemGroup).items);

function leaves(component: string, items: unknown): ComboboxItem[] {
  if (!Array.isArray(items)) throw componentsError(component, `"items" must be an array.`);
  const groups = items.filter((entry) => entry && isGroup(entry)).length;
  if (groups > 0 && groups !== items.length) {
    throw componentsError(component, `"items" must contain only items or only groups, not both.`);
  }
  const flat =
    groups > 0 ? (items as ComboboxItemGroup[]).flatMap((group) => [...group.items]) : items;
  for (const item of flat as ComboboxItem[]) {
    if (typeof item?.value !== "string" || typeof item?.label !== "string") {
      throw componentsError(
        component,
        `every item needs a string "value" and "label" (received ${JSON.stringify(item)}).`,
      );
    }
  }
  return flat as ComboboxItem[];
}

function ItemRow({ item }: { item: ComboboxItem }) {
  return (
    <BaseCombobox.Item value={item} disabled={item.disabled} className="neshel-select-item">
      <BaseCombobox.ItemIndicator className="neshel-select-item-indicator">
        <CheckIcon />
      </BaseCombobox.ItemIndicator>
      {item.label}
    </BaseCombobox.Item>
  );
}

/** Searchable selection (single by default, `multiple` for several values with chips). */
export function Combobox(props: ComboboxProps) {
  const {
    items,
    inputValue,
    defaultInputValue,
    onInputValueChange,
    filter,
    emptyMessage = "No results",
    loading,
    loadingMessage = "Loading…",
    clearable,
    clearLabel = "Clear selection",
    triggerLabel = "Show options",
    placeholder,
    id,
    name,
    form,
    required,
    disabled,
    readOnly,
    invalid,
    uiSize,
    open,
    defaultOpen,
    onOpenChange,
    container,
    className,
    ref,
  } = props;
  const component = "Combobox";
  const multiple = flag(component, "multiple", props.multiple);
  const flat = leaves(component, items);
  const isLoading = flag(component, "loading", loading);
  const isInvalid = flag(component, "invalid", invalid);
  const showClear = clearable === undefined ? true : flag(component, "clearable", clearable);
  const registry = useTriggerRegistry();
  const anchorRef = useRef<HTMLDivElement>(null);
  const positionMethod = usePositionMethod(container);

  // Labels of every item seen, so selected values keep their label when external filtering
  // removes them from `items` (FR-080).
  const cache = useRef(new Map<string, ComboboxItem>());
  for (const item of flat) cache.current.set(item.value, item);
  const toItem = (value: string): ComboboxItem =>
    cache.current.get(value) ?? { value, label: value };
  const mapValue = (value: unknown) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (multiple) {
      if (!Array.isArray(value))
        throw componentsError(component, `"value" must be an array when "multiple" is set.`);
      return (value as string[]).map(toItem);
    }
    if (typeof value !== "string")
      throw componentsError(component, `"value" must be a string or null.`);
    return toItem(value);
  };
  const controlled = mapValue(props.value);
  const initial = mapValue(props.defaultValue);

  const handleValue = (next: unknown) => {
    if (multiple) {
      (props as ComboboxMultipleProps).onValueChange?.(
        ((next as ComboboxItem[] | null) ?? []).map((item) => item.value),
      );
    } else {
      (props as ComboboxSingleProps).onValueChange?.((next as ComboboxItem | null)?.value ?? null);
    }
  };

  const removeLabel =
    (multiple && (props as ComboboxMultipleProps).removeLabel) ||
    ((label: string) => `Remove ${label}`);
  const input = (
    <BaseCombobox.Input
      id={id}
      ref={ref}
      placeholder={placeholder}
      className="neshel-combobox-input"
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      aria-describedby={props["aria-describedby"]}
      aria-invalid={isInvalid ? true : undefined}
    />
  );
  const actions = (
    <span className="neshel-combobox-actions">
      {showClear && !readOnly ? (
        <BaseCombobox.Clear className="neshel-field-icon-button" aria-label={clearLabel}>
          <CloseIcon />
        </BaseCombobox.Clear>
      ) : null}
      <BaseCombobox.Trigger className="neshel-field-icon-button" aria-label={triggerLabel}>
        <ChevronDownIcon />
      </BaseCombobox.Trigger>
    </span>
  );
  const groupClass = cx("neshel-combobox", fieldSizeClass(component, uiSize), className);
  const stateAttributes = {
    "data-invalid": isInvalid ? "" : undefined,
    "data-disabled": disabled ? "" : undefined,
    "data-readonly": readOnly ? "" : undefined,
  };
  const anchor = composeRefs<HTMLDivElement>(anchorRef, registry as Ref<HTMLDivElement>);

  return (
    <TriggerContext.Provider value={registry}>
      <BaseCombobox.Root
        items={items as never}
        multiple={multiple as never}
        {...(controlled !== undefined ? { value: controlled as never } : {})}
        {...(initial !== undefined ? { defaultValue: initial as never } : {})}
        onValueChange={handleValue}
        {...(inputValue !== undefined ? { inputValue } : {})}
        defaultInputValue={defaultInputValue}
        onInputValueChange={(next: string) => onInputValueChange?.(next)}
        {...(filter === null
          ? { filter: null }
          : filter
            ? { filter: (item: ComboboxItem, query: string) => filter(item, query) }
            : {})}
        itemToStringLabel={(item: ComboboxItem) => item.label}
        itemToStringValue={(item: ComboboxItem) => item.value}
        isItemEqualToValue={(a: ComboboxItem, b: ComboboxItem) => a.value === b.value}
        name={name}
        form={form}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        {...(open !== undefined ? { open } : {})}
        defaultOpen={defaultOpen}
        onOpenChange={(next: boolean) => onOpenChange?.(next)}
      >
        {multiple ? (
          <BaseCombobox.Chips ref={anchor} className={groupClass} {...stateAttributes}>
            <BaseCombobox.Value>
              {(selected: ComboboxItem[]) =>
                selected.map((item) => (
                  <BaseCombobox.Chip key={item.value} className="neshel-chip">
                    <span className="neshel-chip-label">{item.label}</span>
                    {readOnly || disabled ? null : (
                      <BaseCombobox.ChipRemove
                        className="neshel-chip-remove"
                        aria-label={removeLabel(item.label)}
                      >
                        <CloseIcon />
                      </BaseCombobox.ChipRemove>
                    )}
                  </BaseCombobox.Chip>
                ))
              }
            </BaseCombobox.Value>
            {input}
            {actions}
          </BaseCombobox.Chips>
        ) : (
          <BaseCombobox.InputGroup ref={anchor} className={groupClass} {...stateAttributes}>
            {input}
            {actions}
          </BaseCombobox.InputGroup>
        )}
        <SelectionPortal container={container} Portal={BaseCombobox.Portal}>
          <BaseCombobox.Positioner
            className="neshel-select-positioner"
            anchor={anchorRef}
            sideOffset={4}
            collisionPadding={8}
            positionMethod={positionMethod}
          >
            <BaseCombobox.Popup
              className="neshel-select-popup"
              {...{ [SELECTION_POPUP_ATTRIBUTE]: "" }}
              aria-busy={isLoading ? true : undefined}
            >
              {isLoading ? (
                <div className="neshel-select-empty" role="status">
                  {loadingMessage}
                </div>
              ) : (
                <BaseCombobox.Empty className="neshel-select-empty">
                  {emptyMessage}
                </BaseCombobox.Empty>
              )}
              <BaseCombobox.List>
                {(entry: ComboboxItem | ComboboxItemGroup) =>
                  isGroup(entry) ? (
                    <BaseCombobox.Group
                      key={entry.label}
                      items={entry.items}
                      className="neshel-select-group"
                    >
                      <BaseCombobox.GroupLabel className="neshel-select-group-label">
                        {entry.label}
                      </BaseCombobox.GroupLabel>
                      <BaseCombobox.Collection>
                        {(item: ComboboxItem) => <ItemRow key={item.value} item={item} />}
                      </BaseCombobox.Collection>
                    </BaseCombobox.Group>
                  ) : (
                    <ItemRow key={entry.value} item={entry} />
                  )
                }
              </BaseCombobox.List>
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </SelectionPortal>
      </BaseCombobox.Root>
    </TriggerContext.Provider>
  );
}

# Data model — Feature 003

Runtime data structures (internal unless noted). No persistence.

## Breakpoint (public type)

Ordered list `base < sm < md < lg < xl < 2xl`; `minWidth` in rem: `null`, 40, 48, 64, 80, 96.

## Responsive value (public type `Responsive<T>`)

`T | Partial<Record<Breakpoint, T>>`. Normalised to `Map<Breakpoint, T>`; scalar → `{ base }`;
`null`/`undefined` → empty; unknown key or value → `NeshelLayoutError`.

## Style table (`style-tables.ts`)

```ts
interface PropertyTable {
  key: string;            // class key: "gap", "ai", "cols", ...
  property: string;       // CSS property
  values: Record<string, string>; // token -> CSS value
  resets?: Record<string, string>; // tokens emitted only inside breakpoint blocks ("normal")
}
interface BaseClass { name: string; declarations: [property: string, value: string][] }
```

Class name: `neshel-${key}-${token}` (base) or `neshel-${bp}-${key}-${token}`.

## Resolved layout

`Array<{ bp: Breakpoint; key: string; token: string }>` — emitted only when the effective token
of `key` changes between consecutive breakpoints; converted to tv variant selections
`{ [`${bp}_${key}`]: token }`.

## Derivation per component (effective props → CSS keys)

| Component | gap | gap-x | gap-y | ai | jc | ji | dir | fw | cols | d | mw | pi |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Box | | | | | | | | | | display | | |
| Flex | space | spaceX | spaceY | by dir | by dir / justify | | direction | wrap | | | | |
| Stack | space | spaceX | spaceY | X | justify ?? Y | | | | | | | |
| Inline | space | spaceX | spaceY | Y | justify ?? X | | | wrap | | | | |
| Center | space | spaceX | spaceY | Y | X | | | | | | | |
| Grid | space | spaceX | spaceY | Y | | X | | | columns | | | |
| Container | | | | | | | | | | | size | gutter |

`X = alignX ?? align`, `Y = alignY ?? align`.

## Separator sequence

`items = toArray(children).filter(c => c !== "")`;
output `items[0], sep(key(items[1])), items[1], …` with `sep` the default or cloned custom
element.

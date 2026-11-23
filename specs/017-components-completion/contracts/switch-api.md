# Contract — Switch (`@neshel-ui/components`)

Primitive: Base UI `switch` (existing dependency), rendered as a native button (`nativeButton`). Implementation:
`switch.tsx`.

```tsx
<Switch
  id? checked? defaultChecked? onCheckedChange?(checked)
  disabled? required? readOnly? invalid?
  name? value?="on" form?
  uiSize?="sm" | "md" | "lg"      // default "md", like Input/Select
  ref?: Ref<HTMLButtonElement> ...button attributes />
```

- Element: `<button type="button" role="switch" aria-checked id>` + a thumb span; Base UI's hidden checkbox input
  carries `name`, `value` and `required` for forms (submitted only while on).
- Label: `<Label htmlFor={id}>` — clicking the label activates the button.
- Keyboard: Space and Enter (native button activation); Tab order unchanged.
- Uncontrolled state is owned by Neshel so a **form reset** restores `defaultChecked` (Base UI alone kept the
  toggled state — found by the 017 form test); a reset does not call `onCheckedChange`, like native inputs.
- `invalid` → `aria-invalid="true"` and the destructive border; describe the error with `aria-describedby`.
- Styles: track `--neshel-muted`/`--neshel-input`, checked `--neshel-primary`, thumb `--neshel-background`, disabled
  tokens; focus ring on `:focus-visible`; RTL thumb direction; forced colours (`ButtonText`, `Highlight`);
  `transition: none` under reduced motion.
- Errors: invalid `uiSize`.

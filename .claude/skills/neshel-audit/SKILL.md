---

name: neshel-audit
description: Audit Neshel-UI implementation, design system architecture, package exports and release readiness. Use before merging a major slice or considering publication.
---

# Audit checklist

- Confirm package boundaries and absence of cycles.
- Check accessibility, keyboard behavior, focus-visible and reduced motion.
- Inspect semantic color contrast (both themes), responsive props and no generated Tailwind class strings.
- Verify no reliance on source code outside packed npm archives.
- Audit `exports`, `files`, peer dependencies, ESM/types, CSS sideEffects, license and README.
- Verify dependency ranges, npm scope availability before final release, provenance and trustworthy CI.
- Record real evidence including failed/skipped gates.
- Never publish or push without explicit owner approval.

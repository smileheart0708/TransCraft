# Tailwind CSS v4 Guidelines (TransCraft Renderer)

## Scope

These rules apply to `src/renderer/src`.

## Core v4 syntax

- Keep `@import 'tailwindcss'` in `src/renderer/src/assets/main.css`.
- Use CSS-first directives in the main stylesheet: `@theme`, `@custom-variant`, `@utility`.
- Prefer design tokens exposed through `@theme inline` and existing `--ui-*` variables.

## Dark mode strategy

- Dark mode is controlled by `data-theme` on `<html>`.
- Use the custom variant from `main.css`:
  - `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`
- Avoid `prefers-color-scheme` classes directly in components; renderer state already resolves theme.

## Class detection and safety

- Do not build class names dynamically (for example `bg-${tone}-500`).
- Use explicit full class strings in arrays/objects/computed branches.
- If a variant is conditional, every possible class must exist as a full literal string.

## Utility layering policy

- Priority order:
  1. Tailwind built-in utilities in template
  2. Project `@utility` primitives in `main.css`
  3. `Ui*` components in `src/renderer/src/components/ui`
- Add a new `@utility` only when a pattern is repeated at least 3 times or is a semantic primitive
  (`panel`, `statusbar`, `menu-item`, etc.).

## Ui component policy

- Reuse `UiPanel`, `UiButton`, `UiIconButton`, `UiDropdown` before introducing new style wrappers.
- Keep behavior in feature components; keep visual primitives in `Ui*`.
- Keep `BaseDropdown.vue` as compatibility wrapper for existing imports.

## When `@reference` is allowed

- Default: avoid component `<style>` blocks.
- If a component must keep `<style>` and uses `@apply`/`@variant`, add:

```css
@reference "@renderer/assets/main.css";
```

- Treat this as an exception and document why the style block is needed.

## Review checklist

- `pnpm lint`
- `pnpm typecheck`
- `rg -n "<style scoped>" src/renderer/src -g "*.vue"`
- Verify light/dark parity for panel, button, menu, and statusbar surfaces.

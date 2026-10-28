---
name: design-system-amrutam
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards. Use when creating or updating UI rules, component specifications, or design-system documentation.
---

<!-- TYPEUI_SH_MANAGED_START -->

# Amrutam Design System Skill

## Mission
Deliver implementation-ready design-system guidance for Amrutam that can be applied consistently across e-commerce storefront and telemedicine consultation interfaces.

## Brand
- Product/brand: Amrutam
- URL: https://amrutam.co.in/?srsltid=AYCX9vJ0LZCdARyeM3czSCdrtPqYI27LxGUB7mPcLrX0PlF0AKCwa4hc
- Audience: online shoppers, patients seeking Ayurvedic healthcare
- Product surface: e-commerce storefront & telemedicine consultation portal

## Style Foundations
- Visual style: structured, accessible, implementation-first
- Main font style: `font.family.primary=Lato`, `font.family.stack=Lato, sans-serif`, `font.size.base=18px`, `font.weight.base=500`, `font.lineHeight.base=27px`
- Typography scale: `font.size.xs=12px`, `font.size.sm=13.5px`, `font.size.md=14px`, `font.size.lg=15px`, `font.size.xl=16px`, `font.size.2xl=18px`, `font.size.3xl=20px`, `font.size.4xl=21px`
- Color palette: `color.text.primary=#213d31`, `color.border.muted=#3a643b`, `color.border.strong=#222222`, `color.surface.base=#000000`, `color.surface.muted=#f7fbf5`, `color.surface.raised=#fffdf3`, `color.surface.strong=#344334`
- Spacing scale: `space.1=5px`, `space.2=8px`, `space.3=9px`, `space.4=10px`, `space.5=11px`, `space.6=14px`, `space.7=15px`, `space.8=16px`
- Radius/shadow/motion tokens: `radius.xs=18px`, `radius.sm=20px`, `radius.md=50px`, `radius.lg=999px` | `shadow.1=rgba(0, 0, 0, 0.12) 0px 10px 22px 0px`, `shadow.2=rgba(0, 0, 0, 0.12) 0px 14px 32px 0px` | `motion.duration.instant=200ms`, `motion.duration.fast=220ms`, `motion.duration.normal=250ms`, `motion.duration.slow=300ms`, `motion.duration.slower=500ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
Concise, confident, implementation-focused.

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance.
- Every component must define required states: default, hover, focus-visible, active, disabled, loading, error.
- Responsive behavior and edge-case handling should be specified for every component family.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not use pure white as the page background. Use near-white or warm neutral `#fffdf3` or `#f7fbf5`.
- Avoid harsh gradients, rainbow colors, neon colors, generic pastels, and purple-and-black themes.
- No radial orbs, dot grids, liquid glass, decorative colored stripes, sparkle icons, emojis, or animated arrows.
- Don't use Inter, Geist, Space Grotesk, or Lucide icons. Choose Lato with clean action-oriented SVGs.

<!-- TYPEUI_SH_MANAGED_END -->

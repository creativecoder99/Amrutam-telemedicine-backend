# Amrutam — Design Foundations & Token Specification

## Mission
Create implementation-ready, token-driven UI guidance for Amrutam that is optimized for consistency, accessibility, and fast delivery across e-commerce storefront.

## Brand
- **Product/brand**: Amrutam
- **URL**: https://amrutam.co.in/?srsltid=AYCX9vJ0LZCdARyeM3czSCdrtPqYI27LxGUB7mPcLrX0PlF0AKCwa4hc
- **Audience**: online shoppers, patients seeking holistic Ayurvedic healthcare and consultations
- **Product surface**: e-commerce storefront and telemedicine consultation portal

## Style Foundations
- **Visual style**: clean, functional, structured, implementation-oriented
- **Main font style**:
  - `font.family.primary = 'Lato'`
  - `font.family.stack = 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  - `font.size.base = 18px`
  - `font.weight.base = 500`
  - `font.lineHeight.base = 27px`
- **Typography scale**:
  - `font.size.xs = 12px`
  - `font.size.sm = 13.5px`
  - `font.size.md = 14px`
  - `font.size.lg = 15px`
  - `font.size.xl = 16px`
  - `font.size.2xl = 18px`
  - `font.size.3xl = 20px`
  - `font.size.4xl = 21px`
- **Color palette**:
  - `color.text.primary = #213d31` (Deep Forest Herbal Green)
  - `color.border.muted = #3a643b` (Earthy Moss Green)
  - `color.border.strong = #222222` (Charcoal)
  - `color.surface.base = #000000` (Deep Base)
  - `color.surface.muted = #f7fbf5` (Subtle Herbal Warm Tint)
  - `color.surface.raised = #fffdf3` (Warm Cream Surface)
  - `color.surface.strong = #344334` (Deep Olive Surface)
- **Spacing scale**:
  - `space.1 = 5px`
  - `space.2 = 8px`
  - `space.3 = 9px`
  - `space.4 = 10px`
  - `space.5 = 11px`
  - `space.6 = 14px`
  - `space.7 = 15px`
  - `space.8 = 16px`
- **Radius / Shadow / Motion tokens**:
  - `radius.xs = 18px`
  - `radius.sm = 20px`
  - `radius.md = 50px`
  - `radius.lg = 999px`
  - `shadow.1 = rgba(0, 0, 0, 0.12) 0px 10px 22px 0px`
  - `shadow.2 = rgba(0, 0, 0, 0.12) 0px 14px 32px 0px`
  - `motion.duration.instant = 200ms`
  - `motion.duration.fast = 220ms`
  - `motion.duration.normal = 250ms`
  - `motion.duration.slow = 300ms`
  - `motion.duration.slower = 500ms`

## Accessibility & Interaction Constraints
- Target: **WCAG 2.2 AA** compliant.
- Keyboard-first interactions required for all tabs, forms, modals, and slot selectors.
- Distinct, high-contrast `:focus-visible` outlines required on all interactive elements.
- Use near-white or warm neutral background (`#fffdf3` or `#f7fbf5`), dark readable text (`#213d31`), and one restrained accent (`#3a643b`).
- **Never use pure white (`#ffffff`) as the main page background.**
- **Prohibited**: Harsh gradients, rainbow colors, neon colors, generic pastels, purple-and-black themes, radial orbs, dot grids, liquid glass, decorative colored stripes, sparkle icons, emojis, animated arrows, or unmeaningful hover animations.
- **Prohibited fonts**: Inter, Geist, Space Grotesk, Lucide icons. Use Lato with clean, purposeful action SVGs.

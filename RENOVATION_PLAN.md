# MqxCode UI Renovation Plan

## Project Overview
Transform MqxCode from neobrutalist design to a modern, sleek UI using **Aceternity UI** components while creating a distinctive brand identity.

---

## Phase 1: Branding & Foundation

### 1.1 Install Dependencies
```bash
# Required packages for Aceternity UI
npm install framer-motion clsx tailwind-merge
npm install @tabler/icons-react  # Icons used by Aceternity
npm install mini-svg-data-uri   # For background patterns
```

### 1.2 Color System - Dark/Light Theme
Create a new design system that supports both themes:

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| `--bg-primary` | `#0a0a0f` | `#fafafa` |
| `--bg-secondary` | `#131320` | `#f4f4f5` |
| `--bg-card` | `#1a1a2e` | `#ffffff` |
| `--accent-primary` | `#6366f1` (indigo) | `#4f46e5` |
| `--accent-secondary` | `#8b5cf6` (violet) | `#7c3aed` |
| `--accent-success` | `#10b981` | `#059669` |
| `--accent-warning` | `#f59e0b` | `#d97706` |
| `--accent-danger` | `#ef4444` | `#dc2626` |
| `--text-primary` | `#f4f4f5` | `#18181b` |
| `--text-secondary` | `#a1a1aa` | `#71717a` |
| `--border` | `#27272a` | `#e4e4e7` |

### 1.3 Typography System
```css
--font-display: 'Space Grotesk', sans-serif;  /* Keep for branding */
--font-sans: 'Inter', sans-serif;             /* Modern body font */
--font-mono: 'JetBrains Mono', monospace;     /* Keep for code */
```

### 1.4 Logo & Branding with Pixelated Canvas
- **Component**: Aceternity's `Pixelated Canvas`
- **Usage**: Logo in header, loading states, empty states
- **User to provide**: Image for pixelation effect
- **Placement**:
  - Header (left side)
  - Welcome screen (centered, large)
  - Favicon generation

### 1.5 Background Effects
Create multiple background options:
- **Aurora Background** - For hero/welcome sections
- **Dot Background** - For main content area (subtle)
- **Grid Background** - For modal backdrops
- **Gradient Animation** - For loading states

### 1.6 Create Aceternity Component Library
Set up reusable components in `ui/src/components/aceternity/`:
```
aceternity/
├── backgrounds/
│   ├── aurora-background.tsx
│   ├── dot-background.tsx
│   ├── grid-background.tsx
│   └── gradient-animation.tsx
├── effects/
│   ├── spotlight.tsx
│   ├── glow-effect.tsx
│   └── moving-border.tsx
├── utils/
│   └── cn.ts  (className utility)
└── index.ts
```

---

## Phase 2: Core Components Renovation

### 2.1 Layout & Navigation

#### Header Redesign
- **Current**: Solid black bar with white text
- **New**:
  - Glassmorphism effect (`backdrop-blur-xl`)
  - Pixelated Canvas logo (left)
  - Floating Dock navigation (right)
  - Spotlight effect on active items

#### Sidebar (New)
- **Component**: Aceternity's `Sidebar`
- **Contents**:
  - Project list
  - Quick actions
  - Settings access
  - Theme toggle

### 2.2 Dashboard Components

#### Progress Dashboard
- **Current**: Simple progress bar with neo styling
- **New**:
  - Bento Grid layout
  - Card Spotlight effect on hover
  - Moving Border around active stats
  - Animated number counters
  - Gradient progress fill with glow

#### Agent Status
- **Current**: Simple buttons
- **New**:
  - Stateful Button with loading states
  - Glow effect when running
  - Pulse animation on activity

### 2.3 Kanban Board Renovation

#### Board Container
- **Current**: Grid layout with neo-cards
- **New**:
  - 3-column Focus Cards layout
  - Blur effect on non-hovered columns
  - Smooth drag-and-drop animations

#### Feature Cards
- **Current**: Flat neo-brutalist cards
- **New Options** (mix and match):
  - **3D Card Effect** - Perspective tilt on hover
  - **Wobble Card** - Subtle movement on interaction
  - **Glare Card** - Light reflection effect
  - **Direction Aware Hover** - Edge-based hover effects

#### Column Headers
- **New**:
  - Lamp Effect for section headers
  - Count badges with Moving Border

### 2.4 Modals & Dialogs

#### Base Modal
- **Current**: Neo-modal with hard shadows
- **New**:
  - Animated Modal from Aceternity
  - SVG Mask Effect reveal
  - Glassmorphism backdrop
  - Scale + fade animation

#### Feature Modal
- Transform to Expandable Card pattern
- Codeblock component for steps display

#### Settings Modal
- Tabs component for organization
- Toggle switches with animations
- Form inputs with Vanish effect

### 2.5 Forms & Inputs

#### Text Inputs
- **New**: Placeholders and Vanish Input
- Sliding placeholder animation
- Text vanish on submit

#### Buttons
- **Base**: Hover Border Gradient
- **Primary**: Gradient background with glow
- **Danger**: Red glow effect
- **Ghost**: Subtle background on hover

### 2.6 Terminal & Logs

#### Debug Log Viewer
- **Container**: Card with gradient border
- **Tabs**: Animated tab switching
- **Content**: Codeblock styling
- **Background**: Subtle dot pattern

#### Terminal Component
- Keep xterm.js functionality
- Add glowing border when active
- Subtle scanline effect option

### 2.7 Chat & Assistant

#### Assistant Panel
- Slide-in animation from right
- Chat messages with direction-aware styling
- Typing indicator with animated dots
- Input with vanish effect

#### Floating Action Button
- Replace with Floating Dock style
- Glow effect when panel open

---

## Component Migration Checklist

### Phase 1 Tasks
- [ ] Install Aceternity dependencies
- [ ] Create `cn()` utility function
- [ ] Set up dark/light theme CSS variables
- [ ] Add theme toggle functionality
- [ ] Create Aurora Background component
- [ ] Create Dot Background component
- [ ] Create Spotlight component
- [ ] Create Moving Border component
- [ ] Create Glow Effect component
- [ ] Integrate Pixelated Canvas (awaiting user image)
- [ ] Update `globals.css` with new design tokens
- [ ] Add Inter font to project

### Phase 2 Tasks
- [ ] Redesign Header with glassmorphism
- [ ] Create new Sidebar component
- [ ] Renovate ProgressDashboard with Bento Grid
- [ ] Add animated number counters
- [ ] Implement 3D Card Effect for FeatureCard
- [ ] Create Focus Cards for KanbanBoard
- [ ] Add Direction Aware Hover to cards
- [ ] Update KanbanColumn with Lamp headers
- [ ] Implement Animated Modal base
- [ ] Update FeatureModal with new design
- [ ] Update SettingsModal with Tabs
- [ ] Create new Button variants
- [ ] Implement Vanish Input
- [ ] Update DebugLogViewer styling
- [ ] Add glow to Terminal when active
- [ ] Redesign AssistantPanel
- [ ] Update AssistantFAB to Floating Dock style
- [ ] Add page transition animations

---

## File Changes Summary

### New Files to Create
```
ui/src/
├── components/
│   └── aceternity/
│       ├── aurora-background.tsx
│       ├── dot-background.tsx
│       ├── grid-background.tsx
│       ├── spotlight.tsx
│       ├── moving-border.tsx
│       ├── glow-effect.tsx
│       ├── 3d-card.tsx
│       ├── focus-cards.tsx
│       ├── wobble-card.tsx
│       ├── animated-modal.tsx
│       ├── tabs.tsx
│       ├── floating-dock.tsx
│       ├── vanish-input.tsx
│       ├── stateful-button.tsx
│       ├── pixelated-canvas.tsx
│       ├── bento-grid.tsx
│       ├── lamp.tsx
│       └── cn.ts
├── contexts/
│   └── ThemeContext.tsx
└── styles/
    └── theme.css
```

### Files to Modify
```
ui/src/
├── App.tsx                    # Add theme provider, new layout
├── styles/globals.css         # New design system
├── components/
│   ├── ProjectSelector.tsx    # New dropdown style
│   ├── KanbanBoard.tsx        # Focus cards integration
│   ├── KanbanColumn.tsx       # Lamp headers
│   ├── FeatureCard.tsx        # 3D card effect
│   ├── ProgressDashboard.tsx  # Bento grid + animations
│   ├── AgentControl.tsx       # Stateful buttons
│   ├── DebugLogViewer.tsx     # New tabs + styling
│   ├── FeatureModal.tsx       # Animated modal
│   ├── SettingsModal.tsx      # Tabs integration
│   ├── AssistantPanel.tsx     # Slide animation + styling
│   └── AssistantFAB.tsx       # Floating dock style
└── index.html                 # Add Inter font
```

---

## Technical Notes

### Framer Motion Integration
All Aceternity components rely on Framer Motion. Key patterns:
```tsx
import { motion, AnimatePresence } from 'framer-motion'

// Use motion.div for animated elements
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
```

### Class Name Utility
```typescript
// ui/src/components/aceternity/cn.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Theme Context
```typescript
// ui/src/contexts/ThemeContext.tsx
interface ThemeContextType {
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
}
```

---

## Next Steps

1. **Waiting for**: User's image for Pixelated Canvas logo
2. **First implementation**: Phase 1.1-1.3 (dependencies + design system)
3. **Then**: Phase 1.5-1.6 (background effects + component library)
4. **Finally**: Phase 2 component-by-component migration

---

## Design Inspiration

The new MqxCode will combine:
- **Dark mode default** with optional light mode
- **Glassmorphism** for depth and layering
- **Subtle animations** for polish
- **Gradient accents** for visual interest
- **Glowing effects** for active states
- **3D depth** for interactive elements

The goal is a **premium, modern developer tool** aesthetic similar to:
- Linear.app
- Vercel Dashboard
- Raycast
- Arc Browser

---

*Last Updated: January 14, 2026*
*Status: Planning Phase - Awaiting user image for logo*

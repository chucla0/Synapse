# 🎨 Design System & UX Philosophy

Synapse is built with a focus on **clarity, calm, and efficiency**. The visual identity aims to reduce the "cognitive noise" usually associated with complex scheduling tools.

## 🌈 Visual Identity

### Color Palette
We use a **Pastel-based system** that adapts between Light and Dark modes. Each agenda type has a dedicated color to facilitate instant recognition:

| Element | Color (Hex) | Purpose |
| :--- | :--- | :--- |
| **Primary/Accent** | `#6366F1` | Brand identity and primary actions. |
| **Personal** | `#A8DADC` | Soft teal for personal sanctuary. |
| **Work** | `#457B9D` | Professional blue for productivity. |
| **Social** | `#F1FAEE` | Warm white/cream for social events. |
| **Educational** | `#E63946` | Soft red for exams and deadlines. |

### Typography
- **Primary Font**: `Inter` (Sans-serif). Chosen for its high legibility on screens and professional look.
- **Scale**: Uses a modular scale where the `big-title` reaches `4rem` in the landing page for maximum impact.

---

## 🍱 Layout Patterns

### 1. The Bento Grid
Inspired by modern dashboard trends (Apple, Vercel), we use a **Bento Grid** in the presentation and features sections.
- **Why?** It allows grouping diverse information (icons, text, status) into a cohesive, organized, and responsive structure.
- **Visual implementation**: Border-radius of `1rem`, subtle shadows (`0 4px 6px -1px rgb(0 0 0 / 0.1)`), and internal padding.

### 2. Dual-Panel Authentication
The login and registration pages use a split-screen design:
- **Left**: Minimalist form for focused action.
- **Right**: A scrollable presentation area with high-impact typography and feature highlights.

---

## 📱 User Experience (UX)

### Role-Based Interface
The UI changes based on the user's role in an agenda:
- **Chief View**: Features prominent "Pending Approval" badges and action buttons.
- **Employee View**: Focuses on event status tracking and request forms.
- **Student View**: A clean, read-only experience optimized for consumption.

### Micro-interactions
- **Real-time Feedback**: Socket.io events trigger subtle animations and toast notifications.
- **Drag & Drop**: Intuitive event rescheduling via `dnd-kit`.
- **Theme Transition**: Smooth CSS transitions between Light and Dark modes using CSS variables.

---

## 🛠️ Design Tech Stack
- **Styling**: Vanilla CSS with CSS Modules approach (no utility frameworks like Tailwind for custom control).
- **Icons**: `Lucide-react` for a consistent, thin-stroke icon set.
- **Animations**: CSS Keyframes for modals and page transitions.

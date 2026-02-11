**Do not use subagents for coding, use subagents only for peripheral tasks**
**Do not run parallel background tasks, concurrency is not allowed here**
**Do not make commits until user EXPLICITLY asks**
**Always make sure `npm run check` passes**
**Do not ignore typing error with `any`, fix the errors or ask for user permission before ignoring**

# Color Theme

## Color Variants Usage Guide

The application uses a modern, professional color palette designed for privacy-focused productivity applications. Here's how to use each color variant:

### Base Layout Colors

- `--color-background` (`#f8fafc`): Main page background
- `--color-foreground` (`#1e293b`): Primary text color  
- `--color-border` (`222 20% 85%`): Default border color for inputs, cards, etc.
- `--color-input` (`222 20% 85%`): Form input borders
- `--color-ring` (`168 63% 63%`): Focus ring color (matches accent)

### Semantic Color Variants

- `--color-primary` (`#1e293b`): Primary buttons, key actions, main interactive elements
- `--color-primary-foreground` (`#ffffff`): Text on primary elements
- `--color-secondary` (`#64748b`): Secondary text, disabled states, subtle interactive elements  
- `--color-secondary-foreground` (`#ffffff`): Text on secondary elements
- `--color-muted` (`#94a3b8`): Disabled text, placeholder text, inactive states
- `--color-muted-foreground` (`#1e293b`): Text on muted backgrounds
- `--color-accent` (`#3b82f6`): Primary actions, active states, highlights, success indicators
- `--color-accent-foreground` (`#ffffff`): Text on accent elements
- `--color-destructive` (`#fee2e2`): Delete actions, error states, destructive operations
- `--color-destructive-foreground` (`#dc2626`): Text on destructive elements

### Surface Colors

- `--color-card` (`#ffffff`): Card backgrounds, container surfaces
- `--color-card-foreground` (`#1e293b`): Text on card surfaces
- `--color-popover` (`#ffffff`): Dropdown menus, popovers, tooltips
- `--color-popover-foreground` (`#1e293b`): Text on popover surfaces

This palette provides excellent accessibility (12.7:1 contrast ratio for primary text) and follows 2025-2026 design trends for privacy-focused productivity applications.

# Typography

## Typography Hierarchy Guide

The application uses Manrope with system font fallbacks for optimal readability and performance. Follow this hierarchy consistently:

### Font Scale & Weights

- **Display (Page titles)**: `text-3xl font-bold` (30px, 700)
- **Heading 1 (Section headers)**: `text-2xl font-semibold` (24px, 600)  
- **Heading 2 (Component labels)**: `text-xl font-semibold` (20px, 600)
- **Primary Body**: `font-medium` (16px, 500) - better contrast than normal weight
- **Secondary Text**: Default (14px, 400) - used by Label component
- **Captions/UI**: `text-sm font-medium` (12px, 500) - used by Error/Alert components

### Best Practices

- Always use `font-medium` (500) for primary body text instead of default weight (400) for better contrast against light background
- Maintain consistent heading hierarchy across all pages
- Use appropriate font sizes for touch targets (minimum 14px for interactive elements)
- Leverage Tailwind's built-in font weight classes rather than custom CSS
- Preserve the 12.7:1 contrast ratio for accessibility compliance

This typography system supports focused, productive work while maintaining visual consistency and excellent readability.

# Svelte

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

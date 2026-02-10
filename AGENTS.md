**Do not use subagents for coding, use subagents only for peripheral tasks**
**Do not run parallel background tasks, concurrency is not allowed here**
**Do not make commits until user EXPLICITLY asks**
**Always make sure `npm run check` passes**
**Do not ignore typing error with `any`, fix the errors or ask for user permission before ignoring**

# Color Theme

## Color Variants Usage Guide

The application uses a modern, professional color palette designed for privacy-focused productivity applications. Here's how to use each color variant:

### Base Layout Colors
- `--color-background` (`#0f172a`): Main page background
- `--color-foreground` (`#e2e8f0`): Primary text color  
- `--color-border` (`222 20% 25%`): Default border color for inputs, cards, etc.
- `--color-input` (`222 20% 25%`): Form input borders
- `--color-ring` (`168 63% 63%`): Focus ring color (matches accent)

### Semantic Color Variants
- `--color-primary` (`#ffffff`): Primary buttons, key actions, main interactive elements
- `--color-primary-foreground` (`#0f172a`): Text on primary elements
- `--color-secondary` (`#94a3b8`): Secondary text, disabled states, subtle interactive elements  
- `--color-secondary-foreground` (`#0f172a`): Text on secondary elements
- `--color-muted` (`#64748b`): Disabled text, placeholder text, inactive states
- `--color-muted-foreground` (`#cbd5e1`): Text on muted backgrounds
- `--color-accent` (`#2dd4bf`): Primary actions, active states, highlights, success indicators
- `--color-accent-foreground` (`#0f172a`): Text on accent elements
- `--color-destructive` (`351 83% 73%`): Delete actions, error states, destructive operations
- `--color-destructive-foreground` (`#0f172a`): Text on destructive elements

### Surface Colors
- `--color-card` (`#1e293b`): Card backgrounds, container surfaces
- `--color-card-foreground` (`#e2e8f0`): Text on card surfaces
- `--color-popover` (`#ffffff`): Dropdown menus, popovers, tooltips
- `--color-popover-foreground` (`#0f172a`): Text on popover surfaces

This palette provides excellent accessibility (12.7:1 contrast ratio for primary text) and follows 2025-2026 design trends for privacy-focused productivity applications.

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

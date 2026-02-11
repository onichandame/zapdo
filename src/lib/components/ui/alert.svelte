<script lang="ts">
  import { type HTMLAttributes } from "svelte/elements";
  
  type Variant = 'error' | 'info';
  
  // Extract class prop separately to avoid spreading it
  const {
    variant,
    class: customClass,
    children,
    ...restProps
  }: {
    variant?: Variant;
  } & HTMLAttributes<HTMLDivElement> = $props();
  
  const alertVariant = $derived(variant ?? "info");
  const userClass = $derived(customClass ?? "");
  
  // Define base classes that apply to all alerts
  const baseClasses = "rounded-lg p-4 mb-6 text-sm font-medium";
  
  // Define classes for each variant
  const variants: Record<Variant, string> = {
    error: `${baseClasses} bg-destructive/20 border border-destructive/30 text-destructive-foreground`,
    info: `${baseClasses} bg-secondary/15 text-foreground`
  };
  
  const alertClass = $derived(
    `${variants[alertVariant as Variant]} ${userClass}`,
  );
</script>

<div class={alertClass} {...restProps}>
  {#if !!children}
    {@render children()}
  {/if}
</div>
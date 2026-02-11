<script lang="ts">
  import { type HTMLAttributes } from "svelte/elements";
  
  type Variant = 'modal' | 'form' | 'feature' | 'stat' | 'project';
  
  // Extract class prop separately to avoid spreading it
  const {
    variant,
    class: customClass,
    children,
    ...restProps
  }: {
    variant?: Variant;
  } & HTMLAttributes<HTMLDivElement> = $props();
  
  const cardVariant = $derived(variant ?? "form");
  const userClass = $derived(customClass ?? "");
  
  // Define base classes that apply to all cards
  const baseClasses = "bg-card text-card-foreground rounded-lg border border-border shadow-card";
  
  // Define classes for each variant
  const variants: Record<Variant, string> = {
    modal: `${baseClasses} max-w-md w-full p-6`,
    form: `${baseClasses} p-6 sm:p-8`,
    feature: `${baseClasses} p-6 hover:shadow-md transition-shadow`,
    stat: `${baseClasses} flex items-center gap-3 p-4`,
    project: `${baseClasses} p-6 sm:p-8 cursor-pointer hover:bg-accent hover:border-muted hover:text-accent-foreground hover:shadow-none transition-all`
  };
  
  const cardClass = $derived(
    `${variants[cardVariant]} ${userClass}`,
  );
</script>

<div class={cardClass} {...restProps}>
  {#if !!children}
    {@render children()}
  {/if}
</div>
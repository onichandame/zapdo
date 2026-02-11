<script lang="ts">
  import { type HTMLSelectAttributes } from "svelte/elements";
  
  // Extract class prop separately to avoid spreading it
  const {
    class: customClass,
    children,
    ...restProps
  }: HTMLSelectAttributes = $props();
  
  const userClass = $derived(customClass ?? "");
  
  // Define base classes for select (same as input)
  const baseClasses = "w-full px-4 py-3 bg-card text-card-foreground rounded-lg border border-border focus:outline-none focus:ring-0 focus:border-accent transition-all hover:border-[hsl(222_20%_75%)]";
  
  const selectClass = $derived(
    `${baseClasses} ${userClass}`,
  );
</script>

<select class={selectClass} {...restProps}>
  {#if !!children}
    {@render children()}
  {/if}
</select>
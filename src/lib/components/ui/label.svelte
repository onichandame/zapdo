<script lang="ts">
  import { type HTMLLabelAttributes } from "svelte/elements";
  
  // Extract class prop separately to avoid spreading it
  const {
    class: customClass,
    children,
    ...restProps
  }: HTMLLabelAttributes = $props();
  
  const userClass = $derived(customClass ?? "");
  
  // Define base classes for label
  const baseClasses = "block text-sm font-medium text-foreground mb-1";
  
  const labelClass = $derived(
    `${baseClasses} ${userClass}`,
  );
</script>

<label class={labelClass} {...restProps}>
  {#if !!children}
    {@render children()}
  {/if}
</label>
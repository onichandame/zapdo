<script lang="ts">
  import { type HTMLAttributes } from "svelte/elements";
  
  // Extract class prop separately to avoid spreading it
  const {
    class: customClass,
    children,
    ...restProps
  }: HTMLAttributes<HTMLSpanElement> = $props();
  
  const userClass = $derived(customClass ?? "");
  
  // Define base classes for error text
  const baseClasses = "text-destructive-foreground text-sm font-medium";
  
  const errorClass = $derived(
    `${baseClasses} ${userClass}`,
  );
</script>

<span class={errorClass} {...restProps}>
  {#if !!children}
    {@render children()}
  {/if}
</span>
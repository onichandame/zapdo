<script lang="ts">
  import { type HTMLInputAttributes } from "svelte/elements";
  
  // Extract class prop separately to avoid spreading it
  const {
    class: customClass,
    children,
    ...restProps
  }: HTMLInputAttributes = $props();
  
  const userClass = $derived(customClass ?? "");
  
  // Define base classes for input
  const baseClasses = "w-full px-4 py-3 bg-card text-card-foreground rounded-lg border border-border focus:outline-none focus:ring-0 focus:border-accent transition-all hover:border-[hsl(222_20%_75%)]";
  
  const inputClass = $derived(
    `${baseClasses} ${userClass}`,
  );
</script>

<input class={inputClass} {...restProps} />
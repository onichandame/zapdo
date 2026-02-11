<script lang="ts">
  import { type HTMLTextareaAttributes } from "svelte/elements";
  
  // Extract class prop separately to avoid spreading it
  const {
    class: customClass,
    ...restProps
  }: HTMLTextareaAttributes = $props();
  
  const userClass = $derived(customClass ?? "");
  
  // Define base classes for textarea (same as input)
  const baseClasses = "w-full px-4 py-3 bg-card text-card-foreground rounded-lg border border-border focus:outline-none focus:ring-0 focus:border-accent transition-all hover:border-[hsl(222_20%_75%)] resize-none";
  
  const textareaClass = $derived(
    `${baseClasses} ${userClass}`,
  );
</script>

<textarea class={textareaClass} {...restProps}></textarea>
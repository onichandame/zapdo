<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Snippet } from "svelte";
  import Card from "./card.svelte";
  import Button from "./button.svelte";
  import { X } from "phosphor-svelte";

  // Extract props
  const {
    open,
    onClose,
    title,
    showCloseButton = true,
    children,
    ...restProps
  }: {
    open: boolean;
    onClose: () => void;
    title?: string;
    showCloseButton?: boolean;
    children?: Snippet;
  } & HTMLAttributes<HTMLDivElement> = $props();

  let overlayRef = $state<HTMLDivElement | null>(null);
  let contentRef = $state<HTMLDivElement | null>(null);

  // Handle keyboard events
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }

  // Handle click outside
  function handleClickOutside(e: MouseEvent) {
    if (e.target === overlayRef) {
      onClose();
    }
  }

  // Focus management
  $effect.pre(() => {
    if (open) {
      document.addEventListener("keydown", handleKeydown);
      document.addEventListener("click", handleClickOutside);

      // Focus the content for accessibility
      if (contentRef) {
        contentRef.focus();
      }
    }
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("click", handleClickOutside);
    };
  });

  // Re-apply event listeners when open state changes
  $effect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeydown);
      document.addEventListener("click", handleClickOutside);

      // Focus the content for accessibility
      if (contentRef) {
        contentRef.focus();
      }
    } else {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("click", handleClickOutside);
    }
  });
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    bind:this={overlayRef}
    {...restProps}
  >
    <div
      class="w-full max-w-md mx-4 focus:outline-none"
      bind:this={contentRef}
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <Card variant="modal" class="relative">
        {#if showCloseButton}
          <Button
            variant="ghost"
            class="absolute right-4 top-4 p-1 h-auto w-auto z-10"
            size="sm"
            onclick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </Button>
        {/if}
        {#if title}
          <h3
            id="modal-title"
            class="text-xl font-semibold text-foreground mb-4"
          >
            {title}
          </h3>
        {/if}
        <div class="modal-body pt-2">
          {#if children}
            {@render children()}
          {/if}
        </div>
      </Card>
    </div>
  </div>
{/if}


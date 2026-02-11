<script lang="ts">
  import { type HTMLButtonAttributes } from "svelte/elements";

  type ButtonVariant =
    | "primary"
    | "secondary"
    | "destructive"
    | "ghost"
    | "link";
  type ButtonSize = "default" | "sm" | "lg";

  // Extract class prop separately to avoid spreading it
  const {
    variant,
    size,
    disabled,
    class: customClass,
    children,
    ...restProps
  }: {
    variant?: ButtonVariant;
    size?: ButtonSize;
  } & HTMLButtonAttributes = $props();

  const buttonVariant = $derived(variant ?? "primary");
  const buttonSize = $derived(size ?? "default");
  const isDisabled = $derived(disabled ?? false);
  const userClass = $derived(customClass ?? "");

  // Define base classes that apply to all buttons
  const baseClasses =
    "font-medium transition-all duration-200 cursor-pointer disabled:opacity-50";

  // Define classes for each variant
  const variants: Record<ButtonVariant, string> = {
    primary:
      "w-full bg-gradient-to-r from-accent to-accent/90 text-accent-foreground rounded-lg border border-accent/50 hover:from-accent/90 hover:to-accent/80 px-6 py-3.5 text-lg font-semibold shadow-md hover:shadow-lg",
    secondary:
      "flex items-center gap-3 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors",
    destructive:
      "flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg border border-[#fecaca] font-medium transition-all hover:bg-[#fecaca] hover:text-[#b91c1c]",
    ghost:
      "flex-1 px-4 py-2.5 bg-background text-foreground rounded-lg border border-border font-medium transition-colors hover:bg-muted hover:text-muted-foreground",
    link: "bg-transparent text-foreground hover:text-accent underline-offset-4 hover:underline p-0",
  };

  // Define size classes (if needed)
  const sizes: Record<ButtonSize, string> = {
    default: "",
    sm: "px-4 py-2 text-sm",
    lg: "px-8 py-4 text-xl",
  };

  const buttonClass = $derived(
    `${baseClasses} ${variants[buttonVariant]} ${sizes[buttonSize]} ${userClass}`,
  );
</script>

<button class={buttonClass} disabled={isDisabled} {...restProps}>
  {#if !!children}
    {@render children()}
  {/if}
</button>

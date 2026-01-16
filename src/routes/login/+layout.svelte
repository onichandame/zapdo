<script lang="ts">
  let { children } = $props();
</script>

<main class="min-h-screen bg-background text-foreground">
  {@render children()}
</main>
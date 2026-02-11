<script lang="ts">
  import { GoogleLogo, Lock } from "phosphor-svelte";
  import { onMount } from "svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Alert from "$lib/components/ui/alert.svelte";
  import Button from "$lib/components/ui/button.svelte";

  let error = $state<string | null>(null);

  onMount(() => {
    // Check if there's an error from the callback
    const urlParams = new URLSearchParams(window.location.search);
    const errorMessage = urlParams.get("error");
    if (errorMessage) {
      error = decodeURIComponent(errorMessage);
    }
  });
</script>

  <div
    class="login-page min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-6"
  >
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2 text-foreground">Welcome to ZapDo</h1>
        <p class="font-medium">Sign in to manage your private tasks securely</p>
      </div>

      <Card variant="form">
        {#if error}
          <Alert variant="error">
            <div class="flex items-center gap-2">
              <Lock size={16} />
              <span>{error}</span>
            </div>
          </Alert>
        {/if}

        <a href="/auth/google" class="flex items-center gap-3 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors w-full justify-center font-medium">
          <GoogleLogo size={20} weight="fill" />
          <span>Continue with Google</span>
        </a>

        <div class="mt-6 text-center text-sm">
          <p class="font-medium">By signing in, you agree to our privacy policy.</p>
          <p class="mt-1 font-medium">Your data remains private and secure.</p>
        </div>
      </Card>

      <div class="mt-6 text-center text-sm">
        <a href="/" class="hover:underline font-medium">← Back to home</a>
      </div>
    </div>
  </div>

<style>
  .login-page {
    scroll-behavior: smooth;
  }
</style>

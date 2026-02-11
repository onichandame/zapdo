<script lang="ts">
  import { GoogleLogo, Lock } from "phosphor-svelte";
  import { onMount } from "svelte";

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
      <p>Sign in to manage your private tasks securely</p>
    </div>

    <div class="card-form">
      {#if error}
        <div class="alert-error">
          <div class="flex items-center gap-2">
            <Lock size={16} />
            <span class="text-sm">{error}</span>
          </div>
        </div>
      {/if}

      <a
        href="/auth/google"
        class="btn-secondary w-full justify-center"
      >
        <GoogleLogo size={20} weight="fill" />
        <span>Continue with Google</span>
      </a>

      <div class="mt-6 text-center text-xs">
        <p>By signing in, you agree to our privacy policy.</p>
        <p class="mt-1">Your data remains private and secure.</p>
      </div>
    </div>

    <div class="mt-6 text-center text-sm">
      <a href="/" class="hover:underline">← Back to home</a>
    </div>
  </div>
</div>

<style>
  .login-page {
    scroll-behavior: smooth;
  }
</style>

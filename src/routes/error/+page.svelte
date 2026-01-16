<script lang="ts">
  import { page } from "$app/state";
  import { XCircle, ArrowLeft, ExclamationMark } from "phosphor-svelte";

  let errorMessage = $derived(
    page.url.searchParams.get("message") || "An unknown error occurred",
  );

  const errorMessages: Record<string, string> = {
    access_denied:
      "You denied access to your Google account. Please try again.",
    missing_params:
      "The authentication request is missing required parameters.",
    invalid_state: "The authentication request is invalid. Please try again.",
    callback_failed: "Failed to complete authentication. Please try again.",
    oauth_error: "An OAuth error occurred during authentication.",
  };

  let displayMessage = $derived(errorMessages[errorMessage] || errorMessage);
</script>

<div class="page text-foreground max-w-[600px] mx-auto p-8">
  <div class="error-container flex flex-col items-center text-center py-12">
    <div class="error-icon mb-6 p-4 rounded-full bg-[#ef444420]">
      <XCircle size={64} class="text-[#ef4444]" />
    </div>

    <h1 class="text-[2rem] font-bold mb-4 text-foreground">
      Authentication Error
    </h1>

    <div
      class="error-message flex items-center gap-3 px-6 py-4 bg-[#ef444410] border border-[#ef444430] rounded-lg mb-8"
    >
      <ExclamationMark size={24} class="text-[#ef4444]" />
      <p class="text-base text-foreground m-0">{displayMessage}</p>
    </div>

    <a
      href="/"
      class="back-button flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-90 border-none"
    >
      <ArrowLeft size={20} />
      <span>Back to Home</span>
    </a>
  </div>
</div>

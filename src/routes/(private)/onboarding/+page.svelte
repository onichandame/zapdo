<script lang="ts">
  import { Lock, ShieldCheck, CheckCircle } from "phosphor-svelte";
  import {
    generateEcdsaP256KeyPair,
    generateEcP256KeyPair as generateEcdhP256KeyPair,
    exportEcKeyToJwk,
  } from "$lib/crypto";
  import { setStorageItem, STORAGE_KEYS } from "$lib/storage";

  // State
  let isProcessing = $state(true);
  let hasCompleted = $state(false);
  let errorMessage = $state("");

  async function initializeFirstDevice() {
    try {
      // 1. Generate ECDSA key pair for device authentication
      const ecdsaKeyPair = await generateEcdsaP256KeyPair();

      // 2. Generate ECDH key pair for user messaging and DEK encryption (KEK)
      const ecdhKeyPair = await generateEcdhP256KeyPair();

      // 3. Export all keys to JWK format
      const ecdsaPrivateJwk = await exportEcKeyToJwk(ecdsaKeyPair.privateKey);
      const ecdhPrivateJwk = await exportEcKeyToJwk(ecdhKeyPair.privateKey);
      const ecdsaPublicJwk = await exportEcKeyToJwk(ecdsaKeyPair.publicKey);
      const ecdhPublicJwk = await exportEcKeyToJwk(ecdhKeyPair.publicKey);

      // 4. Store both private keys in localStorage
      setStorageItem(STORAGE_KEYS.KEK_PRIVATE_KEY, ecdhPrivateJwk); // ECDH private key for KEK operations
      setStorageItem(STORAGE_KEYS.DEVICE_AUTH_PRIVATE_KEY, ecdsaPrivateJwk); // ECDSA private key for device authentication

      // 5. Prepare public keys for server
      const authPublicKeyBase64 = btoa(JSON.stringify(ecdsaPublicJwk)); // ECDSA for device auth
      const kekPublicKeyBase64 = btoa(JSON.stringify(ecdhPublicJwk)); // ECDH for KEK operations

      // 6. Send both public keys to server
      const response = await fetch("/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authPublicKey: authPublicKeyBase64, // ECDSA public key for device authentication
          kekPublicKey: kekPublicKeyBase64, // ECDH public key for user messaging and DEK encryption
        }),
      });

      const result: { error?: string; success?: boolean; deviceId?: string } =
        await response.json();

      if (response.ok && result.success) {
        // Device registration is confirmed by successful response
        // Store the device ID in localStorage for future authentication
        setStorageItem(STORAGE_KEYS.DEVICE_ID, result.deviceId);
        hasCompleted = true;
        isProcessing = false;
      } else {
        errorMessage =
          result.error || "Failed to complete onboarding. Please try again.";
        isProcessing = false;
      }
    } catch (error) {
      errorMessage = "An error occurred during setup. Please try again.";
      console.error("Onboarding error:", error);
      isProcessing = false;
    }
  }

  // Start initialization when component loads
  $effect(() => {
    initializeFirstDevice();
  });

  function handleGetStarted() {
    window.location.href = "/tasks";
  }
</script>

<div class="max-w-2xl mx-auto">
  <header class="mb-8 text-center">
    <div class="flex justify-center mb-4">
      <div class="p-3 bg-primary/20 rounded-full">
        <Lock size={32} />
      </div>
    </div>
    <h1 class="text-3xl font-bold text-foreground mb-2">
      Setting Up Your Secure Account
    </h1>
    <p>
      We're creating your encryption keys and setting up your first trusted
      device. This process takes just a moment and ensures your data stays
      private and secure.
    </p>
  </header>

  <div
    class="bg-primary text-primary-foreground rounded-lg border border-border shadow-card p-6 sm:p-8"
  >
    {#if isProcessing}
      <div class="flex flex-col items-center justify-center py-8">
        <div
          class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"
        ></div>
        <p class="text-center">Generating encryption keys...</p>
      </div>
    {:else if hasCompleted}
      <div class="flex flex-col items-center justify-center py-8">
        <div
          class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4"
        >
          <CheckCircle size={32} class="text-white" />
        </div>
        <h2 class="text-xl font-semibold mb-2">Setup Complete!</h2>
        <p class="text-center mb-6">
          Your account is now secured with end-to-end encryption. You can access
          ZapDo from any device by requesting access from your existing devices.
        </p>
        <button
          onclick={handleGetStarted}
          class="px-6 py-3 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Get Started
        </button>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center py-8">
        <div
          class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4"
        >
          <Lock size={32} class="text-white" />
        </div>
        <h2 class="text-xl font-semibold mb-2">Setup Failed</h2>
        <p class="text-center mb-6 text-destructive-foreground">
          {errorMessage}
        </p>
        <button
          onclick={() => window.location.reload()}
          class="px-6 py-3 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    {/if}

    <div class="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
      <ShieldCheck size={16} />
      <span
        >Your data is encrypted locally and never leaves your device unencrypted</span
      >
    </div>
  </div>
</div>

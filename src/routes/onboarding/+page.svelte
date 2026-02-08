<script lang="ts">
  import { deserialize } from "$app/forms";
  import { goto } from "$app/navigation";
  import {
    exportKeyToBase64,
    generateEcP256KeyPair,
    generateEcdsaP256KeyPair,
  } from "$lib/crypto";
  import { setStorageItem } from "$lib/storage";
  import { STORAGE_KEYS } from "$lib/storage";
  import {
    CheckCircle,
    Spinner,
    ShieldCheck,
    Key,
    DeviceMobile,
    Lock,
    ArrowRight,
    Info,
  } from "phosphor-svelte";

  const { data } = $props();

  let currentStep = $state<"form" | "generating" | "registering" | "success">(
    "form",
  );
  let errorMessage = $state("");

  // Initialize based on server data - if device exists, show success immediately
  $effect(() => {
    if (data?.device) {
      currentStep = "success";
    }
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    // Set initial state
    currentStep = "generating";
    errorMessage = "";

    try {
      let authPublicKey: string;
      let kekPublicKey: string;

      try {
        const authKeyPair = await generateEcdsaP256KeyPair();
        authPublicKey = await exportKeyToBase64(authKeyPair.publicKey);
        const authPrivateKey = await exportKeyToBase64(authKeyPair.privateKey);
        setStorageItem(STORAGE_KEYS.DEVICE_AUTH_PRIVATE_KEY, authPrivateKey);

        const kekKeyPair = await generateEcP256KeyPair();
        kekPublicKey = await exportKeyToBase64(kekKeyPair.publicKey);
        const kekPrivateKey = await exportKeyToBase64(kekKeyPair.privateKey);
        setStorageItem(STORAGE_KEYS.KEK_PRIVATE_KEY, kekPrivateKey);
      } catch (err) {
        console.log(err);
        errorMessage = "Failed to generate secure keys. Please try again.";
        currentStep = "form";
        return;
      }

      // Switch to registering state
      currentStep = "registering";

      const formData = new FormData();
      formData.append("authPublicKey", authPublicKey);
      formData.append("kekPublicKey", kekPublicKey);

      const response = await fetch("/onboarding", {
        method: "POST",
        body: formData,
      });
      const result = deserialize(await response.text());

      if (result.type === `failure`) {
        console.warn(result.data);
        throw new Error("Failed to complete onboarding");
      }
      result.type;

      if (result.type === `success`) {
        setStorageItem(STORAGE_KEYS.DEVICE_ID, result.data!.deviceId);

        // Show success screen instead of immediate redirect
        currentStep = "success";
      }
    } catch (err) {
      if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = "An unknown error occurred";
      }
      currentStep = "form";
    }
  }

  async function handleContinue() {
    await goto("/projects");
  }
</script>

{#if currentStep === "success"}
  <div
    class="bg-primary text-primary-foreground rounded-xl border border-border shadow-card max-w-2xl mx-auto p-8 md:p-10"
  >
    <div class="text-center mb-8">
      <div class="flex justify-center mb-6">
        <div
          class="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4"
        >
          <CheckCircle size={48} class="text-green-500" weight="fill" />
        </div>
      </div>
      <h1 class="text-3xl font-bold text-foreground mb-4">
        Your Device is Secure! 🔒
      </h1>
      <p class="text-lg leading-relaxed mb-6">
        Your device has been successfully registered with end-to-end encryption.
        All your tasks are now protected with military-grade security.
      </p>

      <div class="bg-secondary/10 rounded-lg p-4 mb-8">
        <div class="flex items-start space-x-3">
          <ShieldCheck
            size={20}
            class="text-green-500 mt-0.5 flex-shrink-0"
            weight="fill"
          />
          <div class="text-left">
            <h3 class="font-semibold text-foreground mb-1">What This Means</h3>
            <p class="text-sm">
              Your private encryption keys are stored only on this device. Even
              we cannot access your data – it's completely private to you.
            </p>
          </div>
        </div>
      </div>

      <button
        class="w-full bg-gradient-to-r from-accent to-accent/90 text-accent-foreground rounded-lg border border-accent/50 hover:from-accent/90 hover:to-accent/80 px-6 py-3.5 font-semibold text-lg transition-all duration-200 shadow-md hover:shadow-lg"
        onclick={handleContinue}
      >
        <span class="flex items-center justify-center space-x-2">
          <span>Start Managing Tasks</span>
          <ArrowRight size={20} />
        </span>
      </button>
    </div>
  </div>
{:else if currentStep === "generating"}
  <div
    class="bg-primary text-primary-foreground rounded-xl border border-border shadow-card max-w-2xl mx-auto p-8 md:p-10"
  >
    <div class="text-center">
      <div class="flex justify-center mb-6">
        <div class="relative">
          <Spinner size={48} class="animate-spin text-foreground" />
          <div class="absolute inset-0 flex items-center justify-center">
            <Key size={24} class="text-foreground animate-pulse" />
          </div>
        </div>
      </div>
      <h2 class="text-2xl font-bold text-foreground mb-3">
        Generating Your Secure Keys
      </h2>
      <p class="text-lg mb-6">
        Creating unique encryption keys that will protect your data with
        end-to-end encryption.
      </p>

      <div class="bg-secondary/10 rounded-lg p-4 mb-6">
        <div class="flex items-start space-x-3">
          <Info size={20} class="text-foreground/70 mt-0.5 flex-shrink-0" />
          <div class="text-left">
            <p class="text-sm">
              This process happens entirely on your device. Your private keys
              never leave your browser.
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center space-x-2 text-sm">
        <div class="w-2 h-2 bg-foreground rounded-full animate-pulse"></div>
        <span>Secure key generation in progress...</span>
      </div>
    </div>
  </div>
{:else if currentStep === "registering"}
  <div
    class="bg-primary text-primary-foreground rounded-xl border border-border shadow-card max-w-2xl mx-auto p-8 md:p-10"
  >
    <div class="text-center">
      <div class="flex justify-center mb-6">
        <div class="relative">
          <Spinner size={48} class="animate-spin text-foreground" />
          <div class="absolute inset-0 flex items-center justify-center">
            <DeviceMobile size={24} class="text-foreground animate-pulse" />
          </div>
        </div>
      </div>
      <h2 class="text-2xl font-bold text-foreground mb-3">
        Registering Your Device
      </h2>
      <p class="text-lg mb-6">
        Securing your device with our servers to enable encrypted task
        management.
      </p>

      <div class="bg-secondary/10 rounded-lg p-4 mb-6">
        <div class="flex items-start space-x-3">
          <Lock size={20} class="text-foreground/70 mt-0.5 flex-shrink-0" />
          <div class="text-left">
            <p class="text-sm">
              Your device will be uniquely identified for secure access to your
              encrypted data.
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center space-x-2 text-sm">
        <div class="w-2 h-2 bg-foreground rounded-full animate-pulse"></div>
        <span>Device registration in progress...</span>
      </div>
    </div>
  </div>
{:else}
  <div
    class="bg-primary text-primary-foreground rounded-xl border border-border shadow-card max-w-2xl mx-auto p-8 md:p-10"
  >
    <div class="text-center mb-8">
      <div
        class="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6"
      >
        <ShieldCheck size={32} class="text-accent-foreground" weight="fill" />
      </div>
      <h1 class="text-3xl font-bold text-foreground mb-4">
        Secure Your Device
      </h1>
      <p class="text-lg leading-relaxed mb-6">
        Welcome to ZapDo! To protect your data with end-to-end encryption, we
        need to set up secure keys for this device.
      </p>
    </div>

    {#if errorMessage}
      <div
        class="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-8 text-center"
      >
        <p class="text-destructive font-medium">{errorMessage}</p>
      </div>
    {/if}

    <div class="space-y-6 mb-8">
      <div class="bg-secondary/10 rounded-lg p-5">
        <div class="flex items-start space-x-4">
          <div
            class="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <Key size={20} class="text-green-500" weight="fill" />
          </div>
          <div class="text-left">
            <h3 class="font-semibold text-foreground mb-2">
              Private Encryption Keys
            </h3>
            <p class="text-sm">
              Unique keys are generated just for this device. Your private keys
              stay on your device and never leave your browser.
            </p>
          </div>
        </div>
      </div>

      <div class="bg-secondary/10 rounded-lg p-5">
        <div class="flex items-start space-x-4">
          <div
            class="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <Lock size={20} class="text-blue-500" weight="fill" />
          </div>
          <div class="text-left">
            <h3 class="font-semibold text-foreground mb-2">
              End-to-End Encryption
            </h3>
            <p class="text-sm">
              All your tasks are encrypted before they leave your device. Only
              you can decrypt them.
            </p>
          </div>
        </div>
      </div>

      <div class="bg-secondary/10 rounded-lg p-5">
        <div class="flex items-start space-x-4">
          <div
            class="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <DeviceMobile size={20} class="text-purple-500" weight="fill" />
          </div>
          <div class="text-left">
            <h3 class="font-semibold text-foreground mb-2">
              Device-Specific Security
            </h3>
            <p class="text-sm">
              Each device you use gets its own unique keys. You'll need to
              complete this setup on each new device.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center mb-6">
      <p class="text-sm">
        <span class="font-medium text-foreground"
          >This process takes about 10-15 seconds</span
        > and happens entirely on your device.
      </p>
    </div>

    <form onsubmit={handleSubmit}>
      <button
        type="submit"
        disabled={currentStep !== "form"}
        class="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg border border-primary/50 hover:from-primary/90 hover:to-primary/80 px-6 py-3.5 font-semibold text-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        Secure My Device
      </button>
    </form>

    <div class="text-center mt-6">
      <p class="text-xs">
        By clicking "Secure My Device", you agree to our privacy-first approach
        to data security.
      </p>
    </div>
  </div>
{/if}

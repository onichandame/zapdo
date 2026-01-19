<script lang="ts">
  import { Lock, ShieldCheck, Key, Eye, EyeSlash } from "phosphor-svelte";

  // Form state
  let masterPassword = $state("");
  let confirmPassword = $state("");
  let passwordStrength = $state(0);
  let showPassword = $state(false);
  let isSubmitting = $state(false);
  let errorMessage = $state("");

  // Calculate password strength
  $effect(() => {
    if (!masterPassword) {
      passwordStrength = 0;
      return;
    }

    let strength = 0;
    if (masterPassword.length >= 8) strength += 25;
    if (/[a-z]/.test(masterPassword)) strength += 25;
    if (/[A-Z]/.test(masterPassword)) strength += 25;
    if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(masterPassword))
      strength += 25;

    passwordStrength = Math.min(100, strength);
  });

  async function handleSubmit() {
    if (isSubmitting) return;

    // Validation
    if (!masterPassword) {
      errorMessage = "Please enter a master password";
      return;
    }

    if (masterPassword.length < 8) {
      errorMessage = "Password must be at least 8 characters long";
      return;
    }

    if (masterPassword !== confirmPassword) {
      errorMessage = "Passwords do not match";
      return;
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      // Generate key derivation parameters on client side
      const keyDerivationSalt = crypto.randomUUID();
      const keyDerivationIterations = 100000;

      // TODO: In a real implementation, we would:
      // 1. Derive KEK from masterPassword using PBKDF2 with the salt and iterations
      // 2. Generate RSA key pair
      // 3. Encrypt private key with derived KEK
      // 4. Send only the public key, encrypted private key, salt, and iterations to server

      // For now, using placeholders as requested (master password never sent to backend)
      const publicKey = "placeholder-public-key";
      const encryptedPrivateKey = "placeholder-encrypted-private-key";

      // Create FormData instead of JSON
      const formData = new FormData();
      formData.append("keyDerivationSalt", keyDerivationSalt);
      formData.append(
        "keyDerivationIterations",
        keyDerivationIterations.toString(),
      );
      formData.append("publicKey", publicKey);
      formData.append("encryptedPrivateKey", encryptedPrivateKey);

      const response = await fetch("/onboarding", {
        method: "POST",
        body: formData,
      });

      const result: { error?: string } = await response.json();

      if (response.ok) {
        // Redirect to tasks page after successful setup
        window.location.href = "/tasks";
      } else {
        errorMessage =
          result.error || "Failed to set master password. Please try again.";
      }
    } catch (error) {
      errorMessage = "An error occurred. Please try again.";
      console.error("Onboarding error:", error);
    } finally {
      isSubmitting = false;
    }
  }

  function getPasswordStrengthColor() {
    if (passwordStrength < 30) return "bg-red-500";
    if (passwordStrength < 60) return "bg-yellow-500";
    if (passwordStrength < 90) return "bg-blue-500";
    return "bg-green-500";
  }

  function getPasswordStrengthText() {
    if (passwordStrength < 30) return "Weak";
    if (passwordStrength < 60) return "Fair";
    if (passwordStrength < 90) return "Good";
    return "Strong";
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
      Set Your Master Password
    </h1>
    <p>
      Your master password protects all your data with end-to-end encryption.
      Choose a strong password that you'll remember—it <strong
        >cannot be recovered</strong
      >.
    </p>
  </header>

  <div
    class="bg-primary text-primary-foreground rounded-lg border border-border shadow-card p-6 sm:p-8"
  >
    <form onsubmit={handleSubmit} class="space-y-6">
      <div>
        <label
          for="masterPassword"
          class="block text-sm font-medium text-foreground mb-2"
        >
          Master Password
        </label>
        <div class="relative">
          <input
            type={showPassword ? "text" : "password"}
            id="masterPassword"
            bind:value={masterPassword}
            class="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter your master password"
            disabled={isSubmitting}
          />
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            class="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
          >
            {#if showPassword}
              <EyeSlash size={16} />
            {:else}
              <Eye size={16} />
            {/if}
          </button>
        </div>

        {#if masterPassword}
          <div class="mt-2">
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm text-muted-foreground"
                >Password strength</span
              >
              <span class="text-sm font-medium"
                >{getPasswordStrengthText()}</span
              >
            </div>
            <div class="w-full bg-secondary rounded-full h-2">
              <div
                class={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                style={`width: ${passwordStrength}%`}
              ></div>
            </div>
          </div>
        {/if}

        <div class="mt-3 text-sm text-muted-foreground space-y-1">
          <p>• Must be at least 8 characters long</p>
          <p>• Include uppercase and lowercase letters</p>
          <p>• Include numbers or special characters</p>
          <p>• This password cannot be recovered—keep it safe!</p>
        </div>
      </div>

      <div>
        <label
          for="confirmPassword"
          class="block text-sm font-medium text-foreground mb-2"
        >
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          bind:value={confirmPassword}
          class="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Confirm your master password"
          disabled={isSubmitting}
        />
      </div>

      {#if errorMessage}
        <div
          class="p-3 bg-destructive/20 border border-destructive/30 rounded-lg text-destructive-foreground text-sm"
        >
          {errorMessage}
        </div>
      {/if}

      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <ShieldCheck size={16} />
        <span
          >Your data is encrypted locally and never leaves your device
          unencrypted</span
        >
      </div>

      <button
        type="submit"
        class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        disabled={isSubmitting}
      >
        {#if isSubmitting}
          <div
            class="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"
          ></div>
          <span>Setting up encryption...</span>
        {:else}
          <Key size={20} />
          <span>Set Master Password</span>
        {/if}
      </button>
    </form>
  </div>

  <div class="mt-6 text-center text-sm text-muted-foreground">
    <p>
      By setting your master password, you enable end-to-end encryption for all
      your projects and tasks. Your data remains private and secure—only you can
      access it.
    </p>
  </div>
</div>

<script lang="ts">
  import { goto } from "$app/navigation";
  import { kekStore } from "$lib/stores/kekStore";
  import {
    deriveKeyFromPassword,
    decryptWithKek,
    decryptWithAesGcm,
    importAesKey,
  } from "$lib/crypto";
  import type { UserKek } from "$lib/server/db/schema";
  import { dekStore } from "$lib/stores/dekStore.js";

  let { data } = $props();

  let masterPassword = $state("");
  let error = $state("");
  let isSubmitting = $state(false);

  async function validateMasterPassword(password: string): Promise<boolean> {
    try {
      const latestKek = data.userKeks[0] as UserKek;

      // Derive KEK from master password and salt
      const kek = await deriveKeyFromPassword(
        password,
        latestKek.keyDerivationSalt,
        latestKek.keyDerivationIterations,
      );

      // Parse the encrypted private key (which includes IV)
      const [encryptedPrivateKeyBase64, ivBase64] =
        latestKek.encryptedPrivateKey.split(":");

      // Try to decrypt the private key to validate the password
      await decryptWithKek(encryptedPrivateKeyBase64, ivBase64, kek);

      // If decryption succeeds, password is valid
      // Store the KEK in memory
      $kekStore = kek;

      for (const proj of data.projects) {
        const encryptedDek = JSON.parse(proj.deks[0].encryptedDek) as {
          encryptedData: string;
          iv: string;
        };
        const dek = await decryptWithAesGcm(
          encryptedDek.encryptedData,
          encryptedDek.iv,
          kek,
        ).then((str) => importAesKey(str));
        $dekStore[proj.id] = dek;
      }

      return true;
    } catch (err) {
      console.error("Master password validation failed:", err);
      return false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    isSubmitting = true;
    error = "";

    if (!masterPassword.trim()) {
      error = "Please enter your master password";
      isSubmitting = false;
      return;
    }

    try {
      const isValid = await validateMasterPassword(masterPassword);

      if (isValid) {
        // Redirect to original destination
        await goto(data.redirectUrl);
      } else {
        error = "Invalid master password. Please try again.";
      }
    } catch (err) {
      console.error("Unlock failed:", err);
      error = "An error occurred. Please try again.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div
    class="bg-primary text-primary-foreground rounded-lg border border-border shadow-card w-full max-w-md p-6"
  >
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-foreground mb-2">Unlock Your Data</h1>
      <p class="text-sm text-muted-foreground">
        Enter your master password to access your encrypted projects
      </p>
    </div>

    <form onsubmit={handleSubmit}>
      <div class="space-y-4">
        <div>
          <label
            for="master-password"
            class="block text-sm font-medium text-foreground mb-1"
          >
            Master Password
          </label>
          <input
            type="password"
            id="master-password"
            value={masterPassword}
            oninput={(e) =>
              (masterPassword = (e.target as HTMLInputElement).value)}
            class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter your master password"
            required
          />
        </div>

        {#if error}
          <div class="text-destructive text-sm text-center">
            {error}
          </div>
        {/if}

        <button
          type="submit"
          disabled={isSubmitting}
          class="w-full px-4 py-2.5 bg-accent text-accent-foreground rounded-lg border border-border font-medium transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50 cursor-pointer"
        >
          {#if isSubmitting}
            <span class="flex items-center justify-center">
              <span
                class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"
              ></span>
              Unlocking...
            </span>
          {:else}
            Unlock
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>

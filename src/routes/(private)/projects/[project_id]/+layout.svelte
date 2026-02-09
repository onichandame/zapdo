<script lang="ts">
  import { onMount } from "svelte";
  import { projectStore } from "$lib/stores/project";
  import { decryptWithAesGcm } from "$lib/crypto";
  import { dekStore } from "$lib/stores/dekStore.js";

  let { data, children } = $props();

  onMount(async () => {
    try {
      const project = data.project;
      const dek = $dekStore[project.id];

      if (!dek) {
        console.error("No DEK found for project:", project.id);
        return;
      }

      // Decrypt the project name
      const decryptedName = await decryptWithAesGcm(project.name, dek);
      const decryptedDescription = project.description
        ? await decryptWithAesGcm(project.description, dek)
        : ``;

      // Create decrypted project object
      const decryptedProject = {
        ...project,
        name: decryptedName,
        description: decryptedDescription,
      };

      // Populate the store
      projectStore.set(decryptedProject);
    } catch (error) {
      console.error("Failed to decrypt project:", error);
      // Handle error appropriately - maybe redirect or show error state
    }
  });
</script>

{@render children()}


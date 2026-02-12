<script lang="ts">
  import { projectsStore, projectStore } from "$lib/stores/project";

  let { children, params } = $props();

  $effect.pre(() => {
    let active = true;
    const loadProject = async () => {
      try {
        const project = $projectsStore.find(
          (v) => v.project.id === params.project_id,
        );
        // Populate the store
        if (active && project) projectStore.set(project);
      } catch (error) {
        console.error("Failed to decrypt project:", error);
        // Handle error appropriately - maybe redirect or show error state
      }
      return () => {
        active = false;
      };
    };
    loadProject();
  });
</script>

{#if $projectStore}
  {@render children()}
{/if}

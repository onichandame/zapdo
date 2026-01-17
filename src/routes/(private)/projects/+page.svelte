<script lang="ts">
  import { Folder, Plus, Pencil, Trash } from "phosphor-svelte";

  let { data } = $props();
</script>

<header class="mb-8">
  <h1 class="text-3xl font-bold text-foreground mb-2">Projects</h1>
  <p>Manage projects</p>
</header>

<div class="space-y-4">
  {#each data?.projects as project (project.id)}
    <div
      class="bg-primary text-primary-foreground rounded-lg border border-border shadow-card p-6 sm:p-8"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-md flex items-center justify-center"
            style="background-color: {project.color}20; color: {project.color}"
          >
            <Folder size={24} weight="fill" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">
              {project.name}
            </h2>
            {#if project.description}
              <p class="text-sm text-muted-foreground mt-1">
                {project.description}
              </p>
            {/if}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Edit project"
          >
            <Pencil size={18} />
          </button>
          <button
            class="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Delete project"
          >
            <Trash size={18} />
          </button>
        </div>
      </div>
    </div>
  {/each}
</div>

<div class="mt-8">
  <button
    class="flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-lg border border-border hover:bg-background hover:text-foreground transition-colors"
  >
    <Plus size={20} />
    <span>Create New Project</span>
  </button>
</div>


<script lang="ts">
  import { Folder, Plus, ArrowLeft } from "phosphor-svelte";
  import { enhance } from "$app/forms";

  let { form } = $props();

  let isCreating = $state(false);
  let createFormError = $state("");
  
  $effect(() => {
    if (form?.success) {
      createFormError = "";
      isCreating = false;
      // Redirect to projects list after successful creation
      window.location.href = '/projects';
    }
    if (form?.error) {
      createFormError = form.error;
      isCreating = false;
    }
  });
</script>

<header class="mb-8">
  <h1 class="text-3xl font-bold text-foreground mb-2">Create New Project</h1>
</header>

<div class="max-w-2xl">
  <form method="POST" action="?/createProject" use:enhance={() => {
    isCreating = true;
    return async ({ result }) => {
      if (result.type === 'success') {
        createFormError = "";
        isCreating = false;
        // Redirect to projects list
        window.location.href = '/projects';
      } else {
        isCreating = false;
      }
    };
  }}>
    <div class="space-y-4">
      <div>
        <label for="name" class="block text-sm font-medium text-foreground mb-1">
          Project Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Enter project name"
        />
      </div>
      
      <div>
        <label for="description" class="block text-sm font-medium text-foreground mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          rows="3"
          placeholder="Describe your project"
        ></textarea>
      </div>
      
      <div>
        <label for="color" class="block text-sm font-medium text-foreground mb-1">
          Color
        </label>
        <select
          id="color"
          name="color"
          required
          class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="#3b82f6">Blue</option>
          <option value="#ef4444">Red</option>
          <option value="#10b981">Green</option>
          <option value="#f59e0b">Amber</option>
          <option value="#8b5cf6">Purple</option>
          <option value="#ec4899">Pink</option>
          <option value="#06b6d4">Cyan</option>
          <option value="#f97316">Orange</option>
        </select>
      </div>
      
      <div>
        <label for="icon" class="block text-sm font-medium text-foreground mb-1">
          Icon
        </label>
        <select
          id="icon"
          name="icon"
          required
          class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="folder">Folder</option>
          <option value="star">Star</option>
          <option value="rocket">Rocket</option>
          <option value="chart">Chart</option>
          <option value="lightbulb">Lightbulb</option>
          <option value="target">Target</option>
          <option value="book">Book</option>
          <option value="gear">Gear</option>
        </select>
      </div>
      
      {#if createFormError}
        <div class="text-destructive text-sm">{createFormError}</div>
      {/if}
      
      <div class="flex gap-3">
        <button
          type="submit"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-md border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
          disabled={isCreating}
        >
          {#if isCreating}
            Creating...
          {:else}
            Create Project
          {/if}
        </button>
        <a
          href="/projects"
          class="px-4 py-2 bg-background text-foreground rounded-md border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <ArrowLeft size={16} class="inline mr-1" />
          Cancel
        </a>
      </div>
    </div>
  </form>
</div>
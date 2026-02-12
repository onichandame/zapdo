<script lang="ts">
  import {
    Folder,
    Plus,
    Star,
    Rocket,
    ChartBar,
    Lightbulb,
    Target,
    Book,
    GearSix,
  } from "phosphor-svelte";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Modal from "$lib/components/ui/modal.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import Textarea from "$lib/components/ui/textarea.svelte";
  import Select from "$lib/components/ui/select.svelte";
  import Label from "$lib/components/ui/label.svelte";
  import Error from "$lib/components/ui/error.svelte";
  import { projectsStore } from "$lib/stores/project.js";

  let { data } = $props();

  let isCreating = $state(false);
  let createProjectName = $state("");
  let createProjectDescription = $state("");
  let createProjectColor = $state("#3b82f6");
  let createProjectIcon = $state("folder");

  let createFormError = $state("");

  function showCreateDialog() {
    isCreating = true;
    createProjectName = "";
    createProjectDescription = "";
    createProjectColor = "#3b82f6";
    createProjectIcon = "folder";
    createFormError = "";
  }

  function cancelCreate() {
    isCreating = false;
    createFormError = "";
  }

  // Handle Escape key to close dialogs
  $effect(() => {
    if (isCreating) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          cancelCreate();
        }
      };

      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  });
</script>

<header class="mb-8">
  <h1 class="text-3xl font-bold text-foreground mb-2">Projects</h1>
</header>

{#if $projectsStore.length === 0}
  {#if data?.projects && data.projects.length === 0}
    <div class="col-span-full text-center py-12">
      <div class="text-muted-foreground mb-4">No projects yet</div>
      <Button
        variant="secondary"
        class="bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground"
        onclick={() => showCreateDialog()}
      >
        Create Your First Project
      </Button>
    </div>
  {:else}
    <div class="col-span-full text-center py-12">
      <div class="text-muted-foreground mb-4">No projects to display</div>
    </div>
  {/if}
{:else}
  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
  >
    <Card
      variant="project"
      class="h-full flex flex-col items-center justify-center cursor-pointer hover:bg-accent hover:border-muted hover:text-accent-foreground hover:shadow-none hover:scale-[1.02] transition-all duration-200 ease-out"
      onclick={() => showCreateDialog()}
      role="button"
      tabindex={0}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          showCreateDialog();
        }
      }}
    >
      <Plus size={48} weight="light" class="text-muted-foreground mb-4" />
      <h2 class="text-xl font-semibold text-foreground m-0">
        Create New Project
      </h2>
    </Card>
    {#each $projectsStore.map((v) => v.project) as project (project.id)}
      <a href={`/projects/${project.id}/tasks`} class="no-underline">
        <Card
          variant="project"
          class="h-full flex flex-col cursor-pointer hover:bg-accent hover:border-muted hover:text-accent-foreground hover:shadow-none hover:scale-[1.02] transition-all duration-200 ease-out"
          role="button"
          tabindex={0}
        >
          <div
            class="w-12 h-12 rounded-md flex items-center justify-center mb-4"
            style="background-color: {project.color}20; color: {project.color}"
          >
            {#if project.icon === "star"}
              <Star size={24} weight="fill" />
            {:else if project.icon === "rocket"}
              <Rocket size={24} weight="fill" />
            {:else if project.icon === "chart"}
              <ChartBar size={24} weight="fill" />
            {:else if project.icon === "lightbulb"}
              <Lightbulb size={24} weight="fill" />
            {:else if project.icon === "target"}
              <Target size={24} weight="fill" />
            {:else if project.icon === "book"}
              <Book size={24} weight="fill" />
            {:else if project.icon === "gear"}
              <GearSix size={24} weight="fill" />
            {:else}
              <Folder size={24} weight="fill" />
            {/if}
          </div>

          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-semibold text-foreground m-0 truncate">
              {project.name}
            </h2>
            {#if project.description}
              <p class="text-sm mt-1 text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            {/if}
          </div>
        </Card>
      </a>
    {/each}
  </div>
{/if}

<Modal open={isCreating} onClose={cancelCreate} title="Create Project">
  <form method="POST" action="?/createProject">
    <div class="space-y-4">
      <div>
        <Label for="create-name">Project Name</Label>
        <Input
          type="text"
          id="create-name"
          name="name"
          value={createProjectName}
          oninput={(e) =>
            (createProjectName = (e.target as HTMLInputElement).value)}
          required
          placeholder="Enter project name"
        />
      </div>

      <div>
        <Label for="create-description">Description (optional)</Label>
        <Textarea
          id="create-description"
          name="description"
          value={createProjectDescription}
          oninput={(e) =>
            (createProjectDescription = (e.target as HTMLTextAreaElement)
              .value)}
          rows={3}
          placeholder="Describe your project"
        />
      </div>

      <div>
        <Label for="create-color">Color</Label>
        <Select
          id="create-color"
          name="color"
          value={createProjectColor}
          oninput={(e) =>
            (createProjectColor = (e.target as HTMLSelectElement).value)}
          required
        >
          <option value="#3b82f6">Blue</option>
          <option value="#ef4444">Red</option>
          <option value="#10b981">Green</option>
          <option value="#f59e0b">Amber</option>
          <option value="#8b5cf6">Purple</option>
          <option value="#ec4899">Pink</option>
          <option value="#06b6d4">Cyan</option>
          <option value="#f97316">Orange</option>
        </Select>
      </div>

      <div>
        <Label for="create-icon">Icon</Label>
        <Select
          id="create-icon"
          name="icon"
          value={createProjectIcon}
          oninput={(e) =>
            (createProjectIcon = (e.target as HTMLSelectElement).value)}
          required
        >
          <option value="folder">Folder</option>
          <option value="star">Star</option>
          <option value="rocket">Rocket</option>
          <option value="chart">Chart</option>
          <option value="lightbulb">Lightbulb</option>
          <option value="target">Target</option>
          <option value="book">Book</option>
          <option value="gear">Gear</option>
        </Select>
      </div>

      {#if createFormError}
        <Error>
          {createFormError}
        </Error>
      {/if}

      <div class="flex gap-3">
        <Button type="submit" variant="primary" class="flex-1">
          Create Project
        </Button>
        <Button
          type="button"
          variant="ghost"
          class="flex-1"
          onclick={cancelCreate}
        >
          Cancel
        </Button>
      </div>
    </div>
  </form>
</Modal>

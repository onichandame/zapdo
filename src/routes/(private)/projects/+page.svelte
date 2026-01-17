<script lang="ts">
  import { Folder, Plus, Trash, X } from "phosphor-svelte";
  import { enhance } from "$app/forms";
  import type { Attachment } from "svelte/attachments";

  let { data, form } = $props();

  let isDeleting = $state(false);
  let deleteProjectId = $state("");
  let deleteProjectName = $state("");
  let deleteFormError = $state("");

  let isEditing = $state(false);
  let editProjectId = $state("");
  let editProjectName = $state("");
  let editProjectDescription = $state("");
  let editProjectColor = $state("#3b82f6");
  let editProjectIcon = $state("folder");
  let editFormError = $state("");

  // Create attachment functions
  const deleteClickOutside: Attachment<HTMLElement> = (node) => {
    const handleClick = (event: MouseEvent) => {
      if (node && !node.contains(event.target as Node)) {
        cancelDelete();
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  };

  const editClickOutside: Attachment<HTMLElement> = (node) => {
    const handleClick = (event: MouseEvent) => {
      if (node && !node.contains(event.target as Node)) {
        cancelEdit();
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  };

  $effect(() => {
    if (form?.error) {
      if (isEditing) {
        editFormError = form.error;
      } else {
        // Handle delete errors
        deleteFormError = form.error;
      }
    }
  });

  function showDeleteConfirmation(projectId: string, projectName: string) {
    deleteProjectId = projectId;
    deleteProjectName = projectName;
  }

  function cancelDelete() {
    deleteProjectId = "";
    deleteProjectName = "";
    deleteFormError = "";
  }

  function showEditDialog(
    projectId: string,
    name: string,
    description: string,
    color: string,
    icon: string,
  ) {
    editProjectId = projectId;
    editProjectName = name;
    editProjectDescription = description || "";
    editProjectColor = color;
    editProjectIcon = icon;
    isEditing = true;
  }

  function cancelEdit() {
    editProjectId = "";
    editFormError = "";
    isEditing = false;
  }

  // Handle Escape key to close dialogs
  $effect(() => {
    if (isEditing || deleteProjectId) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (isEditing) {
            cancelEdit();
          } else if (deleteProjectId) {
            cancelDelete();
          }
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

{#if data?.projects && data.projects.length === 0}
  <div class="text-center py-12">
    <div class="text-muted-foreground mb-4">No projects yet</div>
    <a
      href="/projects/new"
      class="flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Plus size={20} />
      <span>Create Your First Project</span>
    </a>
  </div>
{:else}
  <div class="space-y-4">
    {#each data?.projects as project (project.id)}
      <div
        class="group project-card flex items-center gap-4 p-6 sm:p-8 bg-primary text-primary-foreground rounded-lg border border-border shadow-card transition-all hover:bg-accent hover:border-muted hover:text-accent-foreground hover:shadow-none cursor-pointer"
        role="button"
        tabindex="0"
        onclick={() =>
          showEditDialog(
            project.id,
            project.name,
            project.description ?? "",
            project.color,
            project.icon,
          )}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            showEditDialog(
              project.id,
              project.name,
              project.description ?? "",
              project.color,
              project.icon,
            );
          }
        }}
      >
        <div
          class="w-12 h-12 rounded-md flex items-center justify-center"
          style="background-color: {project.color}20; color: {project.color}"
        >
          <Folder size={24} weight="fill" />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-semibold text-foreground m-0">
            {project.name}
          </h2>
          {#if project.description}
            <p class="text-sm mt-1">
              {project.description}
            </p>
          {/if}
        </div>
        <button
          class="delete-button flex-shrink-0 bg-none border-none cursor-pointer p-2 rounded-md transition-all hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444] opacity-0 group-hover:opacity-100"
          onclick={(e) => {
            e.stopPropagation();
            showDeleteConfirmation(project.id, project.name);
          }}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              showDeleteConfirmation(project.id, project.name);
            }
          }}
          aria-label="Delete project"
        >
          <Trash size={18} />
        </button>
      </div>
    {/each}
  </div>

  <div class="mt-8">
    <a
      href="/projects/new"
      class="flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Plus size={20} />
      <span>Create New Project</span>
    </a>
  </div>
{/if}

{#if deleteProjectId}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
  >
    <div
      class="bg-primary text-primary-foreground rounded-lg border border-border shadow-card max-w-md w-full p-6"
      {@attach deleteClickOutside}
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-foreground">Confirm Deletion</h3>
        <button
          class="p-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          onclick={cancelDelete}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>

      <p class="text-sm mb-6">
        Are you sure you want to delete the project "<span
          class="font-medium text-foreground">{deleteProjectName}</span
        >"? This action cannot be undone and will remove all associated data.
      </p>

      {#if deleteFormError}
        <div class="text-destructive text-sm mb-4">{deleteFormError}</div>
      {/if}

      <div class="flex gap-3">
        <button
          class="flex-1 px-4 py-2.5 bg-background text-foreground rounded-lg border border-border font-medium transition-colors hover:bg-muted hover:text-muted-foreground cursor-pointer"
          onclick={cancelDelete}
          disabled={isDeleting}
        >
          Cancel
        </button>
        <form
          method="POST"
          action="?/deleteProject"
          use:enhance={() => {
            isDeleting = true;
            return async ({ result, update }) => {
              if (result.type === "success") {
                deleteProjectId = "";
                deleteProjectName = "";
                isDeleting = false;
                // Invalidate all data to refresh the project list
                await update({ invalidateAll: true });
              } else {
                isDeleting = false;
                // Error will be handled in the $effect
              }
            };
          }}
        >
          <input type="hidden" name="projectId" value={deleteProjectId} />
          <button
            type="submit"
            class="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg border border-destructive font-medium transition-colors hover:bg-[#ef4444] hover:text-white disabled:opacity-50 cursor-pointer"
            disabled={isDeleting}
          >
            {#if isDeleting}
              <span class="flex items-center justify-center">
                <span
                  class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"
                ></span>
                Deleting...
              </span>
            {:else}
              Delete Project
            {/if}
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

{#if isEditing}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
  >
    <div
      class="bg-primary text-primary-foreground rounded-lg border border-border shadow-card max-w-md w-full p-6"
      {@attach editClickOutside}
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-foreground">Edit Project</h3>
        <button
          class="p-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          onclick={cancelEdit}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>

      <form
        method="POST"
        action="?/updateProject"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === "success") {
              editProjectId = "";
              editFormError = "";
              isEditing = false;
              // Invalidate all data to refresh the project list
              await update({ invalidateAll: true });
            } else {
              // Error will be handled in the $effect
            }
          };
        }}
      >
        <input type="hidden" name="projectId" value={editProjectId} />
        <div class="space-y-4">
          <div>
            <label
              for="edit-name"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Project Name
            </label>
            <input
              type="text"
              id="edit-name"
              name="name"
              value={editProjectName}
              required
              class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label
              for="edit-description"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Description (optional)
            </label>
            <textarea
              id="edit-description"
              name="description"
              class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              rows="3"
              placeholder="Describe your project"
              >{editProjectDescription}</textarea
            >
          </div>

          <div>
            <label
              for="edit-color"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Color
            </label>
            <select
              id="edit-color"
              name="color"
              value={editProjectColor}
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
            <label
              for="edit-icon"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Icon
            </label>
            <select
              id="edit-icon"
              name="icon"
              value={editProjectIcon}
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

          {#if editFormError}
            <div class="text-destructive text-sm">{editFormError}</div>
          {/if}

          <div class="flex gap-3">
            <button
              type="submit"
              class="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg border border-border font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              Update Project
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2.5 bg-background text-foreground rounded-lg border border-border font-medium transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
              onclick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<script lang="ts">
  import {
    Folder,
    Plus,
    Trash,
    X,
    Star,
    Rocket,
    ChartBar,
    Lightbulb,
    Target,
    Book,
    GearSix,
    PencilSimple,
    ArrowClockwise,
  } from "phosphor-svelte";
  import { enhance } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import type { Attachment } from "svelte/attachments";
  import { generateAesKey, exportAesKey, encryptWithAesGcm } from "$lib/crypto";
  import { kekStore } from "$lib/stores/kekStore";
  import { dekStore } from "$lib/stores/dekStore";
  import { decryptDataWithDek } from "$lib/utils/decryptData";

  let { data, form } = $props();

  // Decrypted projects state
  let decryptedProjects = $state<any[]>([]);
  let decryptionErrors = $state<Record<string, string>>({});
  let isDecrypting = $state(true);

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
  let editProjectParentId = $state<string | null>(null);
  let editFormError = $state("");

  let isCreating = $state(false);
  let createProjectName = $state("");
  let createProjectDescription = $state("");
  let createProjectColor = $state("#3b82f6");
  let createProjectIcon = $state("folder");
  let createProjectParentId = $state<string | null>(null);
  let createFormError = $state("");

  let isRefreshing = $state(false);

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

  const createClickOutside: Attachment<HTMLElement> = (node) => {
    const handleClick = (event: MouseEvent) => {
      if (node && !node.contains(event.target as Node)) {
        cancelCreate();
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  };

  $effect(() => {
    if (form?.error) {
      if (isCreating) {
        createFormError = form.error;
      } else if (isEditing) {
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
    parentId: string | null = null,
  ) {
    editProjectId = projectId;
    editProjectName = name;
    editProjectDescription = description || "";
    editProjectColor = color;
    editProjectIcon = icon;
    editProjectParentId = parentId;
    isEditing = true;
  }

  function cancelEdit() {
    editProjectId = "";
    editFormError = "";
    isEditing = false;
  }

  function showCreateDialog(parentId: string | null = null) {
    isCreating = true;
    createProjectName = "";
    createProjectDescription = "";
    createProjectColor = "#3b82f6";
    createProjectIcon = "folder";
    createProjectParentId = parentId;
    createFormError = "";
  }

  function cancelCreate() {
    isCreating = false;
    createFormError = "";
  }

  async function refreshProjects() {
    isRefreshing = true;
    try {
      // Invalidate all data to trigger re-fetch from server
      await invalidateAll();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      isRefreshing = false;
    }
  }

  // Handle Escape key to close dialogs
  $effect(() => {
    if (isCreating || isEditing || deleteProjectId) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (isCreating) {
            cancelCreate();
          } else if (isEditing) {
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

  // Auto-refresh when user returns to tab
  $effect(() => {
    const handleFocus = () => {
      // Small delay to avoid refreshing immediately on load
      setTimeout(() => {
        if (!isRefreshing && !isCreating && !isEditing && !deleteProjectId) {
          refreshProjects();
        }
      }, 1000);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  });

  // Decrypt projects when data or DEKs change
  $effect(() => {
    if (!data?.projects || data.projects.length === 0) {
      decryptedProjects = [];
      isDecrypting = false;
      return;
    }

    isDecrypting = true;

    // Create a function to handle async decryption
    const decryptProjects = async () => {
      const deks = $dekStore;
      const newDecryptedProjects: (typeof data.projects)[number][] = [];
      const newDecryptionErrors: Record<string, string> = {};

      for (const project of data!.projects) {
        try {
          const dek = deks[project.id];
          if (!dek) {
            newDecryptionErrors[project.id] = "DEK not available";
            // Create a copy of the original project with error message
            const errorProject = {
              ...project,
              name: "[Decryption Error: DEK missing]",
              description: "",
            };
            newDecryptedProjects.push(errorProject);
            continue;
          }

          const encryptedName = JSON.parse(project.name);
          const encryptedDescription = project.description
            ? JSON.parse(project.description)
            : null;

          const decryptedName = await decryptDataWithDek(encryptedName, dek);
          const decryptedDescription = await decryptDataWithDek(
            encryptedDescription,
            dek,
          );

          const decryptedData = {
            id: project.id,
            name: decryptedName,
            description: decryptedDescription,
            color: project.color,
            icon: project.icon,
            parentId: project.parentId,
            hasSubprojects: project.hasSubprojects,
            subprojectsCount: project.subprojectsCount,
          };
          // Create a copy of the original project with decrypted data
          const decryptedProject = {
            ...project,
            name: decryptedData.name,
            description: decryptedData.description,
          };
          newDecryptedProjects.push(decryptedProject);
        } catch (error) {
          console.error(`Failed to decrypt project ${project.id}:`, error);
          newDecryptionErrors[project.id] = "Decryption failed";
          // Create a copy of the original project with error message
          const errorProject = {
            ...project,
            name: "[Decryption Error]",
            description: "",
          };
          newDecryptedProjects.push(errorProject);
        }
      }

      decryptedProjects = newDecryptedProjects;
      decryptionErrors = newDecryptionErrors;
      isDecrypting = false;
    };

    decryptProjects().catch(console.error);
  });

  // Navigate to subprojects view
  async function navigateToSubprojects(projectId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("parent", projectId);
    await goto(url.toString(), { invalidateAll: true });
  }

  // Navigate back to parent or root
  async function navigateToParent() {
    const url = new URL(window.location.href);
    url.searchParams.delete("parent");
    await goto(url.toString(), { invalidateAll: true });
  }

  function getBreadcrumbTitle(): string {
    const pathNames = ["Projects"];

    // Build the breadcrumb path from root to current parent
    if (data.breadcrumbPath)
      pathNames.push(
        ...data.breadcrumbPath?.map((project: { id: string; name: string }) => {
          // Find the decrypted version of this project
          const decrypted = decryptedProjects.find((p) => p.id === project.id);
          return decrypted ? decrypted.name : project.name;
        }),
      );
    return pathNames.join(" > ");
  }

  // Encrypt project data and submit
  async function handleCreateProjectSubmit(e: SubmitEvent) {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      // Get cached KEK from store
      const kek = $kekStore;

      // Generate a new DEK for this project
      const dek = await generateAesKey();
      const exportedDek = await exportAesKey(dek);

      // Encrypt project name and description with DEK
      const name = formData.get("name") as string;
      const description = formData.get("description") as string | null;

      const encryptedName = await encryptWithAesGcm(name, dek);
      const encryptedDescription = description
        ? await encryptWithAesGcm(description, dek)
        : null;

      // Encrypt the DEK with the cached KEK
      const encryptedDekComponents = await encryptWithAesGcm(exportedDek, kek!);
      const encryptedDek = JSON.stringify(encryptedDekComponents);

      // Update form data with encrypted values
      formData.set("name", JSON.stringify(encryptedName));
      if (encryptedDescription) {
        formData.set("description", JSON.stringify(encryptedDescription));
      } else {
        formData.set("description", "");
      }
      formData.set("encryptedDek", encryptedDek);
      formData.set("encryptionAlgorithm", "AES-GCM");

      // Submit the form with modified data
      fetch("?/createProject", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      })
        .then(async (response) => {
          const result = (await response.json()) as {
            success?: boolean;
            error?: string;
            project?: any;
          };
          if (result.success && result.project) {
            // Add the new DEK to the store for immediate decryption
            const deks = $dekStore;
            deks[result.project.id] = dek;
            $dekStore = { ...deks };

            isCreating = false;
            // Invalidate all data to trigger re-fetch and re-decryption
            await invalidateAll();
          } else {
            createFormError = result.error || "Failed to create project";
          }
        })
        .catch((error) => {
          console.error("Form submission failed:", error);
          createFormError = "Failed to submit form. Please try again.";
        });
    } catch (error) {
      console.error("Encryption failed:", error);
      createFormError = "Failed to encrypt project data. Please try again.";
    }
  }
</script>

<header class="mb-8">
  <h1 class="text-3xl font-bold text-foreground mb-2">
    {getBreadcrumbTitle()}
  </h1>
  {#if data?.currentParentId}
    <button
      class="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
      onclick={navigateToParent}
    >
      ← Back to Projects
    </button>
  {/if}
</header>

{#if isDecrypting}
  <div class="text-center py-12">
    <div class="flex items-center justify-center gap-2">
      <div
        class="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
      ></div>
      <span class="text-muted-foreground">Decrypting your projects...</span>
    </div>
  </div>
{:else if decryptedProjects.length === 0}
  {#if data?.projects && data.projects.length === 0}
    <div class="text-center py-12">
      <div class="text-muted-foreground mb-4">No projects yet</div>
      <button
        class="flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
        onclick={() => showCreateDialog(data?.currentParentId || null)}
      >
        <Plus size={20} />
        <span>
          {#if data?.currentParentId}
            Create Subproject
          {:else}
            Create Your First Project
          {/if}
        </span>
      </button>
    </div>
  {:else}
    <div class="text-center py-12">
      <div class="text-muted-foreground mb-4">No projects to display</div>
    </div>
  {/if}
{:else}
  {#each decryptedProjects as project (project.id)}
    <div class="group project-item mb-4">
      <div
        class="flex items-center gap-4 p-6 sm:p-8 bg-primary text-primary-foreground rounded-lg border border-border shadow-card transition-all hover:bg-accent hover:border-muted hover:text-accent-foreground hover:shadow-none cursor-pointer"
        role="button"
        tabindex="0"
        onclick={() => {
          if (project.hasSubprojects) {
            navigateToSubprojects(project.id);
          } else {
            showEditDialog(
              project.id,
              project.name,
              project.description ?? "",
              project.color,
              project.icon,
              project.parentId,
            );
          }
        }}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (project.hasSubprojects) {
              navigateToSubprojects(project.id);
            } else {
              showEditDialog(
                project.id,
                project.name,
                project.description ?? "",
                project.color,
                project.icon,
                project.parentId,
              );
            }
          }
        }}
      >
        <div
          class="w-12 h-12 rounded-md flex items-center justify-center"
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
          <h2 class="text-xl font-semibold text-foreground m-0">
            {project.name}
          </h2>
          {#if project.description}
            <p class="text-sm mt-1">
              {project.description}
            </p>
          {/if}
          {#if project.subprojectsCount > 0}
            <div class="flex items-center gap-1 mt-1">
              <Folder size={12} class="text-muted-foreground" />
              <span class="text-xs text-muted-foreground">
                {project.subprojectsCount}
                {project.subprojectsCount === 1 ? "subproject" : "subprojects"}
              </span>
            </div>
          {/if}
        </div>

        <div class="flex gap-2">
          <button
            class="edit-button flex-shrink-0 bg-none border-none cursor-pointer p-2 rounded-md transition-all hover:bg-card hover:text-card-foreground opacity-0 group-hover:opacity-100"
            onclick={(e) => {
              e.stopPropagation();
              showEditDialog(
                project.id,
                project.name,
                project.description ?? "",
                project.color,
                project.icon,
                project.parentId,
              );
            }}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                showEditDialog(
                  project.id,
                  project.name,
                  project.description ?? "",
                  project.color,
                  project.icon,
                  project.parentId,
                );
              }
            }}
            aria-label={`Edit project ${project.name}`}
          >
            <PencilSimple size={18} />
          </button>
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
      </div>
    </div>
  {/each}

  <div class="mt-8 flex gap-3">
    <button
      class="flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
      onclick={() => showCreateDialog(data?.currentParentId || null)}
    >
      <Plus size={20} />
      <span>Create New Project</span>
    </button>
    <button
      class="flex items-center gap-2 px-4 py-3 bg-muted text-muted-foreground rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
      onclick={refreshProjects}
      disabled={isRefreshing}
    >
      {#if isRefreshing}
        <span
          class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
        ></span>
        Refreshing...
      {:else}
        <ArrowClockwise size={16} />
        Refresh
      {/if}
    </button>
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
            class="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg border border-border font-medium transition-colors hover:bg-[#ef4444] hover:text-white disabled:opacity-50 cursor-pointer"
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

{#if isCreating}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
  >
    <div
      class="bg-primary text-primary-foreground rounded-lg border border-border shadow-card max-w-md w-full p-6"
      {@attach createClickOutside}
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-foreground">Create Project</h3>
        <button
          class="p-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          onclick={cancelCreate}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>

      <form
        method="POST"
        action="?/createProject"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === "success") {
              isCreating = false;
              // Invalidate all data to refresh the project list
              await update({ invalidateAll: true });
            } else {
              // Error will be handled in the $effect
            }
          };
        }}
        onsubmit={handleCreateProjectSubmit}
      >
        <div class="space-y-4">
          <div>
            <label
              for="create-name"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Project Name
            </label>
            <input
              type="text"
              id="create-name"
              name="name"
              value={createProjectName}
              oninput={(e) =>
                (createProjectName = (e.target as HTMLInputElement).value)}
              required
              class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label
              for="create-description"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Description (optional)
            </label>
            <textarea
              id="create-description"
              name="description"
              value={createProjectDescription}
              oninput={(e) =>
                (createProjectDescription = (e.target as HTMLTextAreaElement)
                  .value)}
              class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              rows="3"
              placeholder="Describe your project"
            ></textarea>
          </div>

          <div>
            <label
              for="create-parent"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Parent Project (optional)
            </label>
            <select
              id="create-parent"
              name="parentId"
              value={createProjectParentId || ""}
              oninput={(e) =>
                (createProjectParentId =
                  (e.target as HTMLSelectElement).value || null)}
              class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None (Root Level)</option>
              {#each decryptedProjects as project}
                <option value={project.id}>
                  {project.name}
                </option>
              {/each}
            </select>
          </div>

          <div>
            <label
              for="create-color"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Color
            </label>
            <select
              id="create-color"
              name="color"
              value={createProjectColor}
              oninput={(e) =>
                (createProjectColor = (e.target as HTMLSelectElement).value)}
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
              for="create-icon"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Icon
            </label>
            <select
              id="create-icon"
              name="icon"
              value={createProjectIcon}
              oninput={(e) =>
                (createProjectIcon = (e.target as HTMLSelectElement).value)}
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
            <div class="text-destructive text-sm">
              {createFormError}
            </div>
          {/if}

          <div class="flex gap-3">
            <button
              type="submit"
              class="flex-1 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg border border-border font-medium transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
            >
              Create Project
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2.5 bg-background text-foreground rounded-lg border border-border font-medium transition-colors hover:bg-muted hover:text-muted-foreground cursor-pointer"
              onclick={cancelCreate}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
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
              for="edit-parent"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Parent Project (optional)
            </label>
            <select
              id="edit-parent"
              name="parentId"
              value={editProjectParentId || ""}
              oninput={(e) =>
                (editProjectParentId =
                  (e.target as HTMLSelectElement).value || null)}
              class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None (Root Level)</option>
              {#each decryptedProjects as project}
                {#if project.id !== editProjectId}
                  <option value={project.id}>
                    {project.name}
                  </option>
                {/if}
              {/each}
            </select>
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
              class="flex-1 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg border border-border font-medium transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
            >
              Update Project
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2.5 bg-background text-foreground rounded-lg border border-border font-medium transition-colors hover:bg-muted hover:text-muted-foreground cursor-pointer"
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

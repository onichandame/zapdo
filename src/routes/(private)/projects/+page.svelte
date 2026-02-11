<script lang="ts">
  import {
    Folder,
    Plus,
    Trash,
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
  import { deserialize, enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import {
    generateAesKey,
    encryptWithAesGcm,
    exportKeyToBase64,
    decryptWithAesGcm,
  } from "$lib/crypto";
  import type * as schema from "$lib/server/db/schema";
  import { dekStore } from "$lib/stores/dekStore";
  import { kekStore } from "$lib/stores/kekStore.js";
  import type { ActionResult } from "@sveltejs/kit";
  import type { ActionData } from "./$types.js";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import Textarea from "$lib/components/ui/textarea.svelte";
  import Select from "$lib/components/ui/select.svelte";
  import Label from "$lib/components/ui/label.svelte";
  import Error from "$lib/components/ui/error.svelte";
  import Modal from "$lib/components/ui/modal.svelte";

  let { data } = $props();

  // Decrypted projects state
  let decryptedProjects = $state<schema.Project[]>([]);
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

  let editFormError = $state("");

  let isCreating = $state(false);
  let createProjectName = $state("");
  let createProjectDescription = $state("");
  let createProjectColor = $state("#3b82f6");
  let createProjectIcon = $state("folder");

  let createFormError = $state("");

  let isRefreshing = $state(false);

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
      const newDecryptedProjects: typeof data.projects = [];
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

          const decryptedName = await decryptWithAesGcm(project.name, dek);
          const decryptedDescription = project.description
            ? await decryptWithAesGcm(project.description, dek)
            : ``;

          const decryptedProject = {
            ...project,
            name: decryptedName,
            description: decryptedDescription,
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

  // Encrypt project data and submit
  async function handleCreateProjectSubmit(e: SubmitEvent) {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      // Generate a new DEK for this project
      const dek = await generateAesKey();
      const exportedDek = await exportKeyToBase64(dek);

      // Encrypt project name and description with DEK
      const name = formData.get("name") as string;
      const description = formData.get("description") as string | null;

      const encryptedName = await encryptWithAesGcm(name, dek);
      const encryptedDescription = description
        ? await encryptWithAesGcm(description, dek)
        : null;

      // Encrypt the DEK with the cached KEK
      const encryptedDek = await encryptWithAesGcm(exportedDek, $kekStore!);
      console.log(encryptedDek);

      // Update form data with encrypted values
      formData.set("name", encryptedName);
      if (encryptedDescription) {
        formData.set("description", encryptedDescription);
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
          const result = deserialize(await response.json()) as ActionResult<
            NonNullable<ActionData>
          >;
          if (result.type === `success`) {
            // Add the new DEK to the store for immediate decryption
            const deks = $dekStore;
            deks[result.data!.project!.id] = dek;
            $dekStore = { ...deks };

            isCreating = false;
            // Invalidate all data to trigger re-fetch and re-decryption
            await invalidateAll();
          } else {
            console.error(result);
            createFormError = "Failed to create project";
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
  <h1 class="text-3xl font-bold text-foreground mb-2">Projects</h1>
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
      <Button
        variant="secondary"
        class="bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground"
        onclick={() => showCreateDialog()}
      >
        Create Your First Project
      </Button>
    </div>
  {:else}
    <div class="text-center py-12">
      <div class="text-muted-foreground mb-4">No projects to display</div>
    </div>
  {/if}
{:else}
  {#each decryptedProjects as project (project.id)}
    <div class="group project-item mb-4">
      <Card
        variant="project"
        role="button"
        tabindex={0}
        onclick={() => {
          showEditDialog(
            project.id,
            project.name,
            project.description ?? "",
            project.color,
            project.icon,
          );
        }}
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
        </div>

        <div class="flex gap-2">
          <Button
            variant="ghost"
            class="flex-shrink-0 bg-none border-none cursor-pointer p-2 rounded-md transition-all hover:bg-card hover:text-card-foreground opacity-0 group-hover:opacity-100"
            onclick={(e) => {
              e.stopPropagation();
              showEditDialog(
                project.id,
                project.name,
                project.description ?? "",
                project.color,
                project.icon,
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
                );
              }
            }}
            aria-label={`Edit project ${project.name}`}
          >
            <PencilSimple size={18} />
          </Button>
          <Button
            variant="ghost"
            class="flex-shrink-0 bg-none border-none cursor-pointer p-2 rounded-md transition-all hover:bg-accent hover:text-accent-foreground opacity-0 group-hover:opacity-100"
            onclick={(e) => {
              e.stopPropagation();
              window.location.href = `/projects/${project.id}/tasks`;
            }}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/projects/${project.id}/tasks`;
              }
            }}
            aria-label={`View tasks for ${project.name}`}
          >
            <Folder size={18} />
          </Button>
          <Button
            variant="ghost"
            class="flex-shrink-0 bg-none border-none cursor-pointer p-2 rounded-md transition-all hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444] opacity-0 group-hover:opacity-100"
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
          </Button>
        </div>
      </Card>
    </div>
  {/each}

  <div class="mt-8 flex gap-3">
    <Button
      variant="secondary"
      class="bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground"
      onclick={() => showCreateDialog()}
    >
      <Plus size={20} />
      Create New Project
    </Button>
    <Button
      variant="secondary"
      class="bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
    </Button>
  </div>
{/if}

<Modal
  open={deleteProjectId !== ""}
  onClose={cancelDelete}
  title="Confirm Deletion"
>
  <p class="text-sm mb-6">
    Are you sure you want to delete the project "<span
      class="font-medium text-foreground">{deleteProjectName}</span
    >"? This action cannot be undone and will remove all associated data.
  </p>

  {#if deleteFormError}
    <Error>
      {deleteFormError}
    </Error>
  {/if}

  <div class="flex gap-3">
    <Button
      variant="ghost"
      class="flex-1"
      onclick={cancelDelete}
      disabled={isDeleting}
    >
      Cancel
    </Button>
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
      <Button type="submit" variant="destructive" disabled={isDeleting}>
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
      </Button>
    </form>
  </div>
</Modal>
<Modal open={isCreating} onClose={cancelCreate} title="Create Project">
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

<Modal open={isEditing} onClose={cancelEdit} title="Edit Project">
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
        <Label for="edit-name">Project Name</Label>
        <Input
          type="text"
          id="edit-name"
          name="name"
          value={editProjectName}
          required
          placeholder="Enter project name"
        />
      </div>

      <div>
        <Label for="edit-description">Description (optional)</Label>
        <Textarea
          id="edit-description"
          name="description"
          value={editProjectDescription}
          oninput={(e) =>
            (editProjectDescription = (e.target as HTMLTextAreaElement).value)}
          rows={3}
          placeholder="Describe your project"
        />
      </div>

      <div>
        <Label for="edit-color">Color</Label>
        <Select id="edit-color" name="color" value={editProjectColor} required>
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
        <Label for="edit-icon">Icon</Label>
        <Select id="edit-icon" name="icon" value={editProjectIcon} required>
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

      {#if editFormError}
        <Error>
          {editFormError}
        </Error>
      {/if}

      <div class="flex gap-3">
        <Button type="submit" variant="primary" class="flex-1">
          Update Project
        </Button>
        <Button
          type="button"
          variant="ghost"
          class="flex-1"
          onclick={cancelEdit}
        >
          Cancel
        </Button>
      </div>
    </div>
  </form>
</Modal>

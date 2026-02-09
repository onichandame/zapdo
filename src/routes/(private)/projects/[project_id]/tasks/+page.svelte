<script lang="ts">
  import {
    Plus,
    Calendar,
    Tag,
    CheckCircle,
    Circle,
    Clock,
    X,
  } from "phosphor-svelte";
  import { deserialize } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import type { Attachment } from "svelte/attachments";
  import { decryptWithAesGcm, encryptWithAesGcm } from "$lib/crypto.js";
  import { projectStore } from "$lib/stores/project.js";

  const { data } = $props();

  // Use optional chaining to safely access data properties
  let tasks = $derived(data.tasks || []);
  let decryptedTasks = $state<typeof tasks>([]);
  let filterStatus = $derived<typeof data.statusFilter | "all">(
    data.statusFilter || "all",
  );
  let searchQuery = $derived(data.searchQuery || "");
  let isCreating = $state(false);

  // Form state for task creation
  let createTaskTitle = $state("");
  let createTaskDescription = $state("");
  let createTaskStatus = $state("pending");
  let createTaskPriority = $state(0);
  let createTaskDueDate = $state("");
  let createFormError = $state("");

  let completedCount = $derived(data.completedCount);
  let inProgressCount = $derived(data.inProgressCount);
  let pendingCount = $derived(data.pendingCount);

  $effect.pre(() => {
    let active = true;
    const tmpTasks = structuredClone(tasks);
    const dek = $projectStore!.dek;
    const decryptProjects = async () => {
      await Promise.all(
        tmpTasks.map(async (task) => {
          await Promise.all([
            (task.title = await decryptWithAesGcm(task.title, dek)),
            (task.description = task.description
              ? await decryptWithAesGcm(task.description, dek)
              : ``),
          ]);
        }),
      );
      if (active) decryptedTasks = tmpTasks;
    };
    decryptProjects();
    return () => {
      active = false;
    };
  });

  // Create attachment functions for dialogs
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

  function showCreateDialog() {
    isCreating = true;
    createTaskTitle = "";
    createTaskDescription = "";
    createTaskStatus = "pending";
    createTaskPriority = 0;
    createTaskDueDate = "";
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

  interface ActionResult {
    type: "success" | "failure" | "redirect" | "error";
    location?: string;
    error?: any;
    data?: any;
  }

  async function handleCreateTask(e: SubmitEvent) {
    e.preventDefault();

    const form = e.target as HTMLFormElement;

    const formData = new FormData(form);

    formData.set(
      `title`,
      await encryptWithAesGcm(createTaskTitle, $projectStore!.dek),
    );
    formData.set(
      `description`,
      await encryptWithAesGcm(createTaskDescription, $projectStore!.dek),
    );

    try {
      const result = await fetch("?/createTask", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      }).then(async (res) => deserialize(await res.text()));

      if (result.type === "success") {
        isCreating = false;
        // Invalidate all data to refresh the task list
        await invalidateAll();
      } else if (result.type === "redirect") {
        goto(result.location);
      } else if (result.type === "error") {
        console.error(result.error);
        createFormError = "Failed to create task";
      } else {
        createFormError =
          JSON.stringify(result?.data) || "Failed to create task";
      }
    } catch (error) {
      console.error("Form submission failed:", error);
      createFormError = "Failed to submit form. Please try again.";
    }
  }

  function toggleTaskStatus(taskId: string) {
    // This would need to be implemented with actual API calls
    // For now, we'll just keep it as a placeholder
    console.log("Toggle task status:", taskId);
  }

  function deleteTask(taskId: string) {
    // This would need to be implemented with actual API calls
    // For now, we'll just keep it as a placeholder
    console.log("Delete task:", taskId);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "No due date";
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function isOverdue(task: any): boolean {
    if (!task.dueDate || task.status === "completed") return false;
    return new Date(task.dueDate) < new Date();
  }

  function getPriorityColor(priority: number): string {
    const colors: Record<string, string> = {
      3: "#ef4444",
      2: "#f97316",
      1: "#3b82f6",
      0: "#10b981",
    };
    return colors[priority] || "#3b82f6";
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: "#94a3b8",
      in_progress: "#3b82f6",
      completed: "#22c55e",
      cancelled: "#ef4444",
    };
    return colors[status] || "#94a3b8";
  }
</script>

<div class="page text-foreground">
  <header class="header flex justify-between items-start mb-8">
    <div class="header-left flex flex-col gap-1">
      <h1 class="title text-3xl font-bold m-0 text-foreground">Tasks</h1>
    </div>
    <button
      class="add-button flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-90 border-none"
      onclick={showCreateDialog}
    >
      <Plus size={20} />
      <span>Add Task</span>
    </button>
  </header>

  <div class="stats-row grid grid-cols-4 gap-4 mb-8">
    <div
      class="stat-card flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-lg border border-border shadow-card"
    >
      <div
        class="stat-icon pending flex items-center justify-center w-10 h-10 rounded-md bg-[#94a3b820] text-[#94a3b8]"
      >
        <Circle size={20} />
      </div>
      <div class="stat-info flex flex-col">
        <span class="stat-value text-2xl font-bold text-primary-foreground"
          >{pendingCount}</span
        >
        <span class="stat-label text-xs">Pending</span>
      </div>
    </div>
    <div
      class="stat-card flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-lg border border-border shadow-card"
    >
      <div
        class="stat-icon progress flex items-center justify-center w-10 h-10 rounded-md bg-[#3b82f620] text-[#3b82f6]"
      >
        <Clock size={20} />
      </div>
      <div class="stat-info flex flex-col">
        <span class="stat-value text-2xl font-bold text-primary-foreground"
          >{inProgressCount}</span
        >
        <span class="stat-label text-xs">In Progress</span>
      </div>
    </div>
    <div
      class="stat-card flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-lg border border-border shadow-card"
    >
      <div
        class="stat-icon completed flex items-center justify-center w-10 h-10 rounded-md bg-[#22c55e20] text-[#22c55e]"
      >
        <CheckCircle size={20} />
      </div>
      <div class="stat-info flex flex-col">
        <span class="stat-value text-2xl font-bold text-primary-foreground"
          >{completedCount}</span
        >
        <span class="stat-label text-xs">Completed</span>
      </div>
    </div>
    <div
      class="stat-card total flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-lg border border-border shadow-card"
    >
      <div class="stat-info flex flex-col">
        <span class="stat-value text-2xl font-bold text-primary-foreground"
          >{tasks.length}</span
        >
        <span class="stat-label text-xs">Total Tasks</span>
      </div>
    </div>
  </div>

  <div class="filters flex justify-between gap-4 mb-6">
    <div class="search-box flex-1 max-w-[300px]">
      <input
        type="text"
        placeholder="Search tasks..."
        bind:value={searchQuery}
        class="search-input w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg border border-border text-sm placeholder:text-muted-foreground"
      />
    </div>
    <div class="filter-group flex gap-3">
      <select
        bind:value={filterStatus}
        class="filter-select px-4 py-2.5 bg-primary text-primary-foreground rounded-lg border border-border text-sm cursor-pointer"
      >
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  </div>

  <div class="task-list flex flex-col gap-3">
    {#each decryptedTasks as task (task.id)}
      <div
        class="task-card group flex items-start gap-4 p-5 bg-primary text-primary-foreground rounded-lg border border-border shadow-card transition-all hover:bg-background hover:border-muted hover:text-foreground hover:shadow-none"
        class:completed={task.status === "completed"}
      >
        <button
          class="status-toggle flex-shrink-0 bg-none border-none cursor-pointer p-0 flex items-center justify-center w-7 h-7 mt-0.5"
          onclick={() => toggleTaskStatus(task.id)}
        >
          {#if task.status === "completed"}
            <span class="icon-completed text-[#22c55e]"
              ><CheckCircle size={22} /></span
            >
          {:else if task.status === "in_progress"}
            <span class="icon-progress text-[#3b82f6]"><Clock size={22} /></span
            >
          {:else}
            <span class="icon-pending text-muted-foreground"
              ><Circle size={22} /></span
            >
          {/if}
        </button>

        <div class="task-content flex-1 min-w-0">
          <div class="task-header flex items-start justify-between gap-4 mb-1">
            <h3
              class="task-title text-base font-semibold m-0 text-primary-foreground"
              class:line-through={task.status === "completed"}
            >
              {task.title}
            </h3>
            <div class="task-badges flex items-center gap-2 flex-shrink-0">
              <span
                class="priority-badge px-1.5 py-0.5 rounded-full text-[0.625rem] font-semibold uppercase text-white"
                style="background-color: {getPriorityColor(task.priority)}"
              >
                {task.priority}
              </span>
            </div>
          </div>
          {#if task.description}
            <p
              class="task-description text-sm text-muted-foreground mb-3 leading-relaxed"
            >
              {task.description}
            </p>
          {/if}
          <div class="task-meta flex items-center gap-4 flex-wrap">
            <span
              class="due-date flex items-center gap-1 text-xs text-muted-foreground"
              class:text-[#ef4444]={isOverdue(task)}
            >
              <Calendar size={14} />
              {formatDate(task.dueDate)}
            </span>
            {#if task.tags?.length > 0}
              <div class="tags flex items-center gap-2">
                {#each task.tags.slice(0, 3) as tag}
                  <span
                    class="tag flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <Tag size={12} />
                    {tag.tag}
                  </span>
                {/each}
                {#if task.tags.length > 3}
                  <span
                    class="tag more flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                    >+{task.tags.length - 3}</span
                  >
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <button
          class="delete-button flex-shrink-0 bg-none border-none text-muted-foreground cursor-pointer p-2 rounded-md transition-all hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444] opacity-0 group-hover:opacity-100"
          onclick={() => deleteTask(task.id)}
          aria-label="Delete task"
        >
          <X size={18} />
        </button>
      </div>
    {:else}
      <div
        class="empty-state flex flex-col items-center justify-center py-16 px-8 text-center"
      >
        <span class="empty-icon text-muted-foreground mb-4"
          ><Circle size={48} /></span
        >
        <h3 class="text-lg font-semibold mb-2 text-foreground">
          No tasks found
        </h3>
        <p class="text-sm text-muted-foreground m-0">
          Try adjusting your filters or create a new task
        </p>
      </div>
    {/each}
  </div>

  {#if isCreating}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div
        class="bg-primary text-primary-foreground rounded-lg border border-border shadow-card max-w-md w-full p-6"
        {@attach createClickOutside}
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-foreground">Create Task</h3>
          <button
            class="p-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            onclick={cancelCreate}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form method="POST" action="?/createTask" onsubmit={handleCreateTask}>
          <div class="space-y-4">
            <div>
              <label
                for="create-title"
                class="block text-sm font-medium text-foreground mb-1"
              >
                Task Title
              </label>
              <input
                type="text"
                id="create-title"
                name="title"
                value={createTaskTitle}
                oninput={(e) =>
                  (createTaskTitle = (e.target as HTMLInputElement).value)}
                required
                class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter task title"
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
                value={createTaskDescription}
                oninput={(e) =>
                  (createTaskDescription = (e.target as HTMLTextAreaElement)
                    .value)}
                class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows="3"
                placeholder="Describe your task"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  for="create-status"
                  class="block text-sm font-medium text-foreground mb-1"
                >
                  Status
                </label>
                <select
                  id="create-status"
                  name="status"
                  value={createTaskStatus}
                  oninput={(e) =>
                    (createTaskStatus = (e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label
                  for="create-priority"
                  class="block text-sm font-medium text-foreground mb-1"
                >
                  Priority
                </label>
                <select
                  id="create-priority"
                  name="priority"
                  value={createTaskPriority}
                  oninput={(e) =>
                    (createTaskPriority = parseInt(
                      (e.target as HTMLSelectElement).value,
                    ))}
                  class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="3">Urgent</option>
                  <option value="2">High</option>
                  <option value="1">Medium</option>
                  <option value="0">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label
                for="create-due-date"
                class="block text-sm font-medium text-foreground mb-1"
              >
                Due Date (optional)
              </label>
              <input
                type="date"
                id="create-due-date"
                name="dueDate"
                value={createTaskDueDate}
                oninput={(e) =>
                  (createTaskDueDate = (e.target as HTMLInputElement).value)}
                class="w-full px-3 py-2 bg-primary text-primary-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
                Create Task
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
</div>

<style>
  .task-card.completed {
    opacity: 0.7;
  }
</style>

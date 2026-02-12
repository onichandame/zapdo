<script lang="ts">
  import { Calendar, CheckCircle, Circle, Clock, X } from "phosphor-svelte";
  import { deserialize } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import type { Attachment } from "svelte/attachments";
  import { decryptWithAesGcm, encryptWithAesGcm } from "$lib/crypto.js";
  import { projectStore } from "$lib/stores/project.js";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import Label from "$lib/components/ui/label.svelte";
  import Select from "$lib/components/ui/select.svelte";
  import Textarea from "$lib/components/ui/textarea.svelte";

  const { data } = $props();

  // Use optional chaining to safely access data properties
  let tasks = $derived(data.tasks || []);
  let decryptedTasks = $state<typeof tasks>([]);
  type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
  let filterStatus = $derived<TaskStatus | "all">(
    (data.statusFilter as TaskStatus | "all") || "all",
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

  async function deleteTask(taskId: string) {
    const formData = new FormData();
    formData.set("taskId", taskId);

    try {
      const result = await fetch("?/deleteTask", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      }).then(async (res) => deserialize(await res.text()));

      if (result.type === "success") {
        // Invalidate all data to refresh the task list
        await invalidateAll();
      } else {
        console.error("Delete task failed:", result);
        alert("Failed to delete task");
      }
    } catch (error) {
      console.error("Delete task error:", error);
      alert("Failed to delete task");
    }
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

  function getPriorityLabel(priority: number): string {
    const labels: Record<number, string> = {
      3: "Urgent",
      2: "High",
      1: "Medium",
      0: "Low",
    };
    return labels[priority] || "Medium";
  }
</script>

<div class="page text-foreground">
  <header class="header flex justify-between items-start mb-8">
    <div class="header-left flex flex-col gap-1">
      <h1 class="title text-3xl font-bold m-0 text-foreground">Tasks</h1>
    </div>
    <div>
      <Button variant="primary" size="sm" onclick={showCreateDialog}>
        Add Task
      </Button>
    </div>
  </header>

  <div
    class="stats-row grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
  >
    <Card variant="stat">
      <div
        class="stat-icon pending flex items-center justify-center w-10 h-10 rounded-md bg-[#94a3b820] text-[#94a3b8]"
      >
        <Circle size={20} weight="duotone" />
      </div>
      <div class="stat-info flex flex-col">
        <span class="stat-value text-2xl font-bold text-foreground"
          >{pendingCount}</span
        >
        <span class="stat-label text-sm font-medium text-muted-foreground"
          >Pending</span
        >
      </div>
    </Card>
    <Card variant="stat">
      <div
        class="stat-icon progress flex items-center justify-center w-10 h-10 rounded-md bg-[#3b82f620] text-[#3b82f6]"
      >
        <Clock size={20} weight="duotone" />
      </div>
      <div class="stat-info flex flex-col">
        <span class="stat-value text-2xl font-bold text-foreground"
          >{inProgressCount}</span
        >
        <span class="stat-label text-sm font-medium text-muted-foreground"
          >In Progress</span
        >
      </div>
    </Card>
    <Card variant="stat">
      <div
        class="stat-icon completed flex items-center justify-center w-10 h-10 rounded-md bg-[#22c55e20] text-[#22c55e]"
      >
        <CheckCircle size={20} weight="duotone" />
      </div>
      <div class="stat-info flex flex-col">
        <span class="stat-value text-2xl font-bold text-foreground"
          >{completedCount}</span
        >
        <span class="stat-label text-sm font-medium text-muted-foreground"
          >Completed</span
        >
      </div>
    </Card>
    <Card variant="stat">
      <div class="stat-info flex flex-col">
        <span class="stat-value text-2xl font-bold text-foreground"
          >{tasks.length}</span
        >
        <span class="stat-label text-sm font-medium text-muted-foreground"
          >Total Tasks</span
        >
      </div>
    </Card>
  </div>

  <div class="filters flex flex-col sm:flex-row justify-between gap-4 mb-6">
    <div class="search-box flex-1 max-w-[300px]">
      <Input
        type="text"
        placeholder="Search tasks..."
        value={searchQuery}
        oninput={(e) => (searchQuery = (e.target as HTMLInputElement).value)}
      />
    </div>
    <div class="filter-group flex gap-3">
      <Select
        value={filterStatus}
        oninput={(e) =>
          (filterStatus = (e.target as HTMLSelectElement)
            .value as typeof filterStatus)}
      >
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </Select>
    </div>
  </div>

  <div class="task-list flex flex-col gap-3">
    {#each decryptedTasks as task (task.id)}
      <Card
        variant="feature"
        class="group flex items-start gap-4 p-5 transition-all hover:shadow-md {task.status ===
        'completed'
          ? 'completed'
          : ''}"
      >
        <button
          class="status-toggle flex-shrink-0 bg-none border-none cursor-pointer p-0 flex items-center justify-center w-7 h-7 mt-0.5"
          onclick={() => toggleTaskStatus(task.id)}
        >
          {#if task.status === "completed"}
            <span class="icon-completed text-[#22c55e]"
              ><CheckCircle size={22} weight="duotone" /></span
            >
          {:else if task.status === "in_progress"}
            <span class="icon-progress text-[#3b82f6]"
              ><Clock size={22} weight="duotone" /></span
            >
          {:else}
            <span class="icon-pending text-muted-foreground"
              ><Circle size={22} weight="duotone" /></span
            >
          {/if}
        </button>

        <div class="task-content flex-1 min-w-0">
          <div class="task-header flex items-start justify-between gap-4 mb-1">
            <h3
              class="task-title text-base font-semibold m-0 text-foreground"
              class:line-through={task.status === "completed"}
            >
              {task.title}
            </h3>
            <div class="task-badges flex items-center gap-2 flex-shrink-0">
              <span
                class="priority-badge px-1.5 py-0.5 rounded-full text-[0.625rem] font-semibold uppercase text-white"
                style="background-color: {getPriorityColor(task.priority)}"
              >
                {getPriorityLabel(task.priority)}
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
              <Calendar size={14} weight="duotone" />
              {formatDate(task.dueDate)}
            </span>
          </div>
        </div>

        <div>
          <Button
            variant="ghost"
            class="delete-button flex-shrink-0 bg-transparent border-none text-muted-foreground p-2 rounded-md transition-all hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444] opacity-0 group-hover:opacity-100"
            onclick={() => deleteTask(task.id)}
            aria-label="Delete task"
          >
            <X size={18} weight="duotone" />
          </Button>
        </div>
      </Card>
    {:else}
      <div
        class="empty-state flex flex-col items-center justify-center py-16 px-8 text-center"
      >
        <span class="empty-icon text-muted-foreground mb-4"
          ><Circle size={48} weight="duotone" /></span
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
            <X size={20} weight="duotone" />
          </button>
        </div>

        <form method="POST" action="?/createTask" onsubmit={handleCreateTask}>
          <div class="space-y-4">
            <div>
              <Label for="create-title">Task Title</Label>
              <Input
                type="text"
                id="create-title"
                name="title"
                value={createTaskTitle}
                oninput={(e) =>
                  (createTaskTitle = (e.target as HTMLInputElement).value)}
                required
                placeholder="Enter task title"
              />
            </div>

            <div>
              <Label for="create-description">Description (optional)</Label>
              <Textarea
                id="create-description"
                name="description"
                value={createTaskDescription}
                oninput={(e) =>
                  (createTaskDescription = (e.target as HTMLTextAreaElement)
                    .value)}
                rows={3}
                placeholder="Describe your task"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <Label for="create-status">Status</Label>
                <Select
                  id="create-status"
                  name="status"
                  value={createTaskStatus}
                  oninput={(e) =>
                    (createTaskStatus = (e.target as HTMLSelectElement).value)}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>

              <div>
                <Label for="create-priority">Priority</Label>
                <Select
                  id="create-priority"
                  name="priority"
                  value={createTaskPriority.toString()}
                  oninput={(e) =>
                    (createTaskPriority = parseInt(
                      (e.target as HTMLSelectElement).value,
                    ))}
                >
                  <option value="3">Urgent</option>
                  <option value="2">High</option>
                  <option value="1">Medium</option>
                  <option value="0">Low</option>
                </Select>
              </div>
            </div>

            <div>
              <Label for="create-due-date">Due Date (optional)</Label>
              <Input
                type="date"
                id="create-due-date"
                name="dueDate"
                value={createTaskDueDate}
                oninput={(e) =>
                  (createTaskDueDate = (e.target as HTMLInputElement).value)}
              />
            </div>

            {#if createFormError}
              <div class="text-destructive text-sm">
                {createFormError}
              </div>
            {/if}

            <div class="flex gap-3">
              <Button variant="primary" type="submit">Create Task</Button>
              <Button variant="secondary" type="button" onclick={cancelCreate}
                >Cancel</Button
              >
            </div>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

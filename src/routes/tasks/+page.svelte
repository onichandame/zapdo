<script lang="ts">
    import {
        Plus,
        Calendar,
        Flag,
        Folder,
        Tag,
        CheckCircle,
        Circle,
        Clock,
        X,
    } from "phosphor-svelte";
    import {
        dummyTasks,
        projects,
        type Task,
        type TaskStatus,
        type TaskPriority,
        getProjectById,
        getPriorityColor,
        getStatusColor,
    } from "$lib/data/dummyTasks";

    let tasks = $state<Task[]>([...dummyTasks]);
    let filterStatus = $state<TaskStatus | "all">("all");
    let filterProject = $state<number | "all">("all");
    let searchQuery = $state("");

    let filteredTasks = $derived(
        tasks
            .filter((t) => filterStatus === "all" || t.status === filterStatus)
            .filter(
                (t) => filterProject === "all" || t.projectId === filterProject,
            )
            .filter(
                (t) =>
                    searchQuery === "" ||
                    t.title.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .sort((a, b) => {
                const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }),
    );

    let completedCount = $derived(
        tasks.filter((t) => t.status === "completed").length,
    );
    let inProgressCount = $derived(
        tasks.filter((t) => t.status === "in_progress").length,
    );
    let pendingCount = $derived(
        tasks.filter((t) => t.status === "pending").length,
    );

    function toggleTaskStatus(taskId: number) {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
            if (task.status === "completed") {
                task.status = "pending";
            } else {
                task.status = "completed";
            }
        }
    }

    function deleteTask(taskId: number) {
        tasks = tasks.filter((t) => t.id !== taskId);
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

    function isOverdue(task: Task): boolean {
        if (!task.dueDate || task.status === "completed") return false;
        return new Date(task.dueDate) < new Date();
    }
</script>

<div class="page text-foreground max-w-[900px] mx-auto p-8">
    <header class="header flex justify-between items-start mb-8">
        <div class="header-left flex flex-col gap-1">
            <h1 class="title text-[1.75rem] font-bold m-0 text-foreground">
                Tasks
            </h1>
            <span class="subtitle text-sm"
                >Manage your personal and work tasks</span
            >
        </div>
        <button
            class="add-button flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-90 border-none"
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
                <span
                    class="stat-value text-2xl font-bold text-primary-foreground"
                    >{pendingCount}</span
                >
                <span class="stat-label text-xs"
                    >Pending</span
                >
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
                <span
                    class="stat-value text-2xl font-bold text-primary-foreground"
                    >{inProgressCount}</span
                >
                <span class="stat-label text-xs"
                    >In Progress</span
                >
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
                <span
                    class="stat-value text-2xl font-bold text-primary-foreground"
                    >{completedCount}</span
                >
                <span class="stat-label text-xs"
                    >Completed</span
                >
            </div>
        </div>
        <div
            class="stat-card total flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-lg border border-border shadow-card"
        >
            <div class="stat-info flex flex-col">
                <span
                    class="stat-value text-2xl font-bold text-primary-foreground"
                    >{tasks.length}</span
                >
                <span class="stat-label text-xs"
                    >Total Tasks</span
                >
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
            <select
                bind:value={filterProject}
                class="filter-select px-4 py-2.5 bg-primary text-primary-foreground rounded-lg border border-border text-sm cursor-pointer"
            >
                <option value="all">All Projects</option>
                {#each projects as project}
                    <option value={project.id}>{project.name}</option>
                {/each}
            </select>
        </div>
    </div>

    <div class="task-list flex flex-col gap-3">
        {#each filteredTasks as task (task.id)}
            {@const project = getProjectById(task.projectId)}
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
                        <span class="icon-progress text-[#3b82f6]"
                            ><Clock size={22} /></span
                        >
                    {:else}
                        <span class="icon-pending text-muted-foreground"
                            ><Circle size={22} /></span
                        >
                    {/if}
                </button>

                <div class="task-content flex-1 min-w-0">
                    <div
                        class="task-header flex items-start justify-between gap-4 mb-1"
                    >
                        <h3
                            class="task-title text-base font-semibold m-0 text-primary-foreground"
                            class:line-through={task.status === "completed"}
                        >
                            {task.title}
                        </h3>
                        <div
                            class="task-badges flex items-center gap-2 flex-shrink-0"
                        >
                            <span
                                class="priority-badge px-1.5 py-0.5 rounded-full text-[0.625rem] font-semibold uppercase text-white"
                                style="background-color: {getPriorityColor(
                                    task.priority,
                                )}"
                            >
                                {task.priority}
                            </span>
                            {#if project}
                                <span
                                    class="project-badge flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                    style="background-color: {project.color}20; color: {project.color}"
                                >
                                    <Folder size={12} />
                                    {project.name}
                                </span>
                            {/if}
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
                        {#if task.tags.length > 0}
                            <div class="tags flex items-center gap-2">
                                {#each task.tags.slice(0, 3) as tag}
                                    <span
                                        class="tag flex items-center gap-1 text-xs text-muted-foreground"
                                    >
                                        <Tag size={12} />
                                        {tag}
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
</div>

<style>
    .task-card.completed {
        opacity: 0.7;
    }
</style>
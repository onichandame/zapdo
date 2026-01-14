<script>
    import { Circle, CheckCircle, Plus } from "phosphor-svelte";

    let tasks = [
        { id: 1, text: "Create a new project", completed: true },
        { id: 2, text: "Install dependencies", completed: true },
        { id: 3, text: "Create a new component", completed: false },
        { id: 4, text: "Add a new route", completed: false },
        { id: 5, text: "Deploy the application", completed: false },
    ];
</script>

<div class="bg-background text-foreground min-h-screen font-sans">
    <div class="max-w-2xl mx-auto py-12 px-4">
        <header class="flex items-center justify-between mb-8">
            <h1 class="text-3xl font-bold">Tasks</h1>
            <button
                class="bg-secondary hover:bg-muted text-foreground font-bold py-2 px-4 rounded-lg flex items-center gap-2"
            >
                <Plus size={20} />
                <span>New Task</span>
            </button>
        </header>

        <div class="bg-card text-card-foreground rounded-lg shadow-lg">
            <ul>
                {#each tasks as task (task.id)}
                    <li
                        class="flex items-center justify-between p-4 border-b border-border last:border-b-0"
                    >
                        <div class="flex items-center gap-4">
                            <button
                                class="text-muted-foreground hover:text-foreground"
                            >
                                {#if task.completed}
                                    <CheckCircle
                                        size={24}
                                        weight="fill"
                                        class="text-green-500"
                                    />
                                {:else}
                                    <Circle size={24} />
                                {/if}
                            </button>
                            <span
                                class:line-through={task.completed}
                                class:text-muted-foreground={task.completed}
                            >
                                {task.text}
                            </span>
                        </div>
                    </li>
                {/each}
            </ul>
        </div>
    </div>
</div>

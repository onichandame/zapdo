<script lang="ts">
    import "./layout.css";
    import favicon from "$lib/assets/favicon.svg";
    import { StarFour, Gear, User } from "phosphor-svelte";

    let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-screen">
    <aside
        class="w-16 bg-secondary text-secondary-foreground flex flex-col items-center py-4"
    >
        <div class="p-2 my-4">
            <h1 class="text-xl font-bold">ZapDo</h1>
        </div>
        <nav class="flex-1 flex flex-col items-center space-y-4">
            <a
                href="/"
                title="Home"
                class="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <StarFour size={24} />
            </a>
            <a
                href="/profile"
                title="Profile"
                class="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <User size={24} />
            </a>
        </nav>
    </aside>

    <main class="flex-1 bg-background text-foreground">
        {@render children()}
    </main>
</div>

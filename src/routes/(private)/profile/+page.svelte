<script lang="ts">
  import { User, SignOut } from "phosphor-svelte";
  import Card from "$lib/components/ui/card.svelte";

  let { data } = $props();
</script>

<header class="mb-8">
  <h1 class="text-3xl font-bold text-foreground mb-2">Profile</h1>
</header>

<Card variant="form">
  <div class="flex items-center gap-4 mb-6">
    {#if data?.session.user?.pictureUrl}
      <img
        src={data.session.user.pictureUrl}
        alt="User avatar"
        class="w-16 h-16 rounded-full object-cover"
      />
    {:else}
      <div
        class="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground"
      >
        <User size={32} weight="fill" />
      </div>
    {/if}
    <div>
      <h2 class="text-xl font-semibold text-foreground">
        {data?.session.user?.name || "ZapDo User"}
      </h2>
    </div>
  </div>

  <div class="border-t border-border pt-6">
    <h3 class="text-lg font-semibold text-foreground mb-4">My Plan</h3>

    <div class="space-y-4">
      <div class="p-4 bg-background rounded-lg border border-border">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h4 class="font-bold text-foreground text-lg">Free Tier</h4>
            <p class="text-sm text-muted-foreground">Current plan</p>
          </div>
          <div
            class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded-full"
          >
            Active
          </div>
        </div>
        <ul class="space-y-2 text-sm text-muted-foreground">
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-accent rounded-full"></span>
            <span class="font-medium">Unlimited tasks</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-accent rounded-full"></span>
            <span class="font-medium">Basic project management</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-accent rounded-full"></span>
            <span class="font-medium">End-to-end encryption</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-accent rounded-full"></span>
            <span class="font-medium">Privacy-focused</span>
          </li>
        </ul>
      </div>

      <a
        href="/auth/logout"
        class="flex items-center justify-center gap-3 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors no-underline w-full"
      >
        <SignOut size={20} />
        <span class="font-medium">Sign Out</span>
      </a>
    </div>
  </div>
</Card>

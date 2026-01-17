<script lang="ts">
  import { User, SignOut, Lock } from "phosphor-svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<header class="mb-8">
  <h1 class="text-3xl font-bold text-foreground mb-2">Profile</h1>
</header>

<div
  class="bg-primary text-primary-foreground rounded-lg border border-border shadow-card p-6 sm:p-8"
>
  <div class="flex items-center gap-4 mb-6">
    {#if data?.user?.avatarUrl}
      <img
        src={data.user.avatarUrl}
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
        {data?.user?.name || "ZapDo User"}
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
            <p class="text-sm">Current plan</p>
          </div>
          <div
            class="px-2 py-1 bg-blue-500/20 text-blue-500 text-xs font-medium rounded-full"
          >
            Active
          </div>
        </div>
        <ul class="space-y-2 text-sm">
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Unlimited tasks
          </li>
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Basic project management
          </li>
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            End-to-end encryption
          </li>
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Privacy-focused
          </li>
        </ul>
      </div>

      <a
        href="/auth/logout"
        class="w-full flex items-center justify-center gap-3 px-6 py-3 hover:bg-accent hover:accent-foreground rounded-lg border transition-colors no-underline"
      >
        <SignOut size={20} />
        <span>Sign Out</span>
      </a>
    </div>
  </div>
</div>

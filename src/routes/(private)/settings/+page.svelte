<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    UserCircle,
    ShieldCheck,
    GearSix,
    CaretRight,
    CaretDown,
    Monitor,
    Trash,
    SignOut,
  } from "phosphor-svelte";

  let { data } = $props();

  type Section = "profile" | "security" | "preferences";
  let expandedSections = $state<Set<Section>>(new Set());

  const navItems: Array<{
    id: Section;
    label: string;
    icon: typeof UserCircle;
  }> = [
    { id: "profile", label: "Profile", icon: UserCircle },
    { id: "security", label: "Security & Devices", icon: ShieldCheck },
    { id: "preferences", label: "Preferences", icon: GearSix },
  ];

  function isExpanded(id: Section): boolean {
    return expandedSections.has(id);
  }

  function toggleSection(id: Section) {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    expandedSections = newSet;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date();
  }
</script>

<div class="max-w-2xl">
  <h1 class="text-3xl font-bold text-foreground mb-6">Settings</h1>

  <div class="space-y-2">
    {#each navItems as item}
      <div
        class="bg-card rounded-lg border border-border shadow-card overflow-hidden"
      >
        <button
          class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors {isExpanded(
            item.id,
          )
            ? 'bg-accent/10'
            : 'hover:bg-secondary/10'}"
          onclick={() => toggleSection(item.id)}
        >
          {#if isExpanded(item.id)}
            <CaretDown size={16} class="text-muted-foreground" />
          {:else}
            <CaretRight size={16} class="text-muted-foreground" />
          {/if}
          <item.icon size={20} class="text-muted-foreground" />
          <span class="font-medium text-foreground">{item.label}</span>
        </button>

        {#if isExpanded(item.id)}
          <div class="px-4 pb-4 border-t border-border">
            {#if item.id === "profile"}
              <div class="pt-4 space-y-6">
                <div class="flex items-center gap-4">
                  {#if data.session.user?.pictureUrl}
                    <img
                      src={data.session.user.pictureUrl}
                      alt="User avatar"
                      class="w-16 h-16 rounded-full object-cover"
                    />
                  {:else}
                    <div
                      class="w-16 h-16 rounded-full bg-secondary flex items-center justify-center"
                    >
                      <UserCircle size={32} class="text-secondary-foreground" />
                    </div>
                  {/if}
                  <div>
                    <h2 class="text-xl font-semibold text-foreground">
                      {data.session.user?.name || "ZapDo User"}
                    </h2>
                    <p class="text-sm text-muted-foreground">
                      {data.session.user?.email || ""}
                    </p>
                  </div>
                </div>

                <div class="border-t border-border pt-4">
                  <h3 class="text-lg font-semibold text-foreground mb-4">
                    My Plan
                  </h3>
                  <div class="space-y-4">
                    <div
                      class="p-4 bg-background rounded-lg border border-border"
                    >
                      <div class="flex items-center justify-between mb-3">
                        <div>
                          <h4 class="font-bold text-foreground text-lg">
                            Free Tier
                          </h4>
                          <p class="text-sm text-muted-foreground">
                            Current plan
                          </p>
                        </div>
                        <div
                          class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded-full"
                        >
                          Active
                        </div>
                      </div>
                      <ul class="space-y-2 text-sm text-muted-foreground">
                        <li class="flex items-center gap-2">
                          <span class="w-1.5 h-1.5 bg-accent rounded-full"
                          ></span>
                          <span class="font-medium">Unlimited tasks</span>
                        </li>
                        <li class="flex items-center gap-2">
                          <span class="w-1.5 h-1.5 bg-accent rounded-full"
                          ></span>
                          <span class="font-medium"
                            >Basic project management</span
                          >
                        </li>
                        <li class="flex items-center gap-2">
                          <span class="w-1.5 h-1.5 bg-accent rounded-full"
                          ></span>
                          <span class="font-medium">End-to-end encryption</span>
                        </li>
                        <li class="flex items-center gap-2">
                          <span class="w-1.5 h-1.5 bg-accent rounded-full"
                          ></span>
                          <span class="font-medium">Privacy-focused</span>
                        </li>
                      </ul>
                    </div>

                    <a
                      href="/auth/logout"
                      class="flex items-center justify-center gap-3 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg border border-[#fecaca] hover:bg-[#fecaca] hover:text-[#b91c1c] transition-colors no-underline w-full font-medium"
                    >
                      <SignOut size={20} />
                      <span>Sign Out</span>
                    </a>
                  </div>
                </div>
              </div>
            {:else if item.id === "security"}
              <div class="pt-4 space-y-3">
                {#each data.devices as device (device.id)}
                  <div
                    class="bg-background rounded-lg border border-border p-4"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex items-start gap-3">
                        <div
                          class="w-8 h-8 rounded-full flex items-center justify-center {device.isCurrentDevice
                            ? 'bg-accent/20'
                            : 'bg-secondary'}"
                        >
                          <Monitor
                            size={16}
                            class={device.isCurrentDevice
                              ? "text-accent"
                              : "text-muted-foreground"}
                          />
                        </div>
                        <div>
                          <div class="flex items-center gap-2 mb-1">
                            <h3 class="font-medium text-foreground text-sm">
                              {device.deviceName}
                            </h3>
                            {#if device.isCurrentDevice}
                              <span
                                class="px-1.5 py-0.5 text-xs font-medium bg-accent/20 text-accent rounded"
                              >
                                Current
                              </span>
                            {/if}
                          </div>
                          <p class="text-xs text-muted-foreground">
                            Created: {formatDate(device.createdAt)}
                          </p>
                          <p
                            class="text-xs {isExpired(device.expiresAt)
                              ? 'text-destructive'
                              : 'text-muted-foreground'}"
                          >
                            {isExpired(device.expiresAt)
                              ? `Expired: ${formatDate(device.expiresAt)}`
                              : `Expires: ${formatDate(device.expiresAt)}`}
                          </p>
                        </div>
                      </div>
                      {#if !device.isCurrentDevice}
                        <form
                          method="POST"
                          action="?/deleteDevice"
                          use:enhance={() => {
                            return async ({ result }) => {
                              if (result.type === "success") {
                                window.location.reload();
                              }
                            };
                          }}
                        >
                          <input
                            type="hidden"
                            name="deviceId"
                            value={device.id}
                          />
                          <button
                            type="submit"
                            class="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash size={16} />
                          </button>
                        </form>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {:else if item.id === "preferences"}
              <div class="pt-4">
                <p class="text-sm text-muted-foreground">Coming soon...</p>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

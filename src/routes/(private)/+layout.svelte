<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import {
    UserCircle,
    Warehouse,
    Folder,
    Star,
    Rocket,
    ChartBar,
    Lightbulb,
    Target,
    Book,
    GearSix,
  } from "phosphor-svelte";
  import { page } from "$app/state";
  import { getStorageItem, STORAGE_KEYS } from "$lib/storage";
  import { goto } from "$app/navigation";
  import {
    decryptWithAesGcm,
    deriveSharedSecret,
    importAesKey,
    importEcToKey,
  } from "$lib/crypto";
  import { kekStore } from "$lib/stores/kekStore";
  import { projectsStore } from "$lib/stores/project.js";

  let { children, data } = $props();
  let projectsReady = $state(false);

  (async () => {
    const kekPrivateStr = getStorageItem(STORAGE_KEYS.KEK_PRIVATE_KEY, ``);
    if (!kekPrivateStr) goto(`/login`);
    const kekPrivateKey = await importEcToKey(kekPrivateStr, `private`, `ECDH`);
    const kekPublicKey = await importEcToKey(
      data.session.user.kekPublicKey!,
      `public`,
      `ECDH`,
    );
    const kek = await deriveSharedSecret(kekPrivateKey, kekPublicKey);
    $kekStore = kek;
    for (const project of data.projects) {
      const dek = project.deks[0];
      const decryptedDekStr = await decryptWithAesGcm(
        dek.encryptedDek,
        $kekStore,
      );
      const dekKey = await importAesKey(decryptedDekStr);
      const decryptedName = await decryptWithAesGcm(project.name, dekKey);
      const decryptedDescription = project.description
        ? await decryptWithAesGcm(project.description, dekKey)
        : ``;
      const decryptedProject = {
        ...project,
        name: decryptedName,
        description: decryptedDescription,
      };
      projectsStore.update((old) => {
        old.push({ dek: dekKey, project: decryptedProject });
        return old;
      });
    }
    projectsReady = true;
  })().catch((e) => {
    console.error(e);
    projectsReady = true; // Set to true even on error to show something
    // TODO: handle error display
  });
  function isActive(path: string): boolean {
    return page.url.pathname.startsWith(path);
  }
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-screen">
  <aside
    class="w-16 bg-card text-foreground flex flex-col items-center py-4 border-r border-border"
  >
    <div class="p-2 my-4">
      <img src={favicon} alt="ZapDo" width="28" height="28" class="w-7 h-7" />
    </div>
    <nav class="flex-1 flex flex-col items-center space-y-2 overflow-y-auto">
      {#each $projectsStore as item (item.project.id)}
        <a
          href={`/projects/${item.project.id}/tasks`}
          title={item.project.name}
          class="p-2 rounded-md font-medium hover:bg-accent hover:text-accent-foreground transition-colors {isActive(
            `/projects/${item.project.id}`,
          )
            ? 'bg-accent text-accent-foreground'
            : ''}"
        >
          {#if item.project.icon === "star"}
            <Star
              size={20}
              weight="fill"
              style={`color: ${item.project.color}`}
            />
          {:else if item.project.icon === "rocket"}
            <Rocket
              size={20}
              weight="fill"
              style={`color: ${item.project.color}`}
            />
          {:else if item.project.icon === "chart"}
            <ChartBar
              size={20}
              weight="fill"
              style={`color: ${item.project.color}`}
            />
          {:else if item.project.icon === "lightbulb"}
            <Lightbulb
              size={20}
              weight="fill"
              style={`color: ${item.project.color}`}
            />
          {:else if item.project.icon === "target"}
            <Target
              size={20}
              weight="fill"
              style={`color: ${item.project.color}`}
            />
          {:else if item.project.icon === "book"}
            <Book
              size={20}
              weight="fill"
              style={`color: ${item.project.color}`}
            />
          {:else if item.project.icon === "gear"}
            <GearSix
              size={20}
              weight="fill"
              style={`color: ${item.project.color}`}
            />
          {:else if item.project.icon === "folder"}
            <Folder
              size={20}
              weight="fill"
              style={`color: ${item.project.color}`}
            />
          {:else}
            <Warehouse
              size={20}
              weight="fill"
              style={`color: ${item.project.color}`}
            />
          {/if}
        </a>
      {/each}
    </nav>
    <a
      href="/profile"
      title="Profile"
      class="p-2 rounded-md font-medium hover:bg-accent hover:text-accent-foreground transition-colors {isActive(
        '/profile',
      )
        ? 'bg-accent text-accent-foreground'
        : ''}"
    >
      <UserCircle size={20} weight="duotone" />
    </a>
  </aside>

  <main class="flex-1 bg-background text-foreground">
    <div class="container mx-auto px-4 py-6 max-w-4xl">
      {@render children()}
    </div>
  </main>
</div>

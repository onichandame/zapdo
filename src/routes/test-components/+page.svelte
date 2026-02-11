<script lang="ts">
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import Label from "$lib/components/ui/label.svelte";
  import Error from "$lib/components/ui/error.svelte";
  import Textarea from "$lib/components/ui/textarea.svelte";
  import Select from "$lib/components/ui/select.svelte";
  import Alert from "$lib/components/ui/alert.svelte";
  import Modal from "$lib/components/ui/modal.svelte";

  let isModalOpen = $state(false);

  function openModal() {
    isModalOpen = true;
  }

  function closeModal() {
    isModalOpen = false;
  }
</script>

<div class="min-h-screen bg-background text-foreground p-8">
  <h1 class="text-3xl font-bold mb-6">Component Test Page</h1>

  <!-- Buttons -->
  <div class="mb-8">
    <h2 class="text-2xl font-semibold mb-4">Buttons</h2>
    <div class="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  </div>

  <!-- Cards -->
  <div class="mb-8">
    <h2 class="text-2xl font-semibold mb-4">Cards</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="form">
        <div class="p-4">
          <h3 class="text-xl font-semibold mb-2">Form Card</h3>
          <p class="font-medium">This is a form card component.</p>
        </div>
      </Card>
      <Card variant="project">
        <h3 class="text-xl font-semibold mb-2">Project Card</h3>
        <p class="font-medium">This is a project card with hover effects.</p>
      </Card>
      <Card variant="feature">
        <h3 class="text-xl font-semibold mb-2">Feature Card</h3>
        <p class="font-medium">This is a feature card with shadow effects.</p>
      </Card>
      <Card variant="stat">
        <span>📊</span>
        <div>
          <h3 class="text-xl font-semibold">Stat Card</h3>
          <p class="font-medium">123 items</p>
        </div>
      </Card>
    </div>
  </div>

  <!-- Form Elements -->
  <div class="mb-8">
    <h2 class="text-2xl font-semibold mb-4">Form Elements</h2>
    <div class="space-y-4 max-w-md">
      <div>
        <Label for="test-input">Input</Label>
        <Input
          id="test-input"
          type="text"
          placeholder="Enter text"
        />
      </div>
      <div>
        <Label for="test-textarea">Textarea</Label>
        <Textarea
          id="test-textarea"
          placeholder="Enter message"
          rows={3}
        />
      </div>
      <div>
        <Label for="test-select">Select</Label>
        <Select id="test-select">
          <option>Option 1</option>
          <option>Option 2</option>
        </Select>
      </div>
      <div>
        <Label for="test-search">Search</Label>
        <Input
          id="test-search"
          placeholder="Search..."
          class="text-sm placeholder:text-muted-foreground"
        />
      </div>
      <div>
        <Label for="test-error">Error Example</Label>
        <Input
          id="test-error"
          type="text"
          placeholder="This field has an error"
        />
        <Error>This is an error message</Error>
      </div>
    </div>
  </div>

  <!-- Alerts -->
  <div class="mb-8">
    <h2 class="text-2xl font-semibold mb-4">Alerts</h2>
    <div class="space-y-4 max-w-md">
      <Alert variant="error">
        <div class="flex items-center gap-2">
          <span>⚠️</span>
          <span class="font-medium">This is an error message</span>
        </div>
      </Alert>
      <Alert variant="info">
        <div class="flex items-center gap-2">
          <span>ℹ️</span>
          <span class="font-medium">This is an info message</span>
        </div>
      </Alert>
    </div>
  </div>

  <!-- Modal Example -->
  <div class="mb-8">
    <h2 class="text-2xl font-semibold mb-4">Modal</h2>
    <Button variant="secondary" onclick={openModal}>Open Modal</Button>
    <Modal 
      open={isModalOpen} 
      onClose={closeModal}
      title="Modal Title"
    >
      <p class="font-medium">This is modal content.</p>
      <div class="flex gap-2 mt-6 pt-4 border-t border-border">
        <Button variant="ghost" onclick={closeModal} class="flex-1">Cancel</Button>
        <Button variant="primary">Confirm</Button>
      </div>
    </Modal>
  </div>
</div>

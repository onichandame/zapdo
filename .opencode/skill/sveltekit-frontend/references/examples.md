# Component Examples

## Button Components

### Primary Button with Loading State
```svelte
<!-- components/Button.svelte -->
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: () => void | Promise<void>;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    type = 'button',
    onclick,
    children
  }: Props = $props();

  const isLoading = $derived(loading || disabled);
  
  async function handleClick() {
    if (isLoading || !onclick) return;
    
    try {
      await onclick();
    } catch (error) {
      console.error('Button action failed:', error);
    }
  }

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
    ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500 disabled:text-gray-400'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-x-1.5',
    md: 'px-4 py-2 text-sm gap-x-2',
    lg: 'px-6 py-3 text-base gap-x-2'
  };
</script>

<button
  {type}
  class={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
  class:opacity-75={isLoading}
  {disabled}
  onclick={handleClick}
>
  {#if loading}
    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  
  {@render children()}
</button>
```

### Icon Button
```svelte
<!-- components/IconButton.svelte -->
<script lang="ts">
  interface Props {
    icon: string; // SVG path or component
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    tooltip?: string;
    onclick?: () => void;
  }

  let { icon, variant = 'ghost', size = 'md', tooltip, onclick }: Props = $props();

  const baseClasses = 'inline-flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500',
    ghost: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };
</script>

<button
  class={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
  {onclick}
  {tooltip}
>
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {@html icon}
  </svg>
</button>
```

## Form Components

### TextField
```svelte
<!-- components/TextField.svelte -->
<script lang="ts">
  interface Props {
    label?: string;
    name: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    placeholder?: string;
    value?: string;
    error?: string;
    description?: string;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    oninput?: (value: string) => void;
    onchange?: (value: string) => void;
  }

  let {
    label,
    name,
    type = 'text',
    placeholder,
    value = '',
    error,
    description,
    required = false,
    disabled = false,
    readonly = false,
    oninput,
    onchange
  }: Props = $props();

  let internalValue = $state(value);
  let inputElement: HTMLInputElement;
  let isFocused = $state(false);

  // Sync external value changes
  $effect(() => {
    if (value !== internalValue) {
      internalValue = value;
    }
  });

  function handleInput(event: Event) {
    if (readonly || disabled) return;
    
    const target = event.target as HTMLInputElement;
    internalValue = target.value;
    oninput?.(target.value);
  }

  function handleChange(event: Event) {
    if (readonly || disabled) return;
    
    const target = event.target as HTMLInputElement;
    onchange?.(target.value);
  }

  function focus() {
    inputElement?.focus();
  }

  function blur() {
    inputElement?.blur();
  }
</script>

<div class="form-field">
  {#if label}
    <label for={name} class="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}
  
  <div class="relative">
    <input
      bind:this={inputElement}
      id={name}
      name={name}
      {type}
      {placeholder}
      bind:value={internalValue}
      oninput={handleInput}
      onchange={handleChange}
      {required}
      {disabled}
      {readonly}
      class="block w-full px-3 py-2 border rounded-md shadow-sm transition-colors"
      class:border-gray-300={!error}
      class:border-red-500={error}
      class:ring-red-500={error && isFocused}
      class:ring-blue-500={!error && isFocused}
      class:focus:border-transparent
      class:focus:ring-2
      class:bg-gray-50={disabled}
      class:cursor-not-allowed={disabled}
      on:focus={() => isFocused = true}
      on:blur={() => isFocused = false}
    />
    
    {#if type === 'password'}
      <button 
        type="button" 
        class="absolute inset-y-0 right-0 pr-3 flex items-center"
        onclick={() => inputElement.type = inputElement.type === 'password' ? 'text' : 'password'}
      >
        <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      </button>
    {/if}
  </div>
  
  {#if description}
    <p class="mt-1 text-sm text-gray-500">{description}</p>
  {/if}
  
  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
</div>
```

### Select Field
```svelte
<!-- components/SelectField.svelte -->
<script lang="ts">
  interface Option {
    value: string;
    label: string;
    disabled?: boolean;
  }

  interface Props {
    label?: string;
    name: string;
    options: Option[];
    value?: string;
    placeholder?: string;
    error?: string;
    description?: string;
    required?: boolean;
    disabled?: boolean;
    oninput?: (value: string) => void;
    onchange?: (value: string) => void;
  }

  let {
    label,
    name,
    options,
    value = '',
    placeholder,
    error,
    description,
    required = false,
    disabled = false,
    oninput,
    onchange
  }: Props = $props();

  let internalValue = $state(value);
  let isFocused = $state(false);

  $effect(() => {
    if (value !== internalValue) {
      internalValue = value;
    }
  });

  function handleInput(event: Event) {
    const target = event.target as HTMLSelectElement;
    internalValue = target.value;
    oninput?.(target.value);
  }

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    onchange?.(target.value);
  }
</script>

<div class="form-field">
  {#if label}
    <label for={name} class="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}
  
  <select
    id={name}
    name={name}
    bind:value={internalValue}
    oninput={handleInput}
    onchange={handleChange}
    {required}
    {disabled}
    class="block w-full px-3 py-2 border rounded-md shadow-sm transition-colors"
    class:border-gray-300={!error}
    class:border-red-500={error}
    class:ring-red-500={error && isFocused}
    class:ring-blue-500={!error && isFocused}
    class:focus:border-transparent
    class:focus:ring-2
    class:bg-gray-50={disabled}
    class:cursor-not-allowed={disabled}
    on:focus={() => isFocused = true}
    on:blur={() => isFocused = false}
  >
    {#if placeholder}
      <option value="" disabled selected={!value}>{placeholder}</option>
    {/if}
    
    {#each options as option}
      <option value={option.value} {disabled}>
        {option.label}
      </option>
    {/each}
  </select>
  
  {#if description}
    <p class="mt-1 text-sm text-gray-500">{description}</p>
  {/if}
  
  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
</div>
```

## Layout Components

### Card Component
```svelte
<!-- components/Card.svelte -->
<script lang="ts">
  interface Props {
    header?: Snippet;
    body: Snippet;
    footer?: Snippet;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    shadow?: 'none' | 'sm' | 'md' | 'lg';
    border?: boolean;
    rounded?: boolean;
    class?: string;
  }

  let {
    header,
    body,
    footer,
    padding = 'md',
    shadow = 'md',
    border = true,
    rounded = true,
    class: className = ''
  }: Props = $props();

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };
</script>

<div 
  class="bg-white overflow-hidden"
  class={className}
  class:border={border}
  class:border-gray-200={border}
  class:rounded-lg={rounded}
  class={shadowClasses[shadow]}
>
  {#if header}
    <div class="border-b border-gray-200">
      <div class={paddingClasses[padding] || paddingClasses.md}>
        {@render header()}
      </div>
    </div>
  {/if}
  
  <main class={paddingClasses[padding] || paddingClasses.md}>
    {@render body()}
  </main>
  
  {#if footer}
    <div class="border-t border-gray-200">
      <div class={paddingClasses[padding] || paddingClasses.md}>
        {@render footer()}
      </div>
    </div>
  {/if}
</div>
```

### Modal Component
```svelte
<!-- components/Modal.svelte -->
<script lang="ts">
  interface Props {
    open: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    title?: string;
    closeable?: boolean;
    onclose: () => void;
    children: Snippet;
  }

  let {
    open,
    size = 'md',
    title,
    closeable = true,
    onclose,
    children
  }: Props = $props();

  let modalElement: HTMLDivElement;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  // Handle backdrop click
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === modalElement && closeable) {
      onclose();
    }
  }

  // Handle escape key
  $effect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && closeable) {
        onclose();
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeydown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    };
  });
</script>

{#if open}
  <div
    bind:this={modalElement}
    class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
  >
    <div 
      class="bg-white rounded-lg shadow-xl w-full {sizeClasses[size]} transform transition-all"
      role="dialog"
      aria-modal="true"
      on:click|stopPropagation
    >
      {#if title || closeable}
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          {#if title}
            <h3 class="text-lg font-medium text-gray-900">{title}</h3>
          {/if}
          
          {#if closeable}
            <button
              type="button"
              class="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
              onclick={onclose}
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      {/if}
      
      <div class="px-6 py-4">
        {@render children()}
      </div>
    </div>
  </div>
{/if}
```

## Navigation Components

### Navigation Breadcrumb
```svelte
<!-- components/Breadcrumb.svelte -->
<script lang="ts">
  interface BreadcrumbItem {
    label: string;
    href?: string;
    current?: boolean;
  }

  interface Props {
    items: BreadcrumbItem[];
    class?: string;
  }

  let { items, class: className = '' }: Props = $props();
</script>

<nav class="flex" class={className} aria-label="Breadcrumb">
  <ol class="flex items-center space-x-2">
    {#each items as item, index}
      <li class="flex items-center">
        {#if index > 0}
          <svg class="flex-shrink-0 h-5 w-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        {/if}
        
        {#if item.href && !item.current}
          <a 
            href={item.href}
            class="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {item.label}
          </a>
        {:else}
          <span 
            class="text-sm font-medium"
            class:text-gray-500={!item.current}
            class:text-gray-900={item.current}
          >
            {item.label}
          </span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
```

### Tab Navigation
```svelte
<!-- components/Tabs.svelte -->
<script lang="ts">
  interface Tab {
    id: string;
    label: string;
    content: Snippet;
    disabled?: boolean;
  }

  interface Props {
    tabs: Tab[];
    defaultTab?: string;
    variant?: 'default' | 'boxed' | 'pills';
    class?: string;
  }

  let { tabs, defaultTab, variant = 'default', class: className = '' }: Props = $props();
  
  let activeTab = $state(defaultTab ?? tabs[0]?.id ?? '');
  
  $effect(() => {
    if (!tabs.find(tab => tab.id === activeTab) && tabs.length > 0) {
      activeTab = tabs[0].id;
    }
  });

  function setTab(tabId: string) {
    activeTab = tabId;
  }

  const baseClasses = 'flex space-x-1';
  
  const tabClasses = {
    default: {
      base: 'border-b-2 transition-colors',
      active: 'border-blue-500 text-blue-600',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    },
    boxed: {
      base: 'border-l border-r border-t rounded-t-lg transition-colors',
      active: 'bg-white text-blue-600 border-blue-500 -mb-px',
      inactive: 'bg-gray-50 text-gray-600 border-transparent hover:text-gray-800'
    },
    pills: {
      base: 'rounded-lg transition-colors',
      active: 'bg-blue-500 text-white',
      inactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }
  };
</script>

<div class={className}>
  <!-- Tab Navigation -->
  <div class={baseClasses}>
    {#each tabs as tab}
      <button
        type="button"
        class="py-2 px-4 text-sm font-medium {tabClasses[variant].base}"
        class={tabClasses[variant].active}
        class={tabClasses[variant].inactive}
        class:opacity-50={tab.disabled}
        class:cursor-not-allowed={tab.disabled}
        onclick={() => !tab.disabled && setTab(tab.id)}
        aria-current={activeTab === tab.id ? 'page' : undefined}
        disabled={tab.disabled}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Tab Content -->
  <div class="mt-4">
    {#each tabs as tab}
      {#if activeTab === tab.id}
        {@render tab.content()}
      {/if}
    {/each}
  </div>
</div>
```

## Data Display Components

### DataTable
```svelte
<!-- components/DataTable.svelte -->
<script lang="ts">
  interface Column<T = any> {
    key: keyof T;
    label: string;
    sortable?: boolean;
    width?: string;
    render?: (value: any, item: T) => string;
    align?: 'left' | 'center' | 'right';
  }

  interface Props {
    data: any[];
    columns: Column[];
    loading?: boolean;
    error?: string;
    emptyMessage?: string;
    selectable?: boolean;
    selection?: any[];
    onselectionchange?: (selection: any[]) => void;
  }

  let {
    data,
    columns,
    loading = false,
    error,
    emptyMessage = 'No data available',
    selectable = false,
    selection = [],
    onselectionchange
  }: Props = $props();

  let sortColumn = $state<Column | null>(null);
  let sortDirection = $state<'asc' | 'desc'>('asc');

  function handleSort(column: Column) {
    if (!column.sortable) return;
    
    if (sortColumn?.key === column.key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  }

  function toggleSelection(item: any) {
    if (!selectable) return;
    
    const index = selection.findIndex(selected => selected.id === item.id);
    if (index >= 0) {
      selection = selection.filter(selected => selected.id !== item.id);
    } else {
      selection = [...selection, item];
    }
    onselectionchange?.(selection);
  }

  function toggleSelectAll() {
    if (selection.length === data.length) {
      selection = [];
    } else {
      selection = [...data];
    }
    onselectionchange?.(selection);
  }

  $: sortedData = data.slice().sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn.key];
    const bValue = b[sortColumn.key];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
</script>

<div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
  <!-- Loading State -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2 text-gray-500">Loading...</span>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3">
      {error}
    </div>
  {:else if sortedData.length === 0}
    <div class="text-center py-12 text-gray-500">
      {emptyMessage}
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-300">
        <thead class="bg-gray-50">
          <tr>
            {#if selectable}
              <th class="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selection.length === sortedData.length}
                  onchange={toggleSelectAll}
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
            {/if}
            
            {#each columns as column}
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                class:cursor-pointer={column.sortable}
                class:hover:bg-gray-100={column.sortable}
                onclick={() => handleSort(column)}
                style={column.width ? `width: ${column.width}` : ''}
              >
                <div class="flex items-center space-x-1" class:justify-end={column.align === 'right'}>
                  <span>{column.label}</span>
                  {#if column.sortable && sortColumn?.key === column.key}
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path 
                        stroke-linecap="round" 
                        stroke-linejoin="round" 
                        stroke-width="2" 
                        d="M5 15l7-7 7 7" 
                      />
                    </svg>
                  {/if}
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each sortedData as item}
            <tr class="hover:bg-gray-50">
              {#if selectable}
                <td class="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selection.some(selected => selected.id === item.id)}
                    onchange={() => toggleSelection(item)}
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
              {/if}
              
              {#each columns as column}
                <td 
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  class:text-center={column.align === 'center'}
                  class:text-right={column.align === 'right'}
                >
                  {#if column.render}
                    {@html column.render(item[column.key], item)}
                  {:else}
                    {item[column.key]}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
```

These examples demonstrate practical Svelte 5 component patterns with proper TypeScript integration, accessibility, and modern development practices.
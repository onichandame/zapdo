<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
</script>

{#if $page.data.error}
  <div class="onboarding-error">
    <h2>Onboarding Error</h2>
    <p>{$page.data.error}</p>
    {#if $page.data.showLoginButton}
      <button 
        class="login-button" 
        onclick={() => goto('/login')}
      >
        Go to Login
      </button>
    {/if}
  </div>
{:else}
  <div class="onboarding-container">
    <h1>Complete Your Setup</h1>
    <p>Please set up your device keys to complete onboarding.</p>
  </div>
{/if}

<style>
  .onboarding-error {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    text-align: center;
  }
  
  .onboarding-error h2 {
    color: #d32f2f;
    margin-bottom: 1rem;
  }
  
  .onboarding-error p {
    margin-bottom: 1.5rem;
    color: #666;
  }
  
  .login-button {
    background-color: #1976d2;
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .login-button:hover {
    background-color: #1565c0;
  }
  
  .onboarding-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
  }
  
  .onboarding-container h1 {
    color: #333;
    margin-bottom: 1rem;
  }
</style>
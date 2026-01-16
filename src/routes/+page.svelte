<script lang="ts">
  import { Plus, Lock, Target, Users, ArrowRight } from "phosphor-svelte";
</script>

<div class="landing-page min-h-screen bg-background text-foreground relative">
  <div class="absolute top-4 right-4 sm:top-6 sm:right-6 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-md">
    Free for limited time
  </div>
  <section class="hero py-16 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="text-center">
        <h1 class="font-bold tracking-tight text-foreground mb-6">
          <span class="text-3xl sm:text-4xl md:text-5xl block"
            >Protect What Matters</span
          >
          <span
            class="text-4xl sm:text-5xl md:text-6xl block text-foreground mt-2"
            >With ZapDo</span
          >
        </h1>
        <p class="text-xl sm:text-2xl text-foreground max-w-3xl mx-auto mb-10">
          If you need a private memo, you are in the right place.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/tasks"
            class="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
            <ArrowRight class="ml-2" size={20} />
          </a>
          <a
            href="#features"
            class="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  </section>

  <section
    id="features"
    class="features py-20 px-4 sm:px-6 lg:px-8 bg-secondary text-secondary-foreground"
  >
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold mb-4">Why Choose ZapDo?</h2>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
          Built with simplicity, efficiency, and privacy in mind.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          class="feature-card p-6 bg-background text-primary-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="feature-icon w-12 h-12 flex items-center justify-center">
              <Target size={24} />
            </div>
            <h3 class="text-xl font-semibold text-foreground">
              Intelligent Task Management
            </h3>
          </div>
          <p class="text-foreground">
            Organize and prioritize your tasks with smart filtering,
            categorization, and status tracking for optimal productivity.
          </p>
        </div>

        <div
          class="feature-card p-6 bg-background text-primary-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="feature-icon w-12 h-12 flex items-center justify-center">
              <Lock size={24} />
            </div>
            <h3 class="text-xl font-semibold text-foreground">
              Privacy-First Design
            </h3>
          </div>
          <p class="text-foreground">
            End-to-end encryption ensures your data never leaves your device
            unencrypted. Your tasks remain private and secure.
          </p>
        </div>

        <div
          class="feature-card p-6 bg-background text-primary-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="feature-icon w-12 h-12 flex items-center justify-center">
              <Plus size={24} />
            </div>
            <h3 class="text-xl font-semibold text-foreground">
              Intuitive Interface
            </h3>
          </div>
          <p class="text-foreground">
            Clean, modern design with powerful filtering and search capabilities
            to help you manage your tasks efficiently.
          </p>
        </div>
      </div>
    </div>
  </section>



  <section
    class="cta py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground"
  >
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl sm:text-4xl font-bold mb-6">
        Ready to Take Control of Your Tasks?
      </h2>
      <p class="text-xl mb-8 opacity-90">
        Start organizing effectively with ZapDo today.
      </p>
      <a
        href="/tasks"
        class="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-lg bg-primary-foreground text-primary hover:bg-primary-foreground/90 transition-colors"
      >
        Get Started Now
        <ArrowRight class="ml-2" size={20} />
      </a>
    </div>
  </section>
</div>

<style>
  .landing-page {
    scroll-behavior: smooth;
  }
</style>


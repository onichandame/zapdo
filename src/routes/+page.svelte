<script lang="ts">
  import { Plus, Lock, Target, Users, ArrowRight } from "phosphor-svelte";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
</script>

<div class="landing-page min-h-screen bg-background text-foreground relative">
  <section class="hero py-16 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="text-center">
        <h1
          class="text-3xl sm:text-4xl md:text-5xl flex flex-col gap-y-4 font-bold tracking-tight text-foreground mb-6"
        >
          <span class="block">Protect What Matters</span>
          <span class="block text-4xl sm:text-5xl md:text-6xl mt-2">
            With <span
              class="bg-accent text-accent-foreground px-2 py-1 rounded-lg"
              >ZapDo</span
            >
          </span>
        </h1>
        <p
          class="text-xl sm:text-2xl text-foreground max-w-3xl mx-auto mb-10 font-medium"
        >
          If you need a private memo, you are in the right place.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            class="w-full bg-gradient-to-r justify-center items-center flex from-accent to-accent/80 text-accent-foreground rounded-lg border border-accent/50 hover:from-accent/90 hover:to-accent/80 px-6 py-3.5 text-lg font-semibold shadow-md hover:shadow-lg font-medium transition-all duration-200 cursor-pointer"
          >
            Get Started
            <ArrowRight class="ml-2" size={20} />
          </a>
          <a
            href="#features"
            class="flex-1 px-4 py-2.5 bg-background text-foreground rounded-lg border border-border font-medium transition-colors hover:bg-muted hover:text-muted-foreground"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  </section>

  <section
    id="features"
    class="features py-20 px-4 sm:px-6 lg:px-8 bg-secondary/15 text-foreground"
  >
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold mb-4">Why Choose ZapDo?</h2>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
          Built with simplicity, efficiency, and privacy in mind.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card variant="feature">
          <div class="flex items-center gap-4 mb-4">
            <div
              class="w-12 h-12 flex items-center justify-center bg-accent/10 rounded-lg"
            >
              <Target size={24} class="text-accent" />
            </div>
            <h3 class="text-xl font-semibold text-foreground">
              Intelligent Task Management
            </h3>
          </div>
          <p class="text-foreground font-medium">
            Organize and prioritize your tasks with smart filtering,
            categorization, and status tracking for optimal productivity.
          </p>
        </Card>

        <Card variant="feature">
          <div class="flex items-center gap-4 mb-4">
            <div
              class="w-12 h-12 flex items-center justify-center bg-accent/10 rounded-lg"
            >
              <Lock size={24} class="text-accent" />
            </div>
            <h3 class="text-xl font-semibold text-foreground">
              Privacy-First Design
            </h3>
          </div>
          <p class="text-foreground font-medium">
            End-to-end encryption ensures your data never leaves your device
            unencrypted. Your tasks remain private and secure.
          </p>
        </Card>

        <Card variant="feature">
          <div class="flex items-center gap-4 mb-4">
            <div
              class="w-12 h-12 flex items-center justify-center bg-accent/10 rounded-lg"
            >
              <Plus size={24} class="text-accent" />
            </div>
            <h3 class="text-xl font-semibold text-foreground">
              Intuitive Interface
            </h3>
          </div>
          <p class="text-foreground font-medium">
            Clean, modern design with powerful filtering and search capabilities
            to help you manage your tasks efficiently.
          </p>
        </Card>
      </div>
    </div>
  </section>

  <section
    class="cta py-20 px-4 sm:px-6 lg:px-8 bg-accent text-accent-foreground"
  >
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl sm:text-4xl font-bold mb-6">
        Ready to Take Control of Your Tasks?
      </h2>
      <p class="text-xl mb-8 font-medium">
        Start organizing effectively with ZapDo today.
      </p>
      <a
        href="/tasks"
        class="flex justify-center items-center w-full bg-white text-accent rounded-lg border border-white/50 hover:bg-white/90 px-6 py-3.5 text-lg font-semibold shadow-md hover:shadow-lg font-medium transition-all duration-200 cursor-pointer"
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

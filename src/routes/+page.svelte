<script lang="ts">
	import { user } from '$lib/stores'
</script>

<svelte:head>
	<title>Game Design Organizer</title>
</svelte:head>

{#if $user}
	<h1>Welcome back!</h1>
	<p>You're signed in as: <strong>{$user.email}</strong></p>
	
	<div style="margin-top: 2rem;">
		<a href="/projects" style="display: inline-block; padding: 1rem 2rem; background: #007acc; color: white; text-decoration: none; border-radius: 6px; font-size: 1.1rem;">
			View My Projects →
		</a>
	</div>
{:else}
	<h1>Welcome to Game Design Organizer</h1>
	<p>A tool to help you organize your game design ideas, stories, and documentation.</p>
	
	<div style="margin-top: 2rem;">
		<a href="/login" style="display: inline-block; padding: 0.75rem 1.5rem; background: #007acc; color: white; text-decoration: none; border-radius: 4px;">
			Get Started - Sign In
		</a>
	</div>
{/if}
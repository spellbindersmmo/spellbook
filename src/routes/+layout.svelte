<script lang="ts">
	import { onMount } from 'svelte'
	import { supabase } from '$lib/supabase'
	import { user } from '$lib/stores'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	onMount(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			user.set(session?.user ?? null)
		})

		// Listen for auth changes
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, session) => {
			user.set(session?.user ?? null)
		})

		return () => subscription.unsubscribe()
	})
</script>

<nav style="padding: 1rem; background: #f5f5f5; margin-bottom: 2rem;">
	<div style="display: flex; justify-content: space-between; align-items: center;">
		<h2><a href="/" style="text-decoration: none; color: inherit;">Game Design Organizer</a></h2>
		
		<div>
			{#if $user}
				<span>Welcome, {$user.email}!</span>
				<button on:click={() => supabase.auth.signOut()}>Sign Out</button>
			{:else}
				<a href="/login">Sign In</a>
			{/if}
		</div>
	</div>
</nav>

<main style="padding: 0 1rem;">
	<slot />
</main>
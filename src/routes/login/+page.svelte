<script lang="ts">
	import { supabase } from '$lib/supabase'
	import { goto } from '$app/navigation'
	import { user } from '$lib/stores'

	let email = ''
	let password = ''
	let loading = false
	let error = ''
	let isSignUp = false

	// Redirect if already logged in
	$: if ($user) {
		goto('/')
	}

	async function handleSubmit() {
		if (!email || !password) {
			error = 'Please fill in all fields'
			return
		}

		loading = true
		error = ''

		try {
			if (isSignUp) {
				const { data, error: signUpError } = await supabase.auth.signUp({
					email,
					password
				})
				
				if (signUpError) throw signUpError
				
				if (data.user && !data.session) {
					error = 'Check your email for the confirmation link!'
				}
			} else {
				const { data, error: signInError } = await supabase.auth.signInWithPassword({
					email,
					password
				})
				
				if (signInError) throw signInError
				
				goto('/')
			}
		} catch (err) {
			error = err.message
		} finally {
			loading = false
		}
	}
</script>

<svelte:head>
	<title>{isSignUp ? 'Sign Up' : 'Sign In'} - Game Design Organizer</title>
</svelte:head>

<div style="max-width: 400px; margin: 2rem auto; padding: 2rem; border: 1px solid #ddd; border-radius: 8px;">
	<h1>{isSignUp ? 'Create Account' : 'Sign In'}</h1>
	
	<form on:submit|preventDefault={handleSubmit}>
		<div style="margin-bottom: 1rem;">
			<label for="email">Email:</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				required
				style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"
			/>
		</div>

		<div style="margin-bottom: 1rem;">
			<label for="password">Password:</label>
			<input
				id="password"
				type="password"
				bind:value={password}
				required
				minlength="6"
				style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"
			/>
		</div>

		{#if error}
			<div style="color: red; margin-bottom: 1rem; padding: 0.5rem; background: #ffe6e6; border-radius: 4px;">
				{error}
			</div>
		{/if}

		<button 
			type="submit" 
			disabled={loading}
			style="width: 100%; padding: 0.75rem; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;"
		>
			{loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
		</button>
	</form>

	<div style="text-align: center; margin-top: 1rem;">
		<button 
			on:click={() => isSignUp = !isSignUp}
			style="background: none; border: none; color: #007acc; text-decoration: underline; cursor: pointer;"
		>
			{isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
		</button>
	</div>
</div>
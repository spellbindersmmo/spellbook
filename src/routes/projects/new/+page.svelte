<script lang="ts">
	import { createProject } from '$lib/supabase'
	import { goto } from '$app/navigation'
	import { user } from '$lib/stores'

	let name = ''
	let description = ''
	let imageUrl = ''
	let loading = false
	let error = ''

	// Redirect if not logged in
	$: if (!$user) {
		goto('/login')
	}

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'Project name is required'
			return
		}

		loading = true
		error = ''

		try {
			const project = await createProject({
				name: name.trim(),
				description: description.trim() || null,
				image_url: imageUrl.trim() || null
			})

			goto(`/projects/${project.id}`)
		} catch (err) {
			error = err.message
		} finally {
			loading = false
		}
	}
</script>

<svelte:head>
	<title>New Project - Game Design Organizer</title>
</svelte:head>

<div style="max-width: 600px; margin: 2rem auto;">
	<div style="margin-bottom: 2rem;">
		<a href="/projects" style="color: #007acc; text-decoration: none;">← Back to Projects</a>
	</div>

	<h1>Create New Project</h1>

	<form on:submit|preventDefault={handleSubmit} style="background: white; padding: 2rem; border: 1px solid #ddd; border-radius: 8px;">
		<div style="margin-bottom: 1.5rem;">
			<label for="name" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Project Name *</label>
			<input
				id="name"
				type="text"
				bind:value={name}
				required
				placeholder="Enter your game project name"
				style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem;"
			/>
		</div>

		<div style="margin-bottom: 1.5rem;">
			<label for="description" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Description</label>
			<textarea
				id="description"
				bind:value={description}
				placeholder="Describe your game project..."
				rows="4"
				style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; resize: vertical;"
			></textarea>
		</div>

		<div style="margin-bottom: 1.5rem;">
			<label for="imageUrl" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Project Image URL</label>
			<input
				id="imageUrl"
				type="url"
				bind:value={imageUrl}
				placeholder="https://example.com/image.jpg (optional)"
				style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem;"
			/>
			{#if imageUrl}
				<div style="margin-top: 0.5rem;">
					<img 
						src={imageUrl} 
						alt="Preview" 
						style="max-width: 200px; max-height: 150px; border-radius: 4px; border: 1px solid #ddd;"
						on:error={() => error = 'Invalid image URL'}
					/>
				</div>
			{/if}
		</div>

		{#if error}
			<div style="color: red; margin-bottom: 1.5rem; padding: 0.75rem; background: #ffe6e6; border-radius: 4px;">
				{error}
			</div>
		{/if}

		<div style="display: flex; gap: 1rem;">
			<button 
				type="submit" 
				disabled={loading}
				style="flex: 1; padding: 0.75rem; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;"
			>
				{loading ? 'Creating...' : 'Create Project'}
			</button>
			
			<a 
				href="/projects"
				style="flex: 1; padding: 0.75rem; background: #f5f5f5; color: #333; border: 1px solid #ccc; border-radius: 4px; text-decoration: none; text-align: center;"
			>
				Cancel
			</a>
		</div>
	</form>
</div>
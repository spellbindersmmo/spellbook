<script lang="ts">
	import { onMount } from 'svelte'
	import { user } from '$lib/stores'
	import { getUserProjects } from '$lib/supabase'
	import { goto } from '$app/navigation'
	import type { Project } from '../../types'

	let projects: Project[] = []
	let loading = true
	let error = ''

	// Redirect if not logged in
	$: if (!$user) {
		goto('/login')
	}

	onMount(async () => {
		if (!$user) return
		
		try {
			projects = await getUserProjects()
		} catch (err) {
			error = err.message
		} finally {
			loading = false
		}
	})

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString()
	}
</script>

<svelte:head>
	<title>My Projects - Game Design Organizer</title>
</svelte:head>

<div style="max-width: 1200px; margin: 0 auto;">
	<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
		<h1>My Game Projects</h1>
		<a 
			href="/projects/new" 
			style="display: inline-block; padding: 0.75rem 1.5rem; background: #007acc; color: white; text-decoration: none; border-radius: 6px;"
		>
			+ New Project
		</a>
	</div>

	{#if loading}
		<p>Loading projects...</p>
	{:else if error}
		<div style="color: red; padding: 1rem; background: #ffe6e6; border-radius: 6px;">
			Error: {error}
		</div>
	{:else if projects.length === 0}
		<div style="text-align: center; padding: 3rem; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
			<h3>No projects yet</h3>
			<p>Create your first game project to get started!</p>
			<a 
				href="/projects/new" 
				style="display: inline-block; padding: 0.75rem 1.5rem; background: #007acc; color: white; text-decoration: none; border-radius: 6px; margin-top: 1rem;"
			>
				Create First Project
			</a>
		</div>
	{:else}
		<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
			{#each projects as project}
				<div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					{#if project.image_url}
						<img 
							src={project.image_url} 
							alt={project.name}
							style="width: 100%; height: 200px; object-fit: cover;"
						/>
					{:else}
						<div style="width: 100%; height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;">
							🎮
						</div>
					{/if}
					
					<div style="padding: 1.5rem;">
						<h3 style="margin: 0 0 0.5rem 0;">
							<a href="/projects/{project.id}" style="text-decoration: none; color: inherit;">
								{project.name}
							</a>
						</h3>
						
						{#if project.description}
							<p style="margin: 0 0 1rem 0; color: #666; line-height: 1.4;">
								{project.description}
							</p>
						{/if}
						
						<div style="font-size: 0.875rem; color: #888;">
							Updated {formatDate(project.updated_at)}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
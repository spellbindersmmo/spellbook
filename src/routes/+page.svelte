<script lang="ts">
	import { onMount } from 'svelte'
	import { user } from '$lib/stores'
	import { getUserProjects } from '$lib/supabase'
	import type { Project } from '../types'
	import ProjectSharing from '../components/ProjectSharing.svelte';

	let projects: Project[] = []
	let loading = true
	let error = ''
	let showSharingModal = false
	let selectedProject: Project | null = null

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

	// Reload projects when user signs in
	$: if ($user) {
		loadProjects()
	}

	async function loadProjects() {
		if (!$user) return
		
		loading = true
		try {
			projects = await getUserProjects()
		} catch (err) {
			error = err.message
		} finally {
			loading = false
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString()
	}
	
	function openSharing(event: Event, project: Project) {
		event.preventDefault()
		event.stopPropagation()
		selectedProject = project
		showSharingModal = true
	}
	
	function closeSharing() {
		showSharingModal = false
		selectedProject = null
	}
</script>

<svelte:head>
	<title>Game Design Organizer</title>
</svelte:head>

{#if $user}
	<div style="max-width: 1200px; margin: 0 auto;">
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
			<div>
				<h1>Welcome back!</h1>
				<p style="margin: 0; color: #666;">Choose a project to continue working, or create a new one</p>
			</div>
			<a 
				href="/projects/new" 
				style="display: inline-block; padding: 0.75rem 1.5rem; background: #007acc; color: white; text-decoration: none; border-radius: 6px;"
			>
				+ New Project
			</a>
		</div>

		{#if loading}
			<div style="text-align: center; padding: 2rem;">
				<p>Loading your projects...</p>
			</div>
		{:else if error}
			<div style="color: red; padding: 1rem; background: #ffe6e6; border-radius: 6px; margin-bottom: 2rem;">
				Error loading projects: {error}
			</div>
		{:else if projects.length === 0}
			<div style="text-align: center; padding: 3rem; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
				<div style="font-size: 3rem; margin-bottom: 1rem;">🎮</div>
				<h3>Ready to start your first game project?</h3>
				<p style="color: #666; margin-bottom: 2rem;">Organize your ideas, characters, story, and game mechanics all in one place.</p>
				<a 
					href="/projects/new" 
					style="display: inline-block; padding: 1rem 2rem; background: #007acc; color: white; text-decoration: none; border-radius: 6px; font-size: 1.1rem;"
				>
					Create Your First Project
				</a>
			</div>
		{:else}
			<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
				{#each projects as project}
					<div class="project-card-wrapper">
						<a 
							href="/projects/{project.id}"
							style="text-decoration: none; color: inherit; display: block;"
						>
							<div class="project-card">
								{#if project.image_url}
									<img 
										src={project.image_url} 
										alt={project.name}
										style="width: 100%; height: 200px; object-fit: cover;"
									/>
								{:else}
									<div style="width: 100%; height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem;">
										🎮
									</div>
								{/if}
								
								<div style="padding: 1.5rem;">
									<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
										<h3 style="margin: 0; font-size: 1.25rem; flex: 1;">
											{project.name}
										</h3>
										
										<!-- Share button - only show for project owners -->
										{#if project.user_id === $user?.id}
											<button
												class="share-btn"
												on:click={(e) => openSharing(e, project)}
												title="Share project"
											>
												👥
											</button>
										{:else}
											<!-- Indicator for shared projects -->
											<span class="shared-badge" title="Shared with you">
												📤
											</span>
										{/if}
									</div>
									
									{#if project.description}
										<p style="margin: 0 0 1rem 0; color: #666; line-height: 1.4; font-size: 0.95rem;">
											{project.description}
										</p>
									{/if}
									
									<div style="font-size: 0.875rem; color: #888;">
										Last updated {formatDate(project.updated_at)}
									</div>
								</div>
							</div>
						</a>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<div style="text-align: center; max-width: 600px; margin: 4rem auto;">
		<div style="font-size: 4rem; margin-bottom: 2rem;">🎮</div>
		<h1 style="font-size: 2.5rem; margin-bottom: 1rem;">Game Design Organizer</h1>
		<p style="font-size: 1.2rem; color: #666; margin-bottom: 3rem; line-height: 1.5;">
			The ultimate tool to organize your game ideas, characters, stories, and documentation. 
			Turn your creative vision into a structured, manageable project.
		</p>
		
		<a href="/login" style="display: inline-block; padding: 1rem 2rem; background: #007acc; color: white; text-decoration: none; border-radius: 6px; font-size: 1.1rem;">
			Get Started - Sign In
		</a>
		
		<div style="margin-top: 3rem; padding: 2rem; background: #f8f9fa; border-radius: 8px;">
			<h3 style="margin-bottom: 1rem;">Features:</h3>
			<div style="text-align: left; display: inline-block;">
				<p>📝 Document your game design ideas</p>
				<p>👥 Create detailed character profiles</p>
				<p>📖 Structure your story and narrative</p>
				<p>⚙️ Organize game mechanics and rules</p>
				<p>🗂️ Keep everything in one organized place</p>
			</div>
		</div>
	</div>
{/if}

<!-- Sharing Modal -->
{#if showSharingModal && selectedProject}
	<ProjectSharing 
		project={selectedProject}
		currentUserId={$user?.id}
		onClose={closeSharing}
	/>
{/if}

<style>
	.project-card-wrapper {
		position: relative;
	}
	
	.project-card {
		border: 1px solid #ddd;
		border-radius: 8px;
		overflow: hidden;
		background: white;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		transition: transform 0.2s, box-shadow 0.2s;
		cursor: pointer;
	}
	
	.project-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0,0,0,0.15);
	}
	
	.share-btn {
		background: rgba(0, 122, 204, 0.1);
		border: 1px solid rgba(0, 122, 204, 0.3);
		border-radius: 6px;
		padding: 0.35rem 0.6rem;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.2s;
		line-height: 1;
	}
	
	.share-btn:hover {
		background: rgba(0, 122, 204, 0.2);
		border-color: #007acc;
		transform: scale(1.05);
	}
	
	.shared-badge {
		background: rgba(107, 142, 111, 0.15);
		border: 1px solid rgba(107, 142, 111, 0.3);
		border-radius: 6px;
		padding: 0.35rem 0.6rem;
		font-size: 1rem;
		line-height: 1;
		display: inline-block;
	}
</style>
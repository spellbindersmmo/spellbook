<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { user } from '$lib/stores'
	import { getProject, supabase } from '$lib/supabase'
	import { goto } from '$app/navigation'
	import type { Project } from '../../../types'
	import GameMechanics from '../../../components/GameMechanics.svelte'

	let project: Project | null = null
	let loading = true
	let error = ''
	let activeSection = 'overview'
	let sidebarWidth = 300
	let isResizing = false
	let authChecked = false

	// Get project ID directly from page params
	$: projectId = $page.params.id

	const sections = [
		{ id: 'overview', name: 'Overview', icon: '📊' },
		{ id: 'documents', name: 'Documents', icon: '📝' },
		{ id: 'characters', name: 'Characters', icon: '👥' },
		{ id: 'story', name: 'Story & Narrative', icon: '📖' },
		{ id: 'mechanics', name: 'Game Mechanics', icon: '⚙️' },
		{ id: 'world', name: 'World & Locations', icon: '🌍' },
		{ id: 'tasks', name: 'Tasks & Progress', icon: '✅' }
	]

	onMount(async () => {
		// Check authentication status first
		const { data: { session } } = await supabase.auth.getSession()
		
		if (!session?.user) {
			goto('/login')
			return
		}

		// Update the user store if needed
		if (!$user) {
			user.set(session.user)
		}

		authChecked = true
		
		// Now load the project
		if (projectId) {
			await loadProject()
		}
	})

	// Only redirect if we've checked auth and there's definitely no user
	$: if (authChecked && !$user) {
		goto('/login')
	}

	// Load project when user is confirmed and we have a projectId
	$: if ($user && projectId && authChecked && !project && !loading) {
		loadProject()
	}

	async function loadProject() {
		if (!projectId) return
		
		loading = true
		error = ''
		
		try {
			project = await getProject(projectId)
		} catch (err) {
			console.error('Error loading project:', err)
			error = err.message || 'Failed to load project'
			
			// If project not found or access denied, go back to projects list
			if (err.message?.includes('not found') || err.code === 'PGRST116') {
				setTimeout(() => goto('/'), 2000) // Give user time to see error
			}
		} finally {
			loading = false
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString()
	}

	function handleMouseDown(event) {
		isResizing = true
		event.preventDefault()
	}

	function handleMouseMove(event) {
		if (!isResizing) return
		
		const container = document.querySelector('.main-container')
		if (!container) return
		
		const containerRect = container.getBoundingClientRect()
		const newWidth = event.clientX - containerRect.left
		
		// Set min and max widths
		if (newWidth >= 200 && newWidth <= 600) {
			sidebarWidth = newWidth
		}
	}

	function handleMouseUp() {
		isResizing = false
	}

	onMount(() => {
		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)
		
		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}
	})
</script>

<svelte:head>
	<title>{project?.name || 'Loading...'} - Game Design Organizer</title>
</svelte:head>

{#if !authChecked}
	<!-- Show loading while checking authentication -->
	<div style="display: flex; justify-content: center; align-items: center; height: 50vh;">
		<p>Checking authentication...</p>
	</div>
{:else if loading}
	<!-- Show loading while getting project -->
	<div style="display: flex; justify-content: center; align-items: center; height: 50vh;">
		<p>Loading project...</p>
	</div>
{:else if error}
	<div style="padding: 2rem;">
		<div style="color: red; padding: 1rem; background: #ffe6e6; border-radius: 6px;">
			Error: {error}
			<br><br>
			{#if error.includes('not found')}
				<p>This project doesn't exist or you don't have access to it.</p>
				<p>Redirecting to your projects in 2 seconds...</p>
			{/if}
			<a href="/" style="color: #007acc;">← Go back to projects</a>
		</div>
	</div>
{:else if project}
	<!-- Top Navigation Bar -->
	<div style="background: white; border-bottom: 1px solid #ddd; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center;">
		<div style="display: flex; align-items: center; gap: 1rem;">
			<a href="/" style="color: #007acc; text-decoration: none;">← Back to Projects</a>
			<span style="color: #ccc;">|</span>
			<h1 style="margin: 0; font-size: 1.5rem;">{project.name}</h1>
		</div>
		<button style="padding: 0.5rem 1rem; background: #f5f5f5; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
			⚙️ Project Settings
		</button>
	</div>

	<!-- Main Layout Container -->
	<div class="main-container" style="display: flex; height: calc(100vh - 120px); background: #f8f9fa;">
		<!-- Left Sidebar -->
		<div style="width: {sidebarWidth}px; background: white; border-right: 1px solid #ddd; display: flex; flex-direction: column;">
			<!-- Project Info -->
			<div style="padding: 1.5rem; border-bottom: 1px solid #eee;">
				{#if project.image_url}
					<img 
						src={project.image_url} 
						alt={project.name}
						style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 1rem;"
					/>
				{:else}
					<div style="width: 100%; height: 120px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; margin-bottom: 1rem;">
						🎮
					</div>
				{/if}
				
				{#if project.description}
					<p style="margin: 0; color: #666; font-size: 0.9rem; line-height: 1.4;">
						{project.description}
					</p>
				{/if}
			</div>

			<!-- Navigation Menu -->
			<nav style="flex: 1; padding: 1rem 0;">
				{#each sections as section}
					<button
						class="nav-item"
						class:active={activeSection === section.id}
						on:click={() => activeSection = section.id}
						style="
							width: 100%; 
							padding: 0.75rem 1.5rem; 
							border: none; 
							background: {activeSection === section.id ? '#e3f2fd' : 'transparent'};
							color: {activeSection === section.id ? '#1976d2' : '#666'};
							text-align: left; 
							cursor: pointer; 
							display: flex; 
							align-items: center; 
							gap: 0.75rem;
							font-size: 0.95rem;
							border-left: {activeSection === section.id ? '3px solid #1976d2' : '3px solid transparent'};
						"
					>
						<span style="font-size: 1.2rem;">{section.icon}</span>
						{section.name}
					</button>
				{/each}
			</nav>

			<!-- Project Stats -->
			<div style="padding: 1rem 1.5rem; border-top: 1px solid #eee; font-size: 0.8rem; color: #888;">
				<div style="margin-bottom: 0.25rem;">Created: {formatDate(project.created_at)}</div>
				<div>Updated: {formatDate(project.updated_at)}</div>
			</div>
		</div>

		<!-- Resizer -->
		<div 
			style="width: 4px; background: #ddd; cursor: col-resize; hover:background: #bbb; transition: background 0.2s;"
			on:mousedown={handleMouseDown}
			class="resizer"
		></div>

		<!-- Main Content Area -->
		<div style="flex: 1; overflow: auto;">
			{#if activeSection === 'overview'}
				<div style="padding: 2rem;">
					<h2 style="margin: 0 0 1.5rem 0;">Project Overview</h2>
					
					<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
						<div style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #ddd;">
							<h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">📝 Documents</h4>
							<p style="margin: 0; font-size: 2rem; font-weight: bold; color: #333;">0</p>
							<p style="margin: 0; font-size: 0.9rem; color: #666;">Design documents</p>
						</div>
						<div style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #ddd;">
							<h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">👥 Characters</h4>
							<p style="margin: 0; font-size: 2rem; font-weight: bold; color: #333;">0</p>
							<p style="margin: 0; font-size: 0.9rem; color: #666;">Character profiles</p>
						</div>
						<div style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #ddd;">
							<h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">✅ Tasks</h4>
							<p style="margin: 0; font-size: 2rem; font-weight: bold; color: #333;">0</p>
							<p style="margin: 0; font-size: 0.9rem; color: #666;">Completed tasks</p>
						</div>
					</div>

					<div style="background: white; padding: 2rem; border-radius: 8px; border: 1px solid #ddd;">
						<h3 style="margin: 0 0 1rem 0;">Recent Activity</h3>
						<div style="color: #666; text-align: center; padding: 2rem;">
							<p>No recent activity yet. Start by creating your first document or character!</p>
						</div>
					</div>
				</div>

			{:else if activeSection === 'documents'}
				<div style="padding: 2rem;">
					<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
						<h2 style="margin: 0;">📝 Documents</h2>
						<button style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
							+ New Document
						</button>
					</div>
					
					<div style="background: white; border-radius: 8px; border: 1px solid #ddd; min-height: 400px; display: flex; align-items: center; justify-content: center; color: #666;">
						<div style="text-align: center;">
							<div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
							<h3 style="margin: 0 0 0.5rem 0;">No documents yet</h3>
							<p style="margin: 0;">Create your first game design document to get started!</p>
						</div>
					</div>
				</div>

			{:else if activeSection === 'characters'}
				<div style="padding: 2rem;">
					<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
						<h2 style="margin: 0;">👥 Characters</h2>
						<button style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
							+ New Character
						</button>
					</div>
					
					<div style="background: white; border-radius: 8px; border: 1px solid #ddd; min-height: 400px; display: flex; align-items: center; justify-content: center; color: #666;">
						<div style="text-align: center;">
							<div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
							<h3 style="margin: 0 0 0.5rem 0;">No characters yet</h3>
							<p style="margin: 0;">Create character profiles to develop your game's cast!</p>
						</div>
					</div>
				</div>

			{:else if activeSection === 'story'}
				<div style="padding: 2rem;">
					<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
						<h2 style="margin: 0;">📖 Story & Narrative</h2>
						<button style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
							+ New Story Element
						</button>
					</div>
					
					<div style="background: white; border-radius: 8px; border: 1px solid #ddd; min-height: 400px; display: flex; align-items: center; justify-content: center; color: #666;">
						<div style="text-align: center;">
							<div style="font-size: 3rem; margin-bottom: 1rem;">📖</div>
							<h3 style="margin: 0 0 0.5rem 0;">No story elements yet</h3>
							<p style="margin: 0;">Start building your narrative structure!</p>
						</div>
					</div>
				</div>

			{:else if activeSection === 'mechanics'}
				<GameMechanics {project} />

			{:else if activeSection === 'world'}
				<div style="padding: 2rem;">
					<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
						<h2 style="margin: 0;">🌍 World & Locations</h2>
						<button style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
							+ New Location
						</button>
					</div>
					
					<div style="background: white; border-radius: 8px; border: 1px solid #ddd; min-height: 400px; display: flex; align-items: center; justify-content: center; color: #666;">
						<div style="text-align: center;">
							<div style="font-size: 3rem; margin-bottom: 1rem;">🌍</div>
							<h3 style="margin: 0 0 0.5rem 0;">No locations created yet</h3>
							<p style="margin: 0;">Build your game world and locations!</p>
						</div>
					</div>
				</div>

			{:else if activeSection === 'tasks'}
				<div style="padding: 2rem;">
					<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
						<h2 style="margin: 0;">✅ Tasks & Progress</h2>
						<button style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
							+ New Task
						</button>
					</div>
					
					<div style="background: white; border-radius: 8px; border: 1px solid #ddd; min-height: 400px; display: flex; align-items: center; justify-content: center; color: #666;">
						<div style="text-align: center;">
							<div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
							<h3 style="margin: 0 0 0.5rem 0;">No tasks yet</h3>
							<p style="margin: 0;">Track your development progress and milestones!</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div style="text-align: center; padding: 3rem;">
		<h2>Project not found</h2>
		<p>This project doesn't exist or you don't have access to it.</p>
		<a href="/" style="color: #007acc;">← Go back to projects</a>
	</div>
{/if}

<style>
	.resizer:hover {
		background: #bbb !important;
	}
	
	.nav-item:hover {
		background: #f5f5f5 !important;
	}
	
	.nav-item.active:hover {
		background: #e3f2fd !important;
	}

	.main-container {
		user-select: none; /* Prevent text selection while resizing */
	}
</style>
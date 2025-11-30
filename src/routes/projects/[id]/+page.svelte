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
	let sidebarWidth = 260
	let isResizing = false
	let authChecked = false

	$: projectId = $page.params.id

	const sections = [
		{ id: 'overview', name: 'Overview', icon: '📊', description: 'Project summary' },
		{ id: 'documents', name: 'Documents', icon: '📝', description: 'Design docs' },
		{ id: 'characters', name: 'Characters', icon: '👥', description: 'Character profiles' },
		{ id: 'story', name: 'Story', icon: '📖', description: 'Narrative elements' },
		{ id: 'mechanics', name: 'Mechanics', icon: '⚙️', description: 'Game systems' },
		{ id: 'world', name: 'World', icon: '🌍', description: 'Locations & lore' },
		{ id: 'tasks', name: 'Tasks', icon: '✅', description: 'Progress tracking' }
	]

	onMount(async () => {
		const { data: { session } } = await supabase.auth.getSession()
		
		if (!session?.user) {
			goto('/login')
			return
		}

		if (!$user) {
			user.set(session.user)
		}

		authChecked = true
		
		if (projectId) {
			await loadProject()
		}
	})

	$: if (authChecked && !$user) {
		goto('/login')
	}

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
			
			if (err.message?.includes('not found') || err.code === 'PGRST116') {
				setTimeout(() => goto('/'), 2000)
			}
		} finally {
			loading = false
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	function handleMouseDown(event) {
		isResizing = true
		event.preventDefault()
	}

	function handleMouseMove(event) {
		if (!isResizing) return
		
		const container = document.querySelector('.layout-container')
		if (!container) return
		
		const containerRect = container.getBoundingClientRect()
		const newWidth = event.clientX - containerRect.left
		
		if (newWidth >= 220 && newWidth <= 400) {
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
	<title>{project?.name || 'Loading...'} - Worldbuilding Organizer</title>
</svelte:head>

{#if !authChecked}
	<div class="loading-screen">
		<div class="spinner"></div>
		<p class="loading-text">Authenticating...</p>
	</div>
{:else if loading}
	<div class="loading-screen">
		<div class="spinner"></div>
		<p class="loading-text">Loading project...</p>
	</div>
{:else if error}
	<div class="error-screen">
		<div class="error-container">
			<div class="error-icon">⚠️</div>
			<h2 class="error-title">Unable to Load Project</h2>
			<p class="error-message">{error}</p>
			{#if error.includes('not found')}
				<p class="error-hint">Redirecting you back to projects...</p>
			{/if}
			<a href="/" class="back-link">← Return to Projects</a>
		</div>
	</div>
{:else if project}
	<!-- Header -->
	<header class="header">
		<div class="header-content">
			<div class="breadcrumb">
				<a href="/" class="breadcrumb-link">Projects</a>
				<span class="breadcrumb-separator">/</span>
				<span class="breadcrumb-current">{project.name}</span>
			</div>
			<button class="settings-btn" title="Project Settings">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="10" cy="10" r="3"/>
					<path d="M10 1v2m0 14v2M4.22 4.22l1.42 1.42m8.72 8.72l1.42 1.42M1 10h2m14 0h2M4.22 15.78l1.42-1.42m8.72-8.72l1.42-1.42"/>
				</svg>
			</button>
		</div>
	</header>

	<!-- Main Layout -->
	<div class="layout-container">
		<!-- Sidebar -->
		<aside class="sidebar" style="width: {sidebarWidth}px;">
			<!-- Project Header -->
			<div class="project-header">
				{#if project.image_url}
					<img 
						src={project.image_url} 
						alt={project.name}
						class="project-image"
					/>
				{:else}
					<div class="project-image-placeholder">
						<span class="placeholder-icon">🎮</span>
					</div>
				{/if}
				
				<h1 class="project-title">{project.name}</h1>
				
				{#if project.description}
					<p class="project-description">{project.description}</p>
				{/if}
			</div>

			<!-- Navigation -->
			<nav class="nav">
				<div class="nav-label">Sections</div>
				{#each sections as section}
					<button
						class="nav-item"
						class:active={activeSection === section.id}
						on:click={() => activeSection = section.id}
					>
						<span class="nav-icon">{section.icon}</span>
						<div class="nav-content">
							<span class="nav-name">{section.name}</span>
							<span class="nav-description">{section.description}</span>
						</div>
					</button>
				{/each}
			</nav>

			<!-- Metadata -->
			<div class="metadata">
				<div class="metadata-item">
					<span class="metadata-label">Created</span>
					<span class="metadata-value">{formatDate(project.created_at)}</span>
				</div>
				<div class="metadata-item">
					<span class="metadata-label">Updated</span>
					<span class="metadata-value">{formatDate(project.updated_at)}</span>
				</div>
			</div>
		</aside>

		<!-- Resizer -->
		<div 
			class="resizer"
			on:mousedown={handleMouseDown}
			role="separator"
			aria-label="Resize sidebar"
			tabindex="0"
		></div>

		<!-- Content -->
		<main class="content">
			{#if activeSection === 'overview'}
				<div class="section-view">
					<div class="section-header">
						<div>
							<h2 class="section-title">Overview</h2>
							<p class="section-subtitle">Project summary and recent activity</p>
						</div>
					</div>
					
					<div class="stats-grid">
						<div class="stat-card">
							<div class="stat-icon">📝</div>
							<div class="stat-content">
								<div class="stat-value">0</div>
								<div class="stat-label">Documents</div>
							</div>
						</div>
						<div class="stat-card">
							<div class="stat-icon">👥</div>
							<div class="stat-content">
								<div class="stat-value">0</div>
								<div class="stat-label">Characters</div>
							</div>
						</div>
						<div class="stat-card">
							<div class="stat-icon">✅</div>
							<div class="stat-content">
								<div class="stat-value">0</div>
								<div class="stat-label">Tasks</div>
							</div>
						</div>
					</div>

					<div class="activity-section">
						<h3 class="activity-title">Recent Activity</h3>
						<div class="empty-state">
							<div class="empty-icon">📊</div>
							<div class="empty-title">No activity yet</div>
							<p class="empty-description">Start creating documents, characters, or tasks to track your progress.</p>
						</div>
					</div>
				</div>

			{:else if activeSection === 'documents'}
				<div class="section-view">
					<div class="section-header">
						<div>
							<h2 class="section-title">Documents</h2>
							<p class="section-subtitle">Design documents and notes</p>
						</div>
						<button class="action-btn">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M8 3v10M3 8h10"/>
							</svg>
							New Document
						</button>
					</div>
					
					<div class="empty-state">
						<div class="empty-icon">📝</div>
						<div class="empty-title">No documents yet</div>
						<p class="empty-description">Create your first game design document to get started.</p>
						<button class="empty-action">Create Document</button>
					</div>
				</div>

			{:else if activeSection === 'characters'}
				<div class="section-view">
					<div class="section-header">
						<div>
							<h2 class="section-title">Characters</h2>
							<p class="section-subtitle">Character profiles and development</p>
						</div>
						<button class="action-btn">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M8 3v10M3 8h10"/>
							</svg>
							New Character
						</button>
					</div>
					
					<div class="empty-state">
						<div class="empty-icon">👥</div>
						<div class="empty-title">No characters yet</div>
						<p class="empty-description">Create character profiles to develop your game's cast.</p>
						<button class="empty-action">Create Character</button>
					</div>
				</div>

			{:else if activeSection === 'story'}
				<div class="section-view">
					<div class="section-header">
						<div>
							<h2 class="section-title">Story & Narrative</h2>
							<p class="section-subtitle">Plot, quests, and narrative structure</p>
						</div>
						<button class="action-btn">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M8 3v10M3 8h10"/>
							</svg>
							New Story Element
						</button>
					</div>
					
					<div class="empty-state">
						<div class="empty-icon">📖</div>
						<div class="empty-title">No story elements yet</div>
						<p class="empty-description">Start building your narrative structure.</p>
						<button class="empty-action">Create Story Element</button>
					</div>
				</div>

			{:else if activeSection === 'mechanics'}
				<GameMechanics {project} />

			{:else if activeSection === 'world'}
				<div class="section-view">
					<div class="section-header">
						<div>
							<h2 class="section-title">World & Locations</h2>
							<p class="section-subtitle">Locations, maps, and world-building</p>
						</div>
						<button class="action-btn">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M8 3v10M3 8h10"/>
							</svg>
							New Location
						</button>
					</div>
					
					<div class="empty-state">
						<div class="empty-icon">🌍</div>
						<div class="empty-title">No locations created yet</div>
						<p class="empty-description">Build your game world and locations.</p>
						<button class="empty-action">Create Location</button>
					</div>
				</div>

			{:else if activeSection === 'tasks'}
				<div class="section-view">
					<div class="section-header">
						<div>
							<h2 class="section-title">Tasks & Progress</h2>
							<p class="section-subtitle">Development tasks and milestones</p>
						</div>
						<button class="action-btn">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M8 3v10M3 8h10"/>
							</svg>
							New Task
						</button>
					</div>
					
					<div class="empty-state">
						<div class="empty-icon">✅</div>
						<div class="empty-title">No tasks yet</div>
						<p class="empty-description">Track your development progress and milestones.</p>
						<button class="empty-action">Create Task</button>
					</div>
				</div>
			{/if}
		</main>
	</div>
{:else}
	<div class="error-screen">
		<div class="error-container">
			<div class="error-icon">🔍</div>
			<h2 class="error-title">Project Not Found</h2>
			<p class="error-message">This project doesn't exist or you don't have access to it.</p>
			<a href="/" class="back-link">← Return to Projects</a>
		</div>
	</div>
{/if}

<style>
	/* Earthy Color Palette - Warmer & Lighter */
	:root {
		/* Warm Earth Tones */
		--earth-clay: #D4A574;
		--earth-terracotta: #E08B68;
		--earth-sand: #F2E6D8;
		--earth-sage: #9FB396;
		--earth-olive: #8A9B7A;
		--earth-moss: #7A8C6F;
		
		/* Warm Neutrals - Lighter */
		--warm-gray-50: #FAF9F7;
		--warm-gray-100: #F0EDE8;
		--warm-gray-200: #E3DFD7;
		--warm-gray-300: #C9C3B8;
		--warm-gray-400: #A39C8F;
		--warm-gray-500: #7D7669;
		--warm-gray-600: #5D574C;
		--warm-gray-700: #433F36;
		--warm-gray-800: #2F2C25;
		--warm-gray-900: #24211C;
		
		/* Semantic colors with warmer, lighter tone */
		--color-primary: #9FB396;
		--color-primary-hover: #8FA086;
		--color-primary-light: rgba(159, 179, 150, 0.15);
		
		--color-accent: #D4A574;
		--color-accent-hover: #C49565;
		
		--color-background: #2F2C25;
		--color-background-alt: #3D3932;
		--color-surface: #3D3932;
		--color-surface-elevated: #4A453D;
		
		--color-border: rgba(227, 223, 215, 0.12);
		--color-border-hover: rgba(227, 223, 215, 0.24);
		
		--color-text-primary: #F0EDE8;
		--color-text-secondary: #C9C3B8;
		--color-text-tertiary: #A39C8F;
		
		--color-error: #E08B68;
		--color-error-light: rgba(224, 139, 104, 0.15);
		
		--color-success: #9FB396;
		
		/* Warmer shadows */
		--shadow-sm: 0 1px 2px 0 rgba(36, 33, 28, 0.2);
		--shadow-md: 0 4px 6px -1px rgba(36, 33, 28, 0.3);
		--shadow-lg: 0 10px 15px -3px rgba(36, 33, 28, 0.4);
	}

	/* Reset & Base */
	* {
		box-sizing: border-box;
	}

	/* Loading Screen */
	.loading-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		gap: 1.5rem;
		background: var(--color-background);
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 3px solid rgba(159, 179, 150, 0.2);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		box-shadow: 0 0 20px rgba(159, 179, 150, 0.3);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.loading-text {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0;
	}

	/* Error Screen */
	.error-screen {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
		background: var(--color-background);
	}

	.error-container {
		max-width: 480px;
		text-align: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 3rem 2rem;
	}

	.error-icon {
		font-size: 4rem;
		margin-bottom: 1.5rem;
		opacity: 0.6;
		filter: saturate(1.2);
	}

	.error-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem 0;
	}

	.error-message {
		color: var(--color-error);
		font-size: 0.9375rem;
		line-height: 1.5;
		margin: 0 0 0.5rem 0;
	}

	.error-hint {
		color: var(--color-text-tertiary);
		font-size: 0.875rem;
		margin: 0 0 2rem 0;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: var(--color-primary);
		color: white;
		text-decoration: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.15s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.back-link:hover {
		background: var(--color-primary-hover);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		transform: translateY(-1px);
	}

	/* Header */
	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		height: 60px;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 100%;
		padding: 0 1.5rem;
		max-width: 100%;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.breadcrumb-link {
		color: var(--color-text-tertiary);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.breadcrumb-link:hover {
		color: var(--color-accent);
	}

	.breadcrumb-separator {
		color: var(--color-text-tertiary);
		opacity: 0.5;
	}

	.breadcrumb-current {
		color: var(--color-text-primary);
		font-weight: 500;
	}

	.settings-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.settings-btn:hover {
		background: var(--color-surface-elevated);
		color: var(--color-accent);
		border-color: var(--color-border-hover);
	}

	/* Layout */
	.layout-container {
		display: flex;
		height: calc(100vh - 60px);
		background: var(--color-background);
	}

	/* Sidebar */
	.sidebar {
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		overflow-y: auto;
		flex-shrink: 0;
	}

	.project-header {
		padding: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.project-image,
	.project-image-placeholder {
		width: 100%;
		aspect-ratio: 16/9;
		object-fit: cover;
		border-radius: 8px;
		margin-bottom: 1rem;
		background: var(--color-background-alt);
	}

	.project-image-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.placeholder-icon {
		font-size: 3rem;
		opacity: 0.3;
	}

	.project-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
		line-height: 1.3;
	}

	.project-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
		margin: 0;
	}

	/* Navigation */
	.nav {
		flex: 1;
		padding: 1rem 0.75rem;
		overflow-y: auto;
	}

	.nav-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0 0.75rem 0.5rem;
		margin-bottom: 0.25rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		margin-bottom: 0.125rem;
		text-align: left;
	}

	.nav-item:hover {
		background: var(--color-background-alt);
		color: var(--color-text-primary);
	}

	.nav-item.active {
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--earth-moss) 100%);
		color: white;
		box-shadow: 0 2px 8px rgba(159, 179, 150, 0.4);
	}

	.nav-item.active .nav-description {
		color: rgba(255, 255, 255, 0.8);
	}

	.nav-icon {
		font-size: 1.125rem;
		flex-shrink: 0;
		width: 24px;
		text-align: center;
	}

	.nav-content {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		flex: 1;
		min-width: 0;
	}

	.nav-name {
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.nav-description {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Metadata */
	.metadata {
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--color-border);
		background: var(--color-background-alt);
	}

	.metadata-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		margin-bottom: 0.5rem;
	}

	.metadata-item:last-child {
		margin-bottom: 0;
	}

	.metadata-label {
		font-weight: 500;
	}

	.metadata-value {
		color: var(--color-text-secondary);
	}

	/* Resizer */
	.resizer {
		width: 4px;
		background: transparent;
		cursor: col-resize;
		flex-shrink: 0;
		position: relative;
	}

	.resizer::after {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 1px;
		height: 100%;
		background: var(--color-border);
	}

	.resizer:hover::after {
		background: var(--color-accent);
		box-shadow: 0 0 8px rgba(212, 165, 116, 0.6);
	}

	/* Content */
	.content {
		flex: 1;
		overflow-y: auto;
		background: var(--color-background);
	}

	.section-view {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.section-title {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem 0;
		line-height: 1.3;
	}

	.section-subtitle {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.125rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.action-btn:hover {
		background: var(--color-primary-hover);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		transform: translateY(-1px);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.stat-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.stat-card:hover {
		border-color: var(--color-border-hover);
		box-shadow: var(--shadow-sm);
		transform: translateY(-2px);
	}

	.stat-card:hover::before {
		opacity: 1;
	}

	.stat-icon {
		font-size: 2rem;
		opacity: 0.8;
		filter: saturate(1.2);
	}

	.stat-content {
		flex: 1;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-text-primary);
		line-height: 1.2;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	/* Activity Section */
	.activity-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: var(--shadow-sm);
	}

	.activity-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1.5rem 0;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		border-radius: 8px;
		background: linear-gradient(135deg, rgba(159, 179, 150, 0.05) 0%, rgba(212, 165, 116, 0.05) 100%);
	}

	.empty-icon {
		font-size: 3.5rem;
		opacity: 0.4;
		margin-bottom: 1rem;
		filter: saturate(1.3) brightness(1.1);
	}

	.empty-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.5rem;
	}

	.empty-description {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
		margin-bottom: 1.5rem;
		max-width: 400px;
		margin-left: auto;
		margin-right: auto;
	}

	.empty-action {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.empty-action:hover {
		background: var(--color-primary-hover);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		transform: translateY(-1px);
	}

	/* Scrollbar Styling */
	.sidebar::-webkit-scrollbar,
	.content::-webkit-scrollbar,
	.nav::-webkit-scrollbar {
		width: 8px;
	}

	.sidebar::-webkit-scrollbar-track,
	.content::-webkit-scrollbar-track,
	.nav::-webkit-scrollbar-track {
		background: transparent;
	}

	.sidebar::-webkit-scrollbar-thumb,
	.content::-webkit-scrollbar-thumb,
	.nav::-webkit-scrollbar-thumb {
		background: rgba(159, 179, 150, 0.25);
		border-radius: 4px;
	}

	.sidebar::-webkit-scrollbar-thumb:hover,
	.content::-webkit-scrollbar-thumb:hover,
	.nav::-webkit-scrollbar-thumb:hover {
		background: rgba(159, 179, 150, 0.35);
	}
</style>
<script lang="ts">
	import { page } from '$app/stores';
	
	function reloadPage() {
		window.location.reload();
	}
</script>

<div style="text-align: center; padding: 3rem; max-width: 600px; margin: 0 auto;">
	<h1>Oops! Something went wrong</h1>
	<p style="color: #666; margin: 1rem 0;">
		{$page.error?.message || 'An unexpected error occurred while loading this project.'}
	</p>
	
	<div style="margin-top: 2rem;">
		<a 
			href="/" 
			style="display: inline-block; padding: 0.75rem 1.5rem; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin-right: 1rem;"
		>
			← Back to Projects
		</a>
		
		<button 
			on:click={reloadPage}
			style="padding: 0.75rem 1.5rem; background: #f5f5f5; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;"
		>
			Try Again
		</button>
	</div>
</div>
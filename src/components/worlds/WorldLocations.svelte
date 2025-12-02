<script>
  import { onMount } from 'svelte';
  import WorldGraph3D from './WorldGraph3D.svelte';
  import WorldCanvas from './WorldCanvas.svelte';
  import { supabase } from '$lib/supabase';
  
  export let project;
  
  let worldView = 'graph'; // 'graph' or 'list'
  let worlds = [];
  let loadingWorlds = true;
  let selectedWorld = null;
  let configuringLayout = false; // For the dedicated configuration panel
  let viewingCanvas = null; // World whose canvas is being viewed
  
  onMount(async () => {
    await loadWorlds();
  });
  
  async function loadWorlds() {
    loadingWorlds = true;
    
    // Load worlds from Supabase
    const { data, error } = await supabase
      .from('worlds')
      .select('*')
      .eq('project_id', project.id)
      .order('name');
    
    if (error) {
      console.error('Error loading worlds:', error);
      loadingWorlds = false;
      return;
    }
    
    worlds = data || [];
    loadingWorlds = false;
  }
  
  function handleWorldClick(world) {
    console.log('World clicked:', world);
    viewingCanvas = world;
    console.log('viewingCanvas is now:', viewingCanvas);
    console.log('Should show WorldCanvas component');
  }
  
  function closeModal() {
    selectedWorld = null;
  }
  
  function openWorldDetails(world) {
    selectedWorld = world;
  }
  
  async function addNewWorld() {
    // Create a new world with default values
    const newWorld = {
      project_id: project.id,
      name: `New World ${worlds.length + 1}`,
      description: 'A newly created location',
      x: Math.random() * 10 - 5,
      y: Math.random() * 10 - 5,
      z: Math.random() * 10 - 5,
      connections: []
    };
    
    // Add to Supabase
    const { data, error } = await supabase
      .from('worlds')
      .insert(newWorld)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating world:', error);
      return;
    }
    
    worlds = [...worlds, data];
  }
  
  async function deleteWorldFromConfig(worldId) {
    if (!confirm('Are you sure you want to delete this world?')) {
      return;
    }
    
    // Delete from Supabase
    const { error } = await supabase
      .from('worlds')
      .delete()
      .eq('id', worldId);
    
    if (error) {
      console.error('Error deleting world:', error);
      return;
    }
    
    // Remove the world
    worlds = worlds.filter(w => w.id !== worldId);
    
    // Remove this world from all connections
    worlds = worlds.map(w => ({
      ...w,
      connections: w.connections?.filter(id => id !== worldId) || []
    }));
  }
  
  async function saveLayoutConfiguration() {
    // Save all worlds to Supabase in batch
    const updates = worlds.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      x: w.x,
      y: w.y,
      z: w.z,
      connections: w.connections || [],
      project_id: project.id
    }));
    
    const { error } = await supabase
      .from('worlds')
      .upsert(updates);
    
    if (error) {
      console.error('Error saving layout:', error);
      return;
    }
    
    console.log('Saved layout configuration');
    configuringLayout = false;
    
    // Force re-render of the graph
    worlds = [...worlds];
  }
  
  async function createNewWorld() {
    addNewWorld();
    configuringLayout = true;
  }

</script>

<div class="section-view">
  <div class="section-header">
    <div>
      <h2 class="section-title">World & Locations</h2>
      <p class="section-subtitle">Locations, maps, and world-building</p>
    </div>
    <div class="header-actions">
      {#if worlds.length > 0}
        <div class="view-toggle">
          <button 
            class="toggle-btn" 
            class:active={worldView === 'graph'}
            on:click={() => worldView = 'graph'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="4" cy="4" r="2"/>
              <circle cx="12" cy="4" r="2"/>
              <circle cx="8" cy="12" r="2"/>
              <path d="M5.5 5l5 6M10.5 5l-5 6"/>
            </svg>
            Graph
          </button>
          <button 
            class="toggle-btn" 
            class:active={worldView === 'list'}
            on:click={() => worldView = 'list'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 4h10M3 8h10M3 12h10"/>
            </svg>
            List
          </button>
        </div>
        <button class="secondary-btn" on:click={() => configuringLayout = true}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="8" cy="8" r="3"/>
            <path d="M8 1v2M8 13v2M15 8h-2M3 8H1"/>
            <path d="M13 3l-1.5 1.5M4.5 11.5L3 13M13 13l-1.5-1.5M4.5 4.5L3 3"/>
          </svg>
          Configure Layout
        </button>
      {/if}
      <button class="action-btn" on:click={createNewWorld}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v10M3 8h10"/>
        </svg>
        New Location
      </button>
    </div>
  </div>
  
  {#if loadingWorlds}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading worlds...</p>
    </div>
  {:else if worlds.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🌍</div>
      <div class="empty-title">No locations created yet</div>
      <p class="empty-description">Build your game world and locations.</p>
      <button class="empty-action" on:click={createNewWorld}>Create Location</button>
    </div>
  {:else if worldView === 'graph'}
    <div class="graph-container">
      <WorldGraph3D {worlds} onWorldClick={handleWorldClick} />
    </div>
  {:else}
    <div class="list-view">
      {#each worlds as world}
        <div class="world-card" on:click={() => handleWorldClick(world)}>
          <div class="world-info">
            <h3>{world.name}</h3>
            <p>{world.description || 'No description'}</p>
            {#if world.connections && world.connections.length > 0}
              <div class="connections">
                <span class="connections-badge">
                  {world.connections.length} connection{world.connections.length !== 1 ? 's' : ''}
                </span>
              </div>
            {/if}
          </div>
          <button class="card-action">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 4l4 4-4 4"/>
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if viewingCanvas}
  <WorldCanvas 
    world={viewingCanvas} 
    onClose={() => viewingCanvas = null}
  />
{/if}

{#if selectedWorld}
  <div class="modal-overlay" on:click={closeModal}>
    <div class="modal-content" on:click|stopPropagation>
      <button class="close-btn" on:click={closeModal}>×</button>
      
      <h2 class="modal-title">{selectedWorld.name}</h2>
      <p class="modal-description">{selectedWorld.description || 'No description'}</p>
      
      {#if selectedWorld.connections && selectedWorld.connections.length > 0}
        <div class="modal-section">
          <h3 class="modal-section-title">Connected Locations</h3>
          <div class="connected-worlds">
            {#each selectedWorld.connections as connId}
              {@const connectedWorld = worlds.find(w => w.id === connId)}
              {#if connectedWorld}
                <button class="connected-world" on:click={() => handleWorldClick(connectedWorld)}>
                  {connectedWorld.name}
                </button>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
      
      <div class="modal-actions">
        <button class="secondary-btn" on:click={closeModal}>
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

{#if configuringLayout}
  <div class="config-side-panel">
    <div class="config-panel-header">
      <div>
        <h2 class="config-title">Configure Layout</h2>
        <p class="config-subtitle">Adjust positions and connections</p>
      </div>
      <button class="close-btn" on:click={() => configuringLayout = false}>×</button>
    </div>
    
    <div class="config-panel-content">
      <button class="add-world-btn" on:click={addNewWorld}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v10M3 8h10"/>
        </svg>
        Add New World
      </button>
      
      <div class="worlds-config-list">
        {#each worlds as world, index}
          <div class="world-config-card">
            <div class="world-config-header">
              <h3 class="world-config-name">{world.name}</h3>
              <div class="world-header-actions">
                <span class="world-id">ID: {world.id}</span>
                <button 
                  class="delete-world-btn" 
                  on:click={() => deleteWorldFromConfig(world.id)}
                  title="Delete world"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l1 9a1 1 0 001 1h4a1 1 0 001-1l1-9"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="config-section">
              <h4 class="config-section-label">Details</h4>
              <div class="detail-inputs">
                <div class="detail-field">
                  <label>Name</label>
                  <input 
                    type="text" 
                    bind:value={world.name}
                    class="detail-input"
                    placeholder="World name..."
                  />
                </div>
                <div class="detail-field">
                  <label>Description</label>
                  <textarea 
                    bind:value={world.description}
                    class="detail-textarea"
                    placeholder="Brief description..."
                    rows="2"
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div class="config-section">
              <h4 class="config-section-label">3D Position</h4>
              <div class="position-controls">
                <div class="position-control">
                  <div class="position-control-header">
                    <label>
                      <span class="axis-label x-axis">X</span>
                      Left ↔ Right
                    </label>
                    <input 
                      type="number" 
                      step="0.5" 
                      bind:value={world.x}
                      class="position-number-input"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="-10" 
                    max="10" 
                    step="0.5" 
                    bind:value={world.x}
                    class="position-slider"
                  />
                </div>
                
                <div class="position-control">
                  <div class="position-control-header">
                    <label>
                      <span class="axis-label y-axis">Y</span>
                      Down ↔ Up
                    </label>
                    <input 
                      type="number" 
                      step="0.5" 
                      bind:value={world.y}
                      class="position-number-input"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="-10" 
                    max="10" 
                    step="0.5" 
                    bind:value={world.y}
                    class="position-slider"
                  />
                </div>
                
                <div class="position-control">
                  <div class="position-control-header">
                    <label>
                      <span class="axis-label z-axis">Z</span>
                      Back ↔ Forward
                    </label>
                    <input 
                      type="number" 
                      step="0.5" 
                      bind:value={world.z}
                      class="position-number-input"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="-10" 
                    max="10" 
                    step="0.5" 
                    bind:value={world.z}
                    class="position-slider"
                  />
                </div>
              </div>
            </div>
            
            <div class="config-section">
              <h4 class="config-section-label">
                Connections
                <span class="connection-count">
                  {world.connections?.length || 0}
                </span>
              </h4>
              <div class="connections-list">
                {#each worlds.filter(w => w.id !== world.id) as otherWorld}
                  <label class="connection-item">
                    <input 
                      type="checkbox" 
                      checked={world.connections?.includes(otherWorld.id)}
                      on:change={(e) => {
                        if (e.target.checked) {
                          world.connections = [...(world.connections || []), otherWorld.id];
                        } else {
                          world.connections = world.connections.filter(id => id !== otherWorld.id);
                        }
                        // Force reactivity
                        worlds = worlds;
                      }}
                    />
                    <span>{otherWorld.name}</span>
                  </label>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <div class="config-panel-footer">
      <button class="secondary-btn" on:click={() => configuringLayout = false}>
        Cancel
      </button>
      <button class="primary-btn" on:click={saveLayoutConfiguration}>
        Save Changes
      </button>
    </div>
  </div>
{/if}

<style>
  .section-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    padding: 0 4px;
  }
  
  .section-title {
    font-size: 24px;
    font-weight: 700;
    color: #e8dcc8;
    margin: 0 0 4px 0;
  }
  
  .section-subtitle {
    font-size: 14px;
    color: #a0a0a0;
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .view-toggle {
    display: flex;
    gap: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 4px;
  }
  
  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: transparent;
    border: none;
    color: #a0a0a0;
    font-size: 13px;
    font-weight: 500;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .toggle-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #e0e0e0;
  }
  
  .toggle-btn.active {
    background: #6b8e6f;
    color: white;
  }
  
  .toggle-btn svg {
    width: 16px;
    height: 16px;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #6b8e6f;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .action-btn:hover {
    background: #5a7a5e;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(107, 142, 111, 0.3);
  }
  
  .edit-mode-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: transparent;
    color: #a0a0a0;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .edit-mode-btn:hover {
    background: rgba(107, 142, 111, 0.1);
    border-color: #6b8e6f;
    color: #6b8e6f;
  }
  
  .edit-mode-btn.active {
    background: #6b8e6f;
    color: white;
    border-color: #6b8e6f;
  }
  
  .edit-mode-btn.active:hover {
    background: #5a7a5e;
  }
  
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    gap: 16px;
    color: #a0a0a0;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(107, 142, 111, 0.2);
    border-top: 3px solid #6b8e6f;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    text-align: center;
  }
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .empty-title {
    font-size: 20px;
    font-weight: 600;
    color: #e8dcc8;
    margin-bottom: 8px;
  }
  
  .empty-description {
    font-size: 14px;
    color: #a0a0a0;
    margin-bottom: 24px;
  }
  
  .empty-action {
    padding: 10px 24px;
    background: #6b8e6f;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .empty-action:hover {
    background: #5a7a5e;
    transform: translateY(-1px);
  }
  
  .graph-container {
    flex: 1;
    min-height: 500px;
    border-radius: 8px;
    overflow: hidden;
    background: #2a2a2a;
  }
  
  .list-view {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 4px;
    overflow-y: auto;
  }
  
  .world-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .world-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: #6b8e6f;
    transform: translateX(4px);
  }
  
  .world-info h3 {
    color: #e8dcc8;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 4px 0;
  }
  
  .world-info p {
    color: #a0a0a0;
    font-size: 14px;
    margin: 0 0 8px 0;
  }
  
  .connections {
    display: flex;
    gap: 6px;
  }
  
  .connections-badge {
    display: inline-block;
    padding: 2px 8px;
    background: rgba(107, 142, 111, 0.2);
    border: 1px solid rgba(107, 142, 111, 0.3);
    border-radius: 4px;
    color: #8fae92;
    font-size: 12px;
    font-weight: 500;
  }
  
  .card-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #a0a0a0;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .card-action:hover {
    background: rgba(107, 142, 111, 0.1);
    border-color: #6b8e6f;
    color: #6b8e6f;
  }
  
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }
  
  .modal-content {
    background: #2a2a2a;
    border: 2px solid #6b8e6f;
    border-radius: 12px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }
  
  .edit-panel {
    max-width: 600px;
  }
  
  .close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 32px;
    color: #e8dcc8;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background: rgba(107, 142, 111, 0.2);
    color: #6b8e6f;
  }
  
  .modal-title {
    color: #6b8e6f;
    font-size: 28px;
    margin: 0 0 16px 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .modal-description {
    color: #e8dcc8;
    line-height: 1.6;
    margin-bottom: 24px;
    font-size: 16px;
  }
  
  .modal-section {
    margin-bottom: 24px;
  }
  
  .modal-section-title {
    color: #a8896c;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 12px 0;
  }
  
  .position-inputs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 8px;
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .input-group label {
    color: #a0a0a0;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .position-input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 8px 12px;
    color: #e8dcc8;
    font-size: 16px;
    font-family: 'Inter', -apple-system, sans-serif;
    transition: all 0.2s;
  }
  
  .position-input:focus {
    outline: none;
    border-color: #6b8e6f;
    background: rgba(255, 255, 255, 0.08);
  }
  
  .hint {
    color: #6b8e6f;
    font-size: 13px;
    margin: 0;
    font-style: italic;
  }
  
  .connections-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
    padding: 4px;
  }
  
  .connection-checkbox {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .connection-checkbox:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(107, 142, 111, 0.3);
  }
  
  .connection-checkbox input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #6b8e6f;
  }
  
  .connection-checkbox span {
    color: #e8dcc8;
    font-size: 14px;
    flex: 1;
  }
  
  .connected-worlds {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .connected-world {
    padding: 6px 12px;
    background: rgba(107, 142, 111, 0.1);
    border: 1px solid rgba(107, 142, 111, 0.3);
    border-radius: 6px;
    color: #8fae92;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .connected-world:hover {
    background: rgba(107, 142, 111, 0.2);
    border-color: #6b8e6f;
    color: #6b8e6f;
  }
  
  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }
  
  .primary-btn, .secondary-btn, .danger-btn {
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .primary-btn {
    background: #6b8e6f;
    color: #fff;
    flex: 1;
  }
  
  .primary-btn:hover {
    background: #5a7a5e;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(107, 142, 111, 0.3);
  }
  
  .secondary-btn {
    background: transparent;
    color: #e8dcc8;
    border: 1px solid #6b8e6f;
    flex: 1;
  }
  
  .secondary-btn:hover {
    background: rgba(107, 142, 111, 0.1);
  }
  
  .danger-btn {
    background: transparent;
    color: #d66e6e;
    border: 1px solid #d66e6e;
  }
  
  .danger-btn:hover {
    background: rgba(214, 110, 110, 0.1);
  }
  
  /* Configuration Side Panel */
  .config-side-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: #1a1a1a;
    border-left: 2px solid #6b8e6f;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
  
  .config-panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .config-title {
    color: #6b8e6f;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 4px 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .config-subtitle {
    color: #a0a0a0;
    font-size: 13px;
    margin: 0;
  }
  
  .config-panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  
  .add-world-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: rgba(107, 142, 111, 0.15);
    border: 1px dashed #6b8e6f;
    border-radius: 8px;
    color: #6b8e6f;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 16px;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .add-world-btn:hover {
    background: rgba(107, 142, 111, 0.25);
    border-color: #8fae92;
    color: #8fae92;
  }
  
  .add-world-btn svg {
    width: 16px;
    height: 16px;
  }
  
  .worlds-config-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .world-config-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s;
  }
  
  .world-config-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(107, 142, 111, 0.3);
  }
  
  .world-config-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  
  .world-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .world-config-name {
    color: #e8dcc8;
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }
  
  .world-id {
    color: #6b8e6f;
    font-size: 11px;
    font-weight: 500;
    background: rgba(107, 142, 111, 0.15);
    padding: 2px 8px;
    border-radius: 4px;
  }
  
  .delete-world-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: 1px solid rgba(214, 110, 110, 0.3);
    border-radius: 4px;
    color: #d66e6e;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .delete-world-btn:hover {
    background: rgba(214, 110, 110, 0.15);
    border-color: #d66e6e;
    transform: scale(1.1);
  }
  
  .delete-world-btn svg {
    width: 14px;
    height: 14px;
  }
  
  .config-section {
    margin-bottom: 12px;
  }
  
  .config-section:last-child {
    margin-bottom: 0;
  }
  
  .config-section-label {
    color: #a8896c;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .detail-inputs {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .detail-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .detail-field label {
    color: #a0a0a0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .detail-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 8px 10px;
    color: #e8dcc8;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    transition: all 0.2s;
  }
  
  .detail-input:focus {
    outline: none;
    border-color: #6b8e6f;
    background: rgba(255, 255, 255, 0.08);
  }
  
  .detail-textarea {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 8px 10px;
    color: #e8dcc8;
    font-size: 13px;
    line-height: 1.4;
    font-family: 'Inter', -apple-system, sans-serif;
    resize: vertical;
    transition: all 0.2s;
  }
  
  .detail-textarea:focus {
    outline: none;
    border-color: #6b8e6f;
    background: rgba(255, 255, 255, 0.08);
  }
  
  .connection-count {
    color: #6b8e6f;
    font-size: 10px;
    background: rgba(107, 142, 111, 0.15);
    padding: 2px 6px;
    border-radius: 3px;
  }
  
  .position-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .position-control {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .position-control-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .position-control-header label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #a0a0a0;
    font-size: 11px;
    font-weight: 500;
  }
  
  .axis-label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 11px;
  }
  
  .x-axis {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  .y-axis {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }
  
  .z-axis {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  
  .position-number-input {
    width: 60px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 4px 6px;
    color: #e8dcc8;
    font-size: 12px;
    text-align: center;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .position-number-input:focus {
    outline: none;
    border-color: #6b8e6f;
    background: rgba(255, 255, 255, 0.08);
  }
  
  .position-slider {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
  }
  
  .position-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #6b8e6f;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .position-slider::-webkit-slider-thumb:hover {
    background: #8fae92;
    transform: scale(1.2);
  }
  
  .position-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #6b8e6f;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .position-slider::-moz-range-thumb:hover {
    background: #8fae92;
    transform: scale(1.2);
  }
  
  .position-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .position-field label {
    color: #a0a0a0;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .connections-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 150px;
    overflow-y: auto;
  }
  
  .connection-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .connection-item:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(107, 142, 111, 0.3);
  }
  
  .connection-item input[type="checkbox"] {
    width: 14px;
    height: 14px;
    cursor: pointer;
    accent-color: #6b8e6f;
  }
  
  .connection-item span {
    color: #e8dcc8;
    font-size: 12px;
  }
  
  .config-panel-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.3);
  }
</style>
<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  
  export let world;
  export let onClose;
  
  // View state: 'locations' or 'canvas'
  let currentView = 'locations';
  let selectedLocation = null;
  
  // Locations within this world
  let locations = [];
  let showAddLocationModal = false;
  let newLocationName = '';
  let newLocationDescription = '';
  
  // Canvas state (for when viewing a location's canvas)
  let canvasContainer;
  let canvasTransform = { x: 0, y: 0, scale: 1 };
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let lastPanPosition = { x: 0, y: 0 };
  
  // Blocks on the canvas
  let blocks = [];
  
  // Selected block for editing
  let selectedBlock = null;
  let draggingBlock = null;
  let dragOffset = { x: 0, y: 0 };
  
  // Add block menu
  let showAddMenu = false;
  let addMenuPosition = { x: 0, y: 0 };
  
  // Block types
  const blockTypes = [
    { type: 'text', label: 'Text Block', icon: '📝' },
    { type: 'heading', label: 'Heading', icon: '📌' },
    { type: 'image', label: 'Image', icon: '🖼️' },
    { type: 'note', label: 'Note', icon: '📋' },
    { type: 'reference', label: 'Reference', icon: '🔗' },
  ];
  
  onMount(() => {
    loadLocations();
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (currentView === 'canvas') {
          currentView = 'locations';
          selectedLocation = null;
        } else {
          selectedBlock = null;
          showAddMenu = false;
          showAddLocationModal = false;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
  
  async function loadLocations() {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('world_id', world.id)
      .order('name');
    
    if (error) {
      console.error('Error loading locations:', error);
      return;
    }
    
    locations = data || [];
  }
  
  function openAddLocationModal() {
    showAddLocationModal = true;
    newLocationName = '';
    newLocationDescription = '';
  }
  
  async function createLocation() {
    if (!newLocationName.trim()) return;
    
    const location = {
      name: newLocationName,
      description: newLocationDescription,
      world_id: world.id
    };
    
    const { data, error } = await supabase
      .from('locations')
      .insert(location)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating location:', error);
      return;
    }
    
    locations = [...locations, data];
    showAddLocationModal = false;
  }
  
  async function deleteLocation(locationId) {
    if (!confirm('Delete this location? All its canvas content will be lost.')) return;
    
    // Delete from Supabase (cascade will delete blocks too)
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locationId);
    
    if (error) {
      console.error('Error deleting location:', error);
      return;
    }
    
    locations = locations.filter(l => l.id !== locationId);
  }
  
  function openLocationCanvas(location) {
    selectedLocation = location;
    currentView = 'canvas';
    loadBlocks(location.id);
  }
  
  function openWorldCanvas() {
    selectedLocation = { id: 'world', name: world.name, description: 'World-level canvas' };
    currentView = 'canvas';
    loadBlocks('world');
  }
  
  function backToLocations() {
    currentView = 'locations';
    selectedLocation = null;
    blocks = [];
  }
  
  async function loadBlocks(locationId) {
    const { data, error } = await supabase
      .from('location_blocks')
      .select('*')
      .eq('location_id', locationId.toString())
      .eq('world_id', world.id)
      .order('y')
      .order('x');
    
    if (error) {
      console.error('Error loading blocks:', error);
      return;
    }
    
    blocks = data || [];
    
    // If no blocks exist, create default ones
    if (blocks.length === 0) {
      const isWorld = locationId === 'world';
      const defaultBlocks = [
        {
          location_id: locationId.toString(),
          world_id: world.id,
          type: 'heading',
          content: isWorld ? world.name : selectedLocation.name,
          x: 100,
          y: 100,
          width: 300,
          height: 60,
          relationships: []
        },
        {
          location_id: locationId.toString(),
          world_id: world.id,
          type: 'text',
          content: isWorld ? (world.description || 'Add description here...') : (selectedLocation.description || 'Add description here...'),
          x: 100,
          y: 180,
          width: 300,
          height: 150,
          relationships: []
        }
      ];
      
      const { data: inserted, error: insertError } = await supabase
        .from('location_blocks')
        .insert(defaultBlocks)
        .select();
      
      if (!insertError) {
        blocks = inserted || [];
      }
    }
  }
  
  function handleWheel(e) {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      const rect = canvasContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const delta = -e.deltaY * 0.001;
      const newScale = Math.min(Math.max(0.1, canvasTransform.scale + delta), 3);
      
      const scaleDiff = newScale - canvasTransform.scale;
      canvasTransform.x -= (mouseX - canvasTransform.x) * scaleDiff / canvasTransform.scale;
      canvasTransform.y -= (mouseY - canvasTransform.y) * scaleDiff / canvasTransform.scale;
      canvasTransform.scale = newScale;
    } else {
      canvasTransform.x -= e.deltaX;
      canvasTransform.y -= e.deltaY;
    }
    
    canvasTransform = { ...canvasTransform };
  }
  
  function handleMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.target === canvasContainer)) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      lastPanPosition = { x: canvasTransform.x, y: canvasTransform.y };
      e.preventDefault();
    }
  }
  
  function handleMouseMove(e) {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      canvasTransform.x = lastPanPosition.x + dx;
      canvasTransform.y = lastPanPosition.y + dy;
      canvasTransform = { ...canvasTransform };
    } else if (draggingBlock) {
      const rect = canvasContainer.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - canvasTransform.x) / canvasTransform.scale;
      const canvasY = (e.clientY - rect.top - canvasTransform.y) / canvasTransform.scale;
      
      draggingBlock.x = canvasX - dragOffset.x;
      draggingBlock.y = canvasY - dragOffset.y;
      blocks = [...blocks];
    }
  }
  
  function handleMouseUp() {
    if (draggingBlock) {
      // Save position to Supabase
      const block = draggingBlock;
      supabase
        .from('location_blocks')
        .update({ x: block.x, y: block.y })
        .eq('id', block.id)
        .then(({ error }) => {
          if (error) console.error('Error saving block position:', error);
        });
    }
    
    isPanning = false;
    draggingBlock = null;
  }
  
  function handleBlockMouseDown(e, block) {
    if (e.button === 0) {
      e.stopPropagation();
      selectedBlock = block;
      draggingBlock = block;
      
      const rect = canvasContainer.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - canvasTransform.x) / canvasTransform.scale;
      const canvasY = (e.clientY - rect.top - canvasTransform.y) / canvasTransform.scale;
      
      dragOffset = {
        x: canvasX - block.x,
        y: canvasY - block.y
      };
    }
  }
  
  function handleCanvasContextMenu(e) {
    e.preventDefault();
    const rect = canvasContainer.getBoundingClientRect();
    addMenuPosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    showAddMenu = true;
  }
  
  async function addBlock(type) {
    const rect = canvasContainer.getBoundingClientRect();
    const canvasX = (addMenuPosition.x - canvasTransform.x) / canvasTransform.scale;
    const canvasY = (addMenuPosition.y - canvasTransform.y) / canvasTransform.scale;
    
    const newBlock = {
      location_id: selectedLocation.id.toString(),
      world_id: world.id,
      type: type,
      content: type === 'heading' ? 'New Heading' : type === 'image' ? '' : 'Double-click to edit...',
      x: canvasX,
      y: canvasY,
      width: type === 'heading' ? 300 : 250,
      height: type === 'heading' ? 60 : type === 'image' ? 200 : 150,
      relationships: []
    };
    
    const { data, error } = await supabase
      .from('location_blocks')
      .insert(newBlock)
      .select()
      .single();
    
    if (error) {
      console.error('Error adding block:', error);
      return;
    }
    
    blocks = [...blocks, data];
    selectedBlock = data;
    showAddMenu = false;
  }
  
  async function updateBlockContent(block, newContent) {
    block.content = newContent;
    blocks = [...blocks];
    
    // Debounce the save to avoid too many requests
    clearTimeout(block._saveTimeout);
    block._saveTimeout = setTimeout(async () => {
      const { error } = await supabase
        .from('location_blocks')
        .update({ content: newContent })
        .eq('id', block.id);
      
      if (error) {
        console.error('Error updating block:', error);
      }
    }, 1000);
  }
  
  async function deleteBlock(block) {
    if (!confirm('Delete this block?')) return;
    
    const { error } = await supabase
      .from('location_blocks')
      .delete()
      .eq('id', block.id);
    
    if (error) {
      console.error('Error deleting block:', error);
      return;
    }
    
    blocks = blocks.filter(b => b.id !== block.id);
    selectedBlock = null;
  }
  
  function resetView() {
    canvasTransform = { x: 0, y: 0, scale: 1 };
  }
</script>

<div class="canvas-overlay">
  <div class="canvas-header">
    <div class="canvas-title-section">
      <button class="back-btn" on:click={currentView === 'canvas' ? backToLocations : onClose}>
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 4L6 8l4 4"/>
        </svg>
      </button>
      <div>
        <h2 class="canvas-title">
          {#if currentView === 'locations'}
            {world.name}
          {:else}
            {selectedLocation?.name || world.name}
          {/if}
        </h2>
        <p class="canvas-subtitle">
          {#if currentView === 'locations'}
            Locations
          {:else}
            Canvas
          {/if}
        </p>
      </div>
    </div>
    
    {#if currentView === 'canvas'}
      <div class="canvas-controls">
        <button class="control-btn" on:click={resetView} title="Reset view">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="12" height="12" rx="1"/>
          </svg>
          Reset View
        </button>
        <span class="zoom-indicator">{Math.round(canvasTransform.scale * 100)}%</span>
      </div>
    {/if}
  </div>
  
  {#if currentView === 'locations'}
    <div class="locations-container">
      <div class="locations-grid">
        <div class="location-card world-card" on:click={openWorldCanvas}>
          <div class="location-icon">🌍</div>
          <h3 class="location-name">World Overview</h3>
          <p class="location-description">General information about {world.name}</p>
        </div>
        
        {#each locations as location}
          <div class="location-card">
            <button 
              class="location-delete-btn"
              on:click|stopPropagation={() => deleteLocation(location.id)}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </button>
            <div class="location-icon">📍</div>
            <h3 class="location-name">{location.name}</h3>
            <p class="location-description">{location.description || 'No description'}</p>
            <button 
              class="location-open-btn"
              on:click={() => openLocationCanvas(location)}
            >
              Open Canvas
            </button>
          </div>
        {/each}
        
        <div class="location-card add-card" on:click={openAddLocationModal}>
          <div class="add-icon">+</div>
          <h3 class="add-text">Add Location</h3>
        </div>
      </div>
    </div>
  {:else}
    <div 
      class="canvas-container"
      bind:this={canvasContainer}
      on:wheel={handleWheel}
      on:mousedown={handleMouseDown}
      on:mousemove={handleMouseMove}
      on:mouseup={handleMouseUp}
      on:mouseleave={handleMouseUp}
      on:contextmenu={handleCanvasContextMenu}
    >
      <div 
        class="canvas-viewport"
        style="transform: translate({canvasTransform.x}px, {canvasTransform.y}px) scale({canvasTransform.scale});"
      >
        <div class="canvas-grid"></div>
        
        {#each blocks as block (block.id)}
          <div
            class="block block-{block.type}"
            class:selected={selectedBlock?.id === block.id}
            style="left: {block.x}px; top: {block.y}px; width: {block.width}px; min-height: {block.height}px;"
            on:mousedown={(e) => handleBlockMouseDown(e, block)}
          >
            {#if block.type === 'heading'}
              <input
                type="text"
                class="block-heading-input"
                value={block.content}
                on:input={(e) => updateBlockContent(block, e.target.value)}
                on:click={(e) => e.stopPropagation()}
              />
            {:else if block.type === 'image'}
              <div class="block-image-placeholder">
                <svg width="48" height="48" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1">
                  <rect x="2" y="2" width="12" height="12" rx="1"/>
                  <circle cx="6" cy="6" r="1.5"/>
                  <path d="M14 10l-3-3-3 3-2-2-2 2"/>
                </svg>
                <p>Click to upload image</p>
              </div>
            {:else}
              <textarea
                class="block-textarea"
                value={block.content}
                on:input={(e) => updateBlockContent(block, e.target.value)}
                on:click={(e) => e.stopPropagation()}
                placeholder="Type here..."
              ></textarea>
            {/if}
            
            {#if selectedBlock?.id === block.id}
              <button 
                class="block-delete-btn"
                on:click|stopPropagation={() => deleteBlock(block)}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5"/>
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      </div>
      
      {#if showAddMenu}
        <div 
          class="add-menu"
          style="left: {addMenuPosition.x}px; top: {addMenuPosition.y}px;"
          on:mouseleave={() => showAddMenu = false}
        >
          <div class="add-menu-header">Add Block</div>
          {#each blockTypes as blockType}
            <button 
              class="add-menu-item"
              on:click={() => addBlock(blockType.type)}
            >
              <span class="add-menu-icon">{blockType.icon}</span>
              <span>{blockType.label}</span>
            </button>
          {/each}
        </div>
      {/if}
      
      <div class="canvas-hint">
        Right-click to add blocks • Middle mouse or drag background to pan • Ctrl+Scroll to zoom
      </div>
    </div>
  {/if}
</div>

{#if showAddLocationModal}
  <div class="modal-overlay" on:click={() => showAddLocationModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <h3 class="modal-title">Add New Location</h3>
      
      <div class="form-group">
        <label>Location Name</label>
        <input 
          type="text" 
          bind:value={newLocationName}
          placeholder="e.g., Capital City, Ancient Forest..."
          class="text-input"
          autofocus
        />
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea 
          bind:value={newLocationDescription}
          placeholder="Brief description of this location..."
          class="textarea-input"
          rows="3"
        ></textarea>
      </div>
      
      <div class="modal-actions">
        <button class="secondary-btn" on:click={() => showAddLocationModal = false}>
          Cancel
        </button>
        <button class="primary-btn" on:click={createLocation}>
          Create Location
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .canvas-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #1a1a1a;
    z-index: 2000;
    display: flex;
    flex-direction: column;
  }
  
  .canvas-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: #0f0f0f;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .canvas-title-section {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #e8dcc8;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .back-btn:hover {
    background: rgba(107, 142, 111, 0.2);
    border-color: #6b8e6f;
    color: #6b8e6f;
  }
  
  .canvas-title {
    color: #6b8e6f;
    font-size: 20px;
    font-weight: 700;
    margin: 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .canvas-subtitle {
    color: #a0a0a0;
    font-size: 13px;
    margin: 0;
  }
  
  .canvas-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .control-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #e8dcc8;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .control-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: #6b8e6f;
  }
  
  .zoom-indicator {
    color: #a0a0a0;
    font-size: 13px;
    font-weight: 500;
    min-width: 50px;
    text-align: right;
  }
  
  .locations-container {
    flex: 1;
    overflow-y: auto;
    padding: 32px;
  }
  
  .locations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .location-card {
    background: rgba(42, 42, 42, 0.6);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 24px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-height: 200px;
  }
  
  .location-card:hover {
    border-color: #6b8e6f;
    background: rgba(42, 42, 42, 0.8);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
  
  .world-card {
    border-color: rgba(107, 142, 111, 0.3);
    background: rgba(107, 142, 111, 0.1);
  }
  
  .world-card:hover {
    border-color: #6b8e6f;
    background: rgba(107, 142, 111, 0.15);
  }
  
  .add-card {
    border: 2px dashed rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.02);
  }
  
  .add-card:hover {
    border-color: #6b8e6f;
    background: rgba(107, 142, 111, 0.1);
  }
  
  .location-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .add-icon {
    font-size: 64px;
    color: #6b8e6f;
    margin-bottom: 16px;
  }
  
  .location-name {
    color: #e8dcc8;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .add-text {
    color: #6b8e6f;
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .location-description {
    color: #a0a0a0;
    font-size: 13px;
    line-height: 1.5;
    margin: 0 0 16px 0;
    flex: 1;
  }
  
  .location-open-btn {
    padding: 8px 16px;
    background: #6b8e6f;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .location-open-btn:hover {
    background: #5a7a5e;
  }
  
  .location-delete-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 24px;
    height: 24px;
    background: rgba(214, 110, 110, 0.2);
    border: 1px solid rgba(214, 110, 110, 0.3);
    border-radius: 4px;
    color: #d66e6e;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    opacity: 0;
  }
  
  .location-card:hover .location-delete-btn {
    opacity: 1;
  }
  
  .location-delete-btn:hover {
    background: rgba(214, 110, 110, 0.3);
    border-color: #d66e6e;
  }
  
  .canvas-container {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: #1a1a1a;
    cursor: grab;
  }
  
  .canvas-container:active {
    cursor: grabbing;
  }
  
  .canvas-viewport {
    position: absolute;
    top: 0;
    left: 0;
    width: 10000px;
    height: 10000px;
    transform-origin: 0 0;
  }
  
  .canvas-grid {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
  }
  
  .block {
    position: absolute;
    background: rgba(42, 42, 42, 0.95);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
    cursor: move;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .block:hover {
    border-color: rgba(107, 142, 111, 0.3);
  }
  
  .block.selected {
    border-color: #6b8e6f;
    box-shadow: 0 0 0 3px rgba(107, 142, 111, 0.2);
  }
  
  .block-heading {
    background: rgba(107, 142, 111, 0.1);
    border-color: rgba(107, 142, 111, 0.3);
  }
  
  .block-heading-input {
    width: 100%;
    background: transparent;
    border: none;
    color: #6b8e6f;
    font-size: 24px;
    font-weight: 700;
    font-family: 'Inter', -apple-system, sans-serif;
    outline: none;
    cursor: text;
  }
  
  .block-textarea {
    width: 100%;
    min-height: 100px;
    background: transparent;
    border: none;
    color: #e8dcc8;
    font-size: 14px;
    line-height: 1.6;
    font-family: 'Inter', -apple-system, sans-serif;
    resize: vertical;
    outline: none;
    cursor: text;
  }
  
  .block-image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 150px;
    color: #6b8e6f;
    text-align: center;
  }
  
  .block-image-placeholder p {
    margin: 8px 0 0 0;
    font-size: 13px;
    color: #a0a0a0;
  }
  
  .block-delete-btn {
    position: absolute;
    top: -12px;
    right: -12px;
    width: 28px;
    height: 28px;
    background: #d66e6e;
    border: 2px solid #1a1a1a;
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .block-delete-btn:hover {
    background: #c55555;
    transform: scale(1.1);
  }
  
  .add-menu {
    position: absolute;
    background: #2a2a2a;
    border: 1px solid #6b8e6f;
    border-radius: 8px;
    padding: 8px;
    min-width: 200px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 1000;
  }
  
  .add-menu-header {
    color: #6b8e6f;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 4px;
  }
  
  .add-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #e8dcc8;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .add-menu-item:hover {
    background: rgba(107, 142, 111, 0.2);
  }
  
  .add-menu-icon {
    font-size: 18px;
  }
  
  .canvas-hint {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(42, 42, 42, 0.95);
    border: 1px solid rgba(107, 142, 111, 0.3);
    border-radius: 8px;
    padding: 8px 16px;
    color: #a0a0a0;
    font-size: 12px;
    pointer-events: none;
  }
  
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
    z-index: 3000;
  }
  
  .modal-content {
    background: #2a2a2a;
    border: 2px solid #6b8e6f;
    border-radius: 12px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
  }
  
  .modal-title {
    color: #6b8e6f;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 24px 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    color: #a0a0a0;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .text-input,
  .textarea-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 10px 12px;
    color: #e8dcc8;
    font-size: 14px;
    font-family: 'Inter', -apple-system, sans-serif;
    transition: all 0.2s;
  }
  
  .text-input:focus,
  .textarea-input:focus {
    outline: none;
    border-color: #6b8e6f;
    background: rgba(255, 255, 255, 0.08);
  }
  
  .textarea-input {
    resize: vertical;
    min-height: 80px;
  }
  
  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }
  
  .primary-btn,
  .secondary-btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-family: 'Inter', -apple-system, sans-serif;
    flex: 1;
  }
  
  .primary-btn {
    background: #6b8e6f;
    color: white;
  }
  
  .primary-btn:hover {
    background: #5a7a5e;
  }
  
  .secondary-btn {
    background: transparent;
    color: #e8dcc8;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .secondary-btn:hover {
    background: rgba(255, 255, 255, 0.05);
  }
</style>
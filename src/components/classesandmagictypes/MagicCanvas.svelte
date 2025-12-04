<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  
  export let world;
  export let onClose;
  
  // View state: 'types' or 'canvas'
  let currentView = 'types';
  let selectedMagicType = null;
  let selectedSchool = null; // For magic school canvases
  
  // Magic types within this world
  let magicTypes = [];
  let showAddTypeModal = false;
  let newTypeName = '';
  let newTypeDescription = '';
  let newTypeCategory = 'elemental'; // elemental, divine, arcane, nature, dark, other
  
  // Magic schools/sub-types
  let magicSchools = [];
  let showAddSchoolModal = false;
  let newSchoolName = '';
  let newSchoolDescription = '';
  
  // Canvas state
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
  
  // Block types specific to magic systems
  const blockTypes = [
    { type: 'heading', label: 'Heading', icon: '📌' },
    { type: 'text', label: 'Text Block', icon: '📝' },
    { type: 'spell', label: 'Spell', icon: '✨' },
    { type: 'ritual', label: 'Ritual', icon: '🔮' },
    { type: 'component', label: 'Components', icon: '🧪' },
    { type: 'cost', label: 'Casting Cost', icon: '💎' },
    { type: 'effect', label: 'Magic Effect', icon: '⚡' },
    { type: 'restriction', label: 'Restrictions', icon: '🚫' },
    { type: 'lore', label: 'Lore Note', icon: '📜' },
  ];
  
  const magicCategories = [
    { value: 'elemental', label: 'Elemental', icon: '🔥', color: '#d67f6e' },
    { value: 'arcane', label: 'Arcane', icon: '✨', color: '#8d6ed6' },
    { value: 'divine', label: 'Divine', icon: '☀️', color: '#d6c46e' },
    { value: 'nature', label: 'Nature', icon: '🌿', color: '#6b8e6f' },
    { value: 'dark', label: 'Dark', icon: '🌑', color: '#8e6b6f' },
    { value: 'other', label: 'Other', icon: '🌟', color: '#6e8dd6' },
  ];
  
  onMount(() => {
    loadMagicTypes();
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (currentView === 'canvas') {
          if (selectedSchool) {
            selectedSchool = null;
            loadBlocks(selectedMagicType.id, null);
          } else {
            currentView = 'types';
            selectedMagicType = null;
            selectedSchool = null;
          }
        } else {
          selectedBlock = null;
          showAddMenu = false;
          showAddTypeModal = false;
          showAddSchoolModal = false;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
  
  async function loadMagicTypes() {
    const { data, error } = await supabase
      .from('magic_types')
      .select('*')
      .eq('world_id', world.id)
      .order('name');
    
    if (error) {
      console.error('Error loading magic types:', error);
      return;
    }
    
    magicTypes = data || [];
  }
  
  async function loadMagicSchools(typeId) {
    const { data, error } = await supabase
      .from('magic_schools')
      .select('*')
      .eq('magic_type_id', typeId)
      .order('name');
    
    if (error) {
      console.error('Error loading magic schools:', error);
      return;
    }
    
    magicSchools = data || [];
  }
  
  function openAddTypeModal() {
    showAddTypeModal = true;
    newTypeName = '';
    newTypeDescription = '';
    newTypeCategory = 'elemental';
  }
  
  async function createMagicType() {
    if (!newTypeName.trim()) return;
    
    const typeData = {
      name: newTypeName,
      description: newTypeDescription,
      category: newTypeCategory,
      world_id: world.id
    };
    
    const { data, error } = await supabase
      .from('magic_types')
      .insert(typeData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating magic type:', error);
      return;
    }
    
    magicTypes = [...magicTypes, data];
    showAddTypeModal = false;
  }
  
  async function deleteMagicType(typeId) {
    if (!confirm('Delete this magic type? All schools and canvas content will be lost.')) return;
    
    const { error } = await supabase
      .from('magic_types')
      .delete()
      .eq('id', typeId);
    
    if (error) {
      console.error('Error deleting magic type:', error);
      return;
    }
    
    magicTypes = magicTypes.filter(t => t.id !== typeId);
  }
  
  async function openMagicTypeCanvas(type) {
    selectedMagicType = type;
    selectedSchool = null;
    currentView = 'canvas';
    await loadMagicSchools(type.id);
    await loadBlocks(type.id, null);
  }
  
  async function openSchoolCanvas(school) {
    selectedSchool = school;
    await loadBlocks(selectedMagicType.id, school.id);
  }
  
  function backToTypes() {
    currentView = 'types';
    selectedMagicType = null;
    selectedSchool = null;
    magicSchools = [];
    blocks = [];
  }
  
  function backToMagicType() {
    selectedSchool = null;
    loadBlocks(selectedMagicType.id, null);
  }
  
  function openAddSchoolModal() {
    showAddSchoolModal = true;
    newSchoolName = '';
    newSchoolDescription = '';
  }
  
  async function createSchool() {
    if (!newSchoolName.trim()) return;
    
    const schoolData = {
      name: newSchoolName,
      description: newSchoolDescription,
      magic_type_id: selectedMagicType.id,
      world_id: world.id
    };
    
    const { data, error } = await supabase
      .from('magic_schools')
      .insert(schoolData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating magic school:', error);
      return;
    }
    
    magicSchools = [...magicSchools, data];
    showAddSchoolModal = false;
  }
  
  async function deleteSchool(schoolId) {
    if (!confirm('Delete this magic school? All canvas content will be lost.')) return;
    
    const { error } = await supabase
      .from('magic_schools')
      .delete()
      .eq('id', schoolId);
    
    if (error) {
      console.error('Error deleting magic school:', error);
      return;
    }
    
    magicSchools = magicSchools.filter(s => s.id !== schoolId);
  }
  
  async function loadBlocks(typeId, schoolId) {
    const { data, error } = await supabase
      .from('magic_blocks')
      .select('*')
      .eq('magic_type_id', typeId)
      .eq('magic_school_id', schoolId || '')
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
      const context = selectedSchool || selectedMagicType;
      const defaultBlocks = [
        {
          magic_type_id: typeId,
          magic_school_id: schoolId || '',
          world_id: world.id,
          type: 'heading',
          content: context.name,
          x: 100,
          y: 100,
          width: 400,
          height: 60,
          metadata: {}
        },
        {
          magic_type_id: typeId,
          magic_school_id: schoolId || '',
          world_id: world.id,
          type: 'text',
          content: context.description || 'Add description here...',
          x: 100,
          y: 180,
          width: 400,
          height: 150,
          metadata: {}
        }
      ];
      
      const { data: inserted, error: insertError } = await supabase
        .from('magic_blocks')
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
      const block = draggingBlock;
      supabase
        .from('magic_blocks')
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
    
    let width = 300;
    let height = 150;
    let content = 'Double-click to edit...';
    
    if (type === 'heading') {
      width = 400;
      height = 60;
      content = 'New Heading';
    } else if (type === 'spell') {
      content = JSON.stringify({
        name: 'Spell Name',
        level: 1,
        school: 'Evocation',
        castingTime: '1 action',
        range: '60 feet',
        components: 'V, S',
        duration: 'Instantaneous',
        description: 'Spell description...'
      });
    } else if (type === 'ritual') {
      width = 350;
      content = JSON.stringify({
        name: 'Ritual Name',
        duration: '1 hour',
        participants: 1,
        components: ['Item 1', 'Item 2'],
        effect: 'Ritual effect...'
      });
    } else if (type === 'component') {
      width = 250;
      content = JSON.stringify({
        type: 'Material',
        items: ['Component 1', 'Component 2'],
        rarity: 'Common',
        consumed: false
      });
    } else if (type === 'cost') {
      width = 250;
      height = 120;
      content = JSON.stringify({
        mana: 10,
        time: '1 action',
        sacrifice: 'None',
        consequence: 'None'
      });
    } else if (type === 'effect') {
      content = JSON.stringify({
        type: 'Damage/Healing/Buff/Debuff',
        target: 'Single/Area',
        magnitude: 'Description',
        duration: 'Instantaneous/Rounds'
      });
    }
    
    const newBlock = {
      magic_type_id: selectedMagicType.id,
      magic_school_id: selectedSchool?.id || '',
      world_id: world.id,
      type: type,
      content: content,
      x: canvasX,
      y: canvasY,
      width: width,
      height: height,
      metadata: {}
    };
    
    const { data, error } = await supabase
      .from('magic_blocks')
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
    
    clearTimeout(block._saveTimeout);
    block._saveTimeout = setTimeout(async () => {
      const { error } = await supabase
        .from('magic_blocks')
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
      .from('magic_blocks')
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
  
  function getCategoryInfo(category) {
    return magicCategories.find(c => c.value === category) || magicCategories[5];
  }
</script>

<div class="canvas-overlay">
  <div class="canvas-header">
    <div class="canvas-title-section">
      <button class="back-btn" on:click={currentView === 'canvas' ? (selectedSchool ? backToMagicType : backToTypes) : onClose}>
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 4L6 8l4 4"/>
        </svg>
      </button>
      <div>
        <h2 class="canvas-title">
          {#if currentView === 'types'}
            Magic Systems
          {:else if selectedSchool}
            {selectedSchool.name}
          {:else}
            {selectedMagicType?.name || 'Magic Type'}
          {/if}
        </h2>
        <p class="canvas-subtitle">
          {#if currentView === 'types'}
            {world.name}
          {:else if selectedSchool}
            School of {selectedMagicType?.name}
          {:else}
            Base Magic Type
          {/if}
        </p>
      </div>
    </div>
    
    {#if currentView === 'canvas'}
      <div class="canvas-controls">
        {#if !selectedSchool && magicSchools.length > 0}
          <button class="control-btn secondary" on:click={openAddSchoolModal}>
            + Add School
          </button>
        {/if}
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
  
  {#if currentView === 'types'}
    <div class="types-container">
      <div class="types-grid">
        {#each magicTypes as magicType}
          {@const categoryInfo = getCategoryInfo(magicType.category)}
          <div class="magic-card" style="--magic-color: {categoryInfo.color}">
            <button 
              class="magic-delete-btn"
              on:click|stopPropagation={() => deleteMagicType(magicType.id)}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </button>
            <div class="magic-category-badge" style="background: {categoryInfo.color}20; border-color: {categoryInfo.color}; color: {categoryInfo.color};">
              <span class="magic-category-icon">{categoryInfo.icon}</span>
              {categoryInfo.label}
            </div>
            <h3 class="magic-name">{magicType.name}</h3>
            <p class="magic-description">{magicType.description || 'No description'}</p>
            <button 
              class="magic-open-btn"
              on:click={() => openMagicTypeCanvas(magicType)}
            >
              Open Canvas
            </button>
          </div>
        {/each}
        
        <div class="magic-card add-card" on:click={openAddTypeModal}>
          <div class="add-icon">+</div>
          <h3 class="add-text">Add Magic Type</h3>
        </div>
      </div>
    </div>
  {:else}
    <div class="canvas-layout">
      {#if !selectedSchool && magicSchools.length > 0}
        <div class="school-sidebar">
          <div class="sidebar-header">
            <h3>Magic Schools</h3>
            <button class="sidebar-add-btn" on:click={openAddSchoolModal} title="Add School">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3v10M3 8h10"/>
              </svg>
            </button>
          </div>
          <div class="school-list">
            {#each magicSchools as school}
              <div class="school-item">
                <button 
                  class="school-item-btn"
                  on:click={() => openSchoolCanvas(school)}
                >
                  <span class="school-icon">🔮</span>
                  <span class="school-name">{school.name}</span>
                </button>
                <button 
                  class="school-delete-btn"
                  on:click|stopPropagation={() => deleteSchool(school.id)}
                  title="Delete school"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4l8 8M12 4l-8 8"/>
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      
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
              {:else if block.type === 'spell' || block.type === 'ritual' || block.type === 'component' || block.type === 'cost' || block.type === 'effect'}
                <div class="structured-block">
                  <textarea
                    class="block-textarea structured"
                    value={block.content}
                    on:input={(e) => updateBlockContent(block, e.target.value)}
                    on:click={(e) => e.stopPropagation()}
                    placeholder="JSON data..."
                  ></textarea>
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
    </div>
  {/if}
</div>

{#if showAddTypeModal}
  <div class="modal-overlay" on:click={() => showAddTypeModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <h3 class="modal-title">Add New Magic Type</h3>
      
      <div class="form-group">
        <label>Magic Type Name</label>
        <input 
          type="text" 
          bind:value={newTypeName}
          placeholder="e.g., Fire Magic, Divine Light, Shadow Arts..."
          class="text-input"
          autofocus
        />
      </div>
      
      <div class="form-group">
        <label>Category</label>
        <div class="category-grid">
          {#each magicCategories as category}
            <button 
              class="category-option"
              class:selected={newTypeCategory === category.value}
              style="--category-color: {category.color}"
              on:click={() => newTypeCategory = category.value}
            >
              <span class="category-icon">{category.icon}</span>
              <span class="category-label">{category.label}</span>
            </button>
          {/each}
        </div>
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea 
          bind:value={newTypeDescription}
          placeholder="Brief description of this magic type..."
          class="textarea-input"
          rows="3"
        ></textarea>
      </div>
      
      <div class="modal-actions">
        <button class="secondary-btn" on:click={() => showAddTypeModal = false}>
          Cancel
        </button>
        <button class="primary-btn" on:click={createMagicType}>
          Create Magic Type
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showAddSchoolModal}
  <div class="modal-overlay" on:click={() => showAddSchoolModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <h3 class="modal-title">Add School to {selectedMagicType?.name}</h3>
      
      <div class="form-group">
        <label>School Name</label>
        <input 
          type="text" 
          bind:value={newSchoolName}
          placeholder="e.g., School of Evocation, Necromancy..."
          class="text-input"
          autofocus
        />
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea 
          bind:value={newSchoolDescription}
          placeholder="Brief description of this magic school..."
          class="textarea-input"
          rows="3"
        ></textarea>
      </div>
      
      <div class="modal-actions">
        <button class="secondary-btn" on:click={() => showAddSchoolModal = false}>
          Cancel
        </button>
        <button class="primary-btn" on:click={createSchool}>
          Create School
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Inheriting most styles from ClassesCanvas, with magic-specific tweaks */
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
    color: #8d6ed6;
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
    border-color: #8d6ed6;
  }
  
  .control-btn.secondary {
    background: #8d6ed6;
    border-color: #8d6ed6;
    color: white;
  }
  
  .control-btn.secondary:hover {
    background: #7a5dc5;
  }
  
  .zoom-indicator {
    color: #a0a0a0;
    font-size: 13px;
    font-weight: 500;
    min-width: 50px;
    text-align: right;
  }
  
  .types-container {
    flex: 1;
    overflow-y: auto;
    padding: 32px;
  }
  
  .types-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .magic-card {
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
    min-height: 240px;
  }
  
  .magic-card:hover {
    border-color: var(--magic-color, #8d6ed6);
    background: rgba(42, 42, 42, 0.8);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
  
  .add-card {
    border: 2px dashed rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.02);
  }
  
  .add-card:hover {
    border-color: #8d6ed6;
    background: rgba(141, 110, 214, 0.1);
  }
  
  .add-icon {
    font-size: 64px;
    color: #8d6ed6;
    margin-bottom: 16px;
  }
  
  .magic-category-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 16px;
    border: 1px solid;
  }
  
  .magic-category-icon {
    font-size: 16px;
  }
  
  .magic-name {
    color: #e8dcc8;
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .add-text {
    color: #8d6ed6;
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .magic-description {
    color: #a0a0a0;
    font-size: 13px;
    line-height: 1.5;
    margin: 0 0 16px 0;
    flex: 1;
  }
  
  .magic-open-btn {
    padding: 8px 16px;
    background: #8d6ed6;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .magic-open-btn:hover {
    background: #7a5dc5;
  }
  
  .magic-delete-btn {
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
  
  .magic-card:hover .magic-delete-btn {
    opacity: 1;
  }
  
  .magic-delete-btn:hover {
    background: rgba(214, 110, 110, 0.3);
    border-color: #d66e6e;
  }
  
  .canvas-layout {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  
  .school-sidebar {
    width: 250px;
    background: #0f0f0f;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
  }
  
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .sidebar-header h3 {
    color: #8d6ed6;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
  }
  
  .sidebar-add-btn {
    width: 28px;
    height: 28px;
    background: rgba(141, 110, 214, 0.2);
    border: 1px solid #8d6ed6;
    border-radius: 4px;
    color: #8d6ed6;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .sidebar-add-btn:hover {
    background: rgba(141, 110, 214, 0.3);
  }
  
  .school-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  
  .school-item {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
  }
  
  .school-item-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #e8dcc8;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .school-item-btn:hover {
    background: rgba(141, 110, 214, 0.2);
    border-color: #8d6ed6;
  }
  
  .school-icon {
    font-size: 18px;
  }
  
  .school-name {
    font-size: 14px;
    font-weight: 500;
  }
  
  .school-delete-btn {
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
    flex-shrink: 0;
  }
  
  .school-delete-btn:hover {
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
      linear-gradient(rgba(141, 110, 214, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(141, 110, 214, 0.05) 1px, transparent 1px);
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
    border-color: rgba(141, 110, 214, 0.3);
  }
  
  .block.selected {
    border-color: #8d6ed6;
    box-shadow: 0 0 0 3px rgba(141, 110, 214, 0.2);
  }
  
  .block-heading {
    background: rgba(141, 110, 214, 0.1);
    border-color: rgba(141, 110, 214, 0.3);
  }
  
  .block-spell {
    background: rgba(110, 141, 214, 0.1);
    border-color: rgba(110, 141, 214, 0.3);
  }
  
  .block-ritual {
    background: rgba(214, 127, 110, 0.1);
    border-color: rgba(214, 127, 110, 0.3);
  }
  
  .block-heading-input {
    width: 100%;
    background: transparent;
    border: none;
    color: #8d6ed6;
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
  
  .block-textarea.structured {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    color: #6e8dd6;
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
    border: 1px solid #8d6ed6;
    border-radius: 8px;
    padding: 8px;
    min-width: 220px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 1000;
  }
  
  .add-menu-header {
    color: #8d6ed6;
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
    background: rgba(141, 110, 214, 0.2);
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
    border: 1px solid rgba(141, 110, 214, 0.3);
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
    border: 2px solid #8d6ed6;
    border-radius: 12px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
  }
  
  .modal-title {
    color: #8d6ed6;
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
    border-color: #8d6ed6;
    background: rgba(255, 255, 255, 0.08);
  }
  
  .textarea-input {
    resize: vertical;
    min-height: 80px;
  }
  
  .category-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  
  .category-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .category-option:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--category-color);
  }
  
  .category-option.selected {
    background: color-mix(in srgb, var(--category-color) 10%, transparent);
    border-color: var(--category-color);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--category-color) 20%, transparent);
  }
  
  .category-icon {
    font-size: 32px;
  }
  
  .category-label {
    color: #e8dcc8;
    font-size: 12px;
    font-weight: 600;
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
    background: #8d6ed6;
    color: white;
  }
  
  .primary-btn:hover {
    background: #7a5dc5;
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
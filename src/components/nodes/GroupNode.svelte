<!-- components/nodes/GroupNode.svelte -->
<script lang="ts">
  import { Handle, Position, useSvelteFlow, type NodeProps } from '@xyflow/svelte';
  import PropertyEditor from './PropertyEditor.svelte';
  
  let { id, data, selected }: NodeProps = $props();
  let { updateNodeData, deleteElements } = useSvelteFlow();
  
  let isEditing = $state(false);
  let labelInput = $state(data.label);
  let showProperties = $state(false);

  let properties = $state(data.properties || []);

  function startEdit() {
    isEditing = true;
    labelInput = data.label;
  }

  function saveEdit() {
    if (labelInput.trim()) {
      updateNodeData(id, { label: labelInput.trim() });
    }
    isEditing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      isEditing = false;
      labelInput = data.label;
    }
  }

  function deleteNode() {
    deleteElements({ nodes: [{ id }] });
  }

  function toggleProperties() {
    showProperties = !showProperties;
  }

  function handlePropertiesUpdate(updatedProperties: any[]) {
    properties = updatedProperties;
    updateNodeData(id, { properties: updatedProperties });
  }
</script>

<div class="group-node" class:selected class:expanded={showProperties}>
  <div class="group-header nodrag">
    <div class="node-content">
      <div class="node-icon">📦</div>
      <div class="node-text">
        {#if isEditing}
          <input
            type="text"
            bind:value={labelInput}
            on:keydown={handleKeydown}
            on:blur={saveEdit}
            class="node-input nodrag"
            autofocus
          />
        {:else}
          <div class="node-label" on:dblclick={startEdit}>{data.label}</div>
        {/if}
        
        {#if !showProperties && properties.length > 0}
          <div class="property-badges">
            {#each properties.slice(0, 3) as prop}
              <span class="badge" title={`${prop.key}: ${prop.value}`}>
                {prop.key}
              </span>
            {/each}
            {#if properties.length > 3}
              <span class="badge more">+{properties.length - 3}</span>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    
    {#if selected}
      <div class="node-actions">
        <button 
          on:click={toggleProperties} 
          class="nodrag" 
          class:active={showProperties}
          title="Properties"
        >
          ⚙️
        </button>
        <button on:click={startEdit} class="nodrag" title="Edit">✏️</button>
        <button on:click={deleteNode} class="nodrag delete" title="Delete">🗑️</button>
      </div>
    {/if}
  </div>

  {#if showProperties}
    <div class="properties-panel nodrag">
      <PropertyEditor bind:properties onUpdate={handlePropertiesUpdate} />
    </div>
  {/if}
  
  <!-- Keep a drag area at the bottom for moving the group -->
  <div class="drag-handle"></div>
  
  <Handle type="target" position={Position.Top} style="opacity: 0;" />
  <Handle type="source" position={Position.Bottom} style="opacity: 0;" />
</div>

<style>
  .group-node {
    background: rgba(230, 230, 250, 0.15);
    border: 2px dashed #7b68ee;
    border-radius: 12px;
    padding: 0;
    min-width: 300px;
    min-height: 200px;
    max-width: 600px;
    box-shadow: none;
    transition: all 0.2s;
    position: relative;
    pointer-events: none; /* Don't capture events on the main container */
  }

  .group-node.expanded {
    min-width: 400px;
  }
  
  .group-node.selected {
    border-color: #6a5acd;
    background: rgba(230, 230, 250, 0.25);
    box-shadow: 0 0 0 2px rgba(123, 104, 238, 0.3);
  }
  
  .group-node:hover {
    background: rgba(230, 230, 250, 0.2);
  }

  .group-header {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.75rem;
    border-radius: 6px;
    border: 1px solid rgba(123, 104, 238, 0.3);
    z-index: 1;
    pointer-events: auto; /* Allow interaction with header */
  }

  .drag-handle {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 30px;
    cursor: move;
    pointer-events: auto; /* Allow dragging from bottom */
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .drag-handle::before {
    content: '⋮⋮⋮';
    color: rgba(123, 104, 238, 0.4);
    font-size: 0.8rem;
    letter-spacing: 2px;
  }
  
  .node-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .node-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .node-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  
  .node-label {
    font-weight: 600;
    color: #4a4a8a;
    cursor: text;
    font-size: 0.95rem;
  }

  .node-input {
    border: 1px solid #7b68ee;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-weight: 600;
    font-size: inherit;
    font-family: inherit;
    outline: none;
    width: 100%;
  }

  .property-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .badge {
    background: rgba(123, 104, 238, 0.2);
    color: #6a5acd;
    padding: 0.15rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100px;
  }

  .badge.more {
    background: rgba(123, 104, 238, 0.15);
  }

  .node-actions {
    position: absolute;
    top: -12px;
    right: -12px;
    display: flex;
    gap: 0.25rem;
    background: white;
    border-radius: 4px;
    padding: 0.25rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .node-actions button {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .node-actions button:hover {
    background: #f5f5f5;
    transform: scale(1.1);
  }

  .node-actions button.active {
    background: #e3f2fd;
    border-color: #1976d2;
  }

  .node-actions button.delete:hover {
    background: #ffebee;
    border-color: #f44336;
  }

  .properties-panel {
    position: absolute;
    top: 70px;
    left: 8px;
    right: 8px;
    background: rgba(255, 255, 255, 0.95);
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid rgba(123, 104, 238, 0.3);
    z-index: 1;
    max-height: 300px;
    overflow-y: auto;
    pointer-events: auto; /* Allow interaction with properties */
  }
</style>
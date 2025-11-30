<!-- components/nodes/ProcessNode.svelte -->
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

<div class="process-node" class:selected class:expanded={showProperties}>
  <div class="node-content">
    <div class="node-icon">{data.icon || '⚙️'}</div>
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

  {#if showProperties}
    <div class="properties-panel nodrag">
      <PropertyEditor bind:properties onUpdate={handlePropertiesUpdate} />
    </div>
  {/if}
  
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .process-node {
    background: white;
    border: 2px solid #1976d2;
    border-radius: 8px;
    padding: 1rem;
    min-width: 150px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    position: relative;
  }

  .process-node.expanded {
    min-width: 350px;
  }
  
  .process-node.selected {
    border-color: #1565c0;
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.2);
  }
  
  .process-node:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  
  .node-label {
    font-weight: 600;
    color: #1976d2;
    cursor: text;
    font-size: 0.95rem;
    word-wrap: break-word;
  }

  .node-input {
    border: 1px solid #1976d2;
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
    background: rgba(25, 118, 210, 0.1);
    color: #1976d2;
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
    background: rgba(25, 118, 210, 0.05);
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
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
    max-height: 300px;
    overflow-y: auto;
  }
</style>
<!-- components/nodes/DecisionNode.svelte -->
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

<div class="decision-node" class:selected class:expanded={showProperties}>
  <div class="diamond">
    <div class="node-content">
      <div class="node-icon">{data.icon || '❓'}</div>
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
            {#each properties.slice(0, 2) as prop}
              <span class="badge" title={`${prop.key}: ${prop.value}`}>
                {prop.key}
              </span>
            {/each}
            {#if properties.length > 2}
              <span class="badge more">+{properties.length - 2}</span>
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
  
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Left} id="no" style="top: 50%; left: 0;" />
  <Handle type="source" position={Position.Right} id="yes" style="top: 50%; right: 0;" />
  <Handle type="source" position={Position.Bottom} id="default" />
</div>

<style>
  .decision-node {
    position: relative;
    display: inline-block;
    min-width: 150px;
  }

  .decision-node.expanded {
    min-width: 350px;
  }

  .diamond {
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    border: 2px solid #e65100;
    width: 150px;
    height: 150px;
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    position: relative;
  }
  
  .decision-node.selected .diamond {
    border-color: #bf360c;
    box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.3);
  }
  
  .diamond:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .node-content {
    transform: rotate(-45deg);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    max-width: 120px;
  }

  .node-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  
  .node-icon {
    font-size: 1.5rem;
  }
  
  .node-label {
    font-weight: 600;
    color: white;
    cursor: text;
    font-size: 0.85rem;
    line-height: 1.2;
    word-break: break-word;
  }

  .node-input {
    border: 1px solid white;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-weight: 600;
    font-size: 0.85rem;
    font-family: inherit;
    outline: none;
    width: 100%;
    background: rgba(255, 255, 255, 0.9);
  }

  .property-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: center;
  }

  .badge {
    background: rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.15rem 0.4rem;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
  }

  .badge.more {
    background: rgba(255, 255, 255, 0.2);
  }

  .node-actions {
    position: absolute;
    top: -50px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.25rem;
    background: white;
    border-radius: 4px;
    padding: 0.25rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;
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
    background: #fff3e0;
    border-color: #ff9800;
  }

  .node-actions button.delete:hover {
    background: #ffebee;
    border-color: #f44336;
  }

  .properties-panel {
    position: absolute;
    top: 160px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 1rem;
    border-radius: 6px;
    border: 2px solid #ff9800;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 5;
    min-width: 300px;
    max-height: 300px;
    overflow-y: auto;
  }
</style>
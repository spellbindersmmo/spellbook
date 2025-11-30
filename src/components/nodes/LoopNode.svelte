<!-- components/nodes/LoopNode.svelte -->
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

<div class="loop-node" class:selected class:expanded={showProperties}>
  <div class="loop-icon-container">
    <div class="loop-icon">🔄</div>
  </div>
  
  <div class="node-content">
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
              {prop.key}: {prop.value}
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
      <div class="loop-settings">
        <div class="setting-hint">
          <strong>Common loop properties:</strong>
          <ul>
            <li><strong>Count:</strong> Number of iterations (e.g., "3")</li>
            <li><strong>Condition:</strong> Loop while true (e.g., "Health > 0")</li>
            <li><strong>Collection:</strong> For each item (e.g., "Cards in Hand")</li>
            <li><strong>MaxIterations:</strong> Safety limit (e.g., "10")</li>
          </ul>
        </div>
      </div>
      <PropertyEditor bind:properties onUpdate={handlePropertiesUpdate} />
    </div>
  {/if}
  
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} id="loop" style="background: #8e44ad;" />
  <Handle type="source" position={Position.Right} id="exit" style="background: #27ae60;" />
  
  <div class="handle-labels">
    <div class="handle-label loop-label">Loop</div>
    <div class="handle-label exit-label">Exit</div>
  </div>
</div>

<style>
  .loop-node {
    background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
    border: 3px solid #5f4fd1;
    border-radius: 12px;
    padding: 1rem;
    min-width: 180px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    position: relative;
  }

  .loop-node.expanded {
    min-width: 400px;
  }
  
  .loop-node.selected {
    border-color: #4834d4;
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.3);
  }
  
  .loop-node:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .loop-icon-container {
    position: absolute;
    top: -15px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 2px solid #5f4fd1;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .loop-icon {
    font-size: 1.5rem;
    animation: spin 3s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .node-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .node-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .node-label {
    font-weight: 600;
    color: white;
    cursor: text;
    font-size: 0.95rem;
    word-wrap: break-word;
    text-align: center;
  }

  .node-input {
    border: 1px solid white;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-weight: 600;
    font-size: inherit;
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
    padding: 0.15rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .badge.more {
    background: rgba(255, 255, 255, 0.2);
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
    background: #e8e4ff;
    border-color: #6c5ce7;
  }

  .node-actions button.delete:hover {
    background: #ffebee;
    border-color: #f44336;
  }

  .properties-panel {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    max-height: 400px;
    overflow-y: auto;
  }

  .loop-settings {
    background: rgba(255, 255, 255, 0.15);
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .setting-hint {
    color: white;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .setting-hint strong {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .setting-hint ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.5rem;
  }

  .setting-hint li {
    margin-bottom: 0.25rem;
  }

  .handle-labels {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .handle-label {
    position: absolute;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .loop-label {
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    background: #8e44ad;
  }

  .exit-label {
    top: 50%;
    right: -35px;
    transform: translateY(-50%);
    background: #27ae60;
  }
</style>
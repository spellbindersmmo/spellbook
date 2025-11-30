<!-- components/nodes/StartNode.svelte -->
<script lang="ts">
  import { Handle, Position, useSvelteFlow, type NodeProps } from '@xyflow/svelte';
  
  let { id, data, selected }: NodeProps = $props();
  let { updateNodeData, deleteElements } = useSvelteFlow();
  
  let isEditing = $state(false);
  let labelInput = $state(data.label);

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
</script>

<div class="start-node" class:selected>
  <div class="node-content">
    <div class="node-icon">▶️</div>
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
    </div>
  </div>
  
  {#if selected}
    <div class="node-actions">
      <button on:click={startEdit} class="nodrag" title="Edit">✏️</button>
      <button on:click={deleteNode} class="nodrag delete" title="Delete">🗑️</button>
    </div>
  {/if}
  
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .start-node {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: 2px solid #5a67d8;
    border-radius: 8px;
    padding: 1rem;
    min-width: 120px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    position: relative;
  }
  
  .start-node.selected {
    border-color: #4c51bf;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
  }
  
  .start-node:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .node-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .node-icon {
    font-size: 1.5rem;
  }
  
  .node-label {
    font-weight: 600;
    color: white;
    cursor: text;
    font-size: 0.95rem;
    word-wrap: break-word;
  }

  .node-input {
    border: 1px solid white;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-weight: 600;
    font-size: inherit;
    font-family: inherit;
    outline: none;
    background: rgba(255, 255, 255, 0.9);
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

  .node-actions button.delete:hover {
    background: #ffebee;
    border-color: #f44336;
  }

  .node-text {
    flex: 1;
  }
</style>
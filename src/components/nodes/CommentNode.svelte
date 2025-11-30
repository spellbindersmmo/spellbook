<!-- components/nodes/CommentNode.svelte -->
<script lang="ts">
  import { useSvelteFlow, type NodeProps } from '@xyflow/svelte';
  
  let { id, data, selected }: NodeProps = $props();
  let { updateNodeData, deleteElements } = useSvelteFlow();
  
  let isEditing = $state(false);
  let textInput = $state(data.text || '');

  function startEdit() {
    isEditing = true;
    textInput = data.text || '';
  }

  function saveEdit() {
    updateNodeData(id, { text: textInput });
    isEditing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      isEditing = false;
      textInput = data.text || '';
    }
  }

  function deleteNode() {
    deleteElements({ nodes: [{ id }] });
  }
</script>

<div class="comment-node" class:selected class:editing={isEditing}>
  <div class="comment-header">
    <div class="comment-icon">📝</div>
    <div class="comment-title">Note</div>
    {#if selected && !isEditing}
      <div class="node-actions">
        <button on:click={startEdit} class="nodrag" title="Edit">✏️</button>
        <button on:click={deleteNode} class="nodrag delete" title="Delete">🗑️</button>
      </div>
    {/if}
  </div>
  
  <div class="comment-body">
    {#if isEditing}
      <textarea
        bind:value={textInput}
        on:keydown={handleKeydown}
        on:blur={saveEdit}
        class="comment-textarea nodrag"
        placeholder="Add your design notes here..."
        autofocus
        rows="4"
      ></textarea>
      <div class="edit-hint nodrag">
        <small>Click outside or press Escape to save</small>
      </div>
    {:else}
      <div class="comment-text" on:dblclick={startEdit}>
        {data.text || 'Double-click to add notes...'}
      </div>
    {/if}
  </div>
</div>

<style>
  .comment-node {
    background: linear-gradient(135deg, #fff9c4 0%, #fff59d 100%);
    border: 2px solid #f9a825;
    border-radius: 8px;
    min-width: 200px;
    max-width: 300px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  .comment-node.editing {
    box-shadow: 0 4px 16px rgba(249, 168, 37, 0.3);
  }
  
  .comment-node.selected {
    border-color: #f57f17;
    box-shadow: 0 0 0 3px rgba(249, 168, 37, 0.2);
  }
  
  .comment-node:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .comment-header {
    background: rgba(249, 168, 37, 0.2);
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid rgba(249, 168, 37, 0.3);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 6px 6px 0 0;
    position: relative;
  }

  .comment-icon {
    font-size: 1rem;
  }

  .comment-title {
    font-weight: 600;
    color: #f57f17;
    font-size: 0.85rem;
    flex: 1;
  }

  .node-actions {
    display: flex;
    gap: 0.25rem;
  }

  .node-actions button {
    background: white;
    border: 1px solid #f9a825;
    border-radius: 4px;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .node-actions button:hover {
    background: #fff3e0;
    transform: scale(1.1);
  }

  .node-actions button.delete:hover {
    background: #ffebee;
    border-color: #f44336;
  }

  .comment-body {
    padding: 0.75rem;
  }

  .comment-text {
    color: #5d4037;
    font-size: 0.9rem;
    line-height: 1.5;
    cursor: text;
    white-space: pre-wrap;
    word-wrap: break-word;
    min-height: 60px;
  }

  .comment-text:empty::before {
    content: 'Double-click to add notes...';
    color: #a67c52;
    font-style: italic;
  }

  .comment-textarea {
    width: 100%;
    border: 2px solid #f9a825;
    border-radius: 4px;
    padding: 0.5rem;
    font-size: 0.9rem;
    font-family: inherit;
    outline: none;
    resize: vertical;
    min-height: 80px;
    background: white;
    color: #5d4037;
  }

  .comment-textarea:focus {
    border-color: #f57f17;
  }

  .edit-hint {
    margin-top: 0.5rem;
    color: #a67c52;
    font-style: italic;
    text-align: center;
  }
</style>
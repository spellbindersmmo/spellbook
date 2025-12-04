<script>
  import { Handle, Position } from '@xyflow/svelte';
  
  let { data } = $props();
  
  const { classData, typeInfo, onEdit, onDelete, onAddSubclass } = data;
</script>

<div class="class-node" style="--node-color: {typeInfo.color}">
  <Handle type="target" position={Position.Top} />
  
  <div class="node-header">
    <span class="node-icon">{typeInfo.icon}</span>
    <span class="node-badge" style="background: {typeInfo.color}20; color: {typeInfo.color}">
      {typeInfo.label}
    </span>
  </div>
  
  <h4 class="node-title">{classData.name}</h4>
  
  {#if classData.description}
    <p class="node-description">{classData.description}</p>
  {/if}
  
  <div class="node-actions">
    <button class="node-action-btn edit nodrag nopan" on:click={onEdit} title="Edit details">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 2l3 3L6 13H3v-3L11 2z"/>
      </svg>
    </button>
    <button class="node-action-btn add nodrag nopan" on:click={onAddSubclass} title="Add subclass">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3v10M3 8h10"/>
      </svg>
    </button>
    <button class="node-action-btn delete nodrag nopan" on:click={onDelete} title="Delete class">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4l8 8M12 4l-8 8"/>
      </svg>
    </button>
  </div>
  
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .class-node {
    background: rgba(42, 42, 42, 0.95);
    border: 3px solid var(--node-color);
    border-radius: 12px;
    padding: 16px;
    min-width: 200px;
    max-width: 250px;
  }
  
  .node-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  
  .node-icon {
    font-size: 24px;
  }
  
  .node-badge {
    padding: 4px 10px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .node-title {
    color: #e8dcc8;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .node-description {
    color: #a0a0a0;
    font-size: 12px;
    line-height: 1.4;
    margin: 0 0 12px 0;
  }
  
  .node-actions {
    display: flex;
    gap: 6px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .node-action-btn {
    flex: 1;
    padding: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #e8dcc8;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .node-action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .node-action-btn.edit:hover {
    background: rgba(107, 142, 111, 0.2);
    border-color: #6b8e6f;
  }
  
  .node-action-btn.add:hover {
    background: rgba(110, 141, 214, 0.2);
    border-color: #6e8dd6;
  }
  
  .node-action-btn.delete:hover {
    background: rgba(214, 110, 110, 0.2);
    border-color: #d66e6e;
  }
</style>
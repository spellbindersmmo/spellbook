<script>
  import { Handle, Position } from '@xyflow/svelte';
  
  let { data } = $props();
  
  const { subclass, tier, onEdit, onDelete, onAddChild } = data;
</script>

<div class="subclass-node" class:tier-1={tier === 1} class:tier-2plus={tier > 1}>
  <Handle type="target" position={Position.Top} />
  
  <div class="node-header">
    <span class="node-icon">{tier === 1 ? '⚡' : '✨'}</span>
    <span class="tier-badge">Tier {tier}</span>
  </div>
  
  <h4 class="node-title">{subclass.name}</h4>
  
  {#if subclass.description}
    <p class="node-description">{subclass.description}</p>
  {/if}
  
  <div class="node-actions">
    <button class="node-action-btn edit nodrag nopan" on:click={onEdit} title="Edit details">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 2l3 3L6 13H3v-3L11 2z"/>
      </svg>
    </button>
    <button class="node-action-btn add nodrag nopan" on:click={onAddChild} title="Add specialization">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3v10M3 8h10"/>
      </svg>
    </button>
    <button class="node-action-btn delete nodrag nopan" on:click={onDelete} title="Delete subclass">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4l8 8M12 4l-8 8"/>
      </svg>
    </button>
  </div>
  
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .subclass-node {
    background: rgba(42, 42, 42, 0.9);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    padding: 14px;
    min-width: 160px;
    max-width: 200px;
  }
  
  .subclass-node.tier-1 {
    border-color: rgba(110, 141, 214, 0.4);
  }
  
  .subclass-node.tier-2plus {
    border-color: rgba(182, 141, 214, 0.4);
    opacity: 0.9;
  }
  
  .node-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .node-icon {
    font-size: 20px;
  }
  
  .tier-badge {
    padding: 3px 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .node-title {
    color: #e8dcc8;
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 6px 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .node-description {
    color: #a0a0a0;
    font-size: 11px;
    line-height: 1.3;
    margin: 0 0 10px 0;
  }
  
  .node-actions {
    display: flex;
    gap: 4px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .node-action-btn {
    flex: 1;
    padding: 5px;
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
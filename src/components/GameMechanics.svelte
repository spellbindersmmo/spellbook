<script lang="ts">
  import { SvelteFlow, Controls, Background, MiniMap, Panel } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import type { Project } from '../types';
  import ProcessNode from './nodes/ProcessNode.svelte';
  import StartNode from './nodes/StartNode.svelte';
  import EndNode from './nodes/EndNode.svelte';
  import DecisionNode from './nodes/DecisionNode.svelte';
  import CommentNode from './nodes/CommentNode.svelte';
  import LoopNode from './nodes/LoopNode.svelte';
  import { supabase } from '$lib/supabase';
  import CardDatabase from './carddatabase/CardDatabase.svelte';

  interface Props {
    project: Project;
  }

  let { project }: Props = $props();

  // Tool selection state
  let activeTool = $state<'select' | 'flowchart' | 'cards'>('select');

  const mechanicsTools = [
    {
      id: 'flowchart',
      name: 'Flow Charts',
      icon: '📊',
      description: 'Visual game flow and turn sequences',
      color: '#9FB396'
    },
    {
      id: 'cards',
      name: 'Card Database',
      icon: '🎴',
      description: 'Create and manage game cards',
      color: '#D4A574'
    },
    {
      id: 'systems',
      name: 'Game Systems',
      icon: '⚙️',
      description: 'Core mechanics and rules',
      color: '#8A9B7A',
      comingSoon: true
    },
    {
      id: 'items',
      name: 'Items & Inventory',
      icon: '🎒',
      description: 'Equipment and item management',
      color: '#E08B68',
      comingSoon: true
    }
  ];

  // ============= FLOWCHART STATE (existing code) =============
  const nodeTypes = {
    process: ProcessNode,
    start: StartNode,
    end: EndNode,
    decision: DecisionNode,
    comment: CommentNode,
    loop: LoopNode
  };

  const defaultEdgeOptions = {
    type: 'smoothstep',
    animated: false
  };

  let nodes = $state.raw([
    {
      id: '1',
      type: 'start',
      data: { label: 'Start Turn' },
      position: { x: 250, y: 50 }
    },
    {
      id: '2',
      type: 'end',
      data: { label: 'End Turn' },
      position: { x: 250, y: 200 }
    }
  ]);

  let edges = $state.raw([
    { 
      id: 'e1-2', 
      source: '1', 
      target: '2', 
      type: 'smoothstep', 
      label: '', 
      baseLabel: '', 
      selected: false, 
      resources: [] 
    }
  ]);

  let nodeIdCounter = 3;
  let selectedEdgeId = $state<string | null>(null);
  let edgeLabelInput = $state('');
  let showEdgeEditor = $state(false);
  let edgeType = $state<'smoothstep' | 'straight' | 'step' | 'bezier'>('smoothstep');
  
  // Save/Load state
  let currentFlowId = $state<string | null>(null);
  let flowName = $state('Untitled Flow');
  let flowDescription = $state('');
  let isSaving = $state(false);
  let saveMessage = $state('');
  let showSaveDialog = $state(false);
  let savedFlows = $state<any[]>([]);
  let showLoadDialog = $state(false);
  let autoSaveEnabled = $state(true);
  let lastSavedAt = $state<Date | null>(null);
  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Resource flow editor
  let edgeResources = $state<Array<{icon: string, value: string, color: string}>>([]);
  let newResourceIcon = $state('');
  let newResourceValue = $state('');
  let newResourceColor = $state('#D4A574');

  const resourcePresets = [
    { icon: '💰', label: 'Gold', color: '#D4A574' },
    { icon: '❤️', label: 'Health', color: '#E08B68' },
    { icon: '🎴', label: 'Cards', color: '#9FB396' },
    { icon: '⚡', label: 'Energy', color: '#8A9B7A' },
    { icon: '🛡️', label: 'Armor', color: '#7D7669' },
    { icon: '⚔️', label: 'Attack', color: '#E08B68' },
    { icon: '🔮', label: 'Mana', color: '#7A8C6F' },
    { icon: '⭐', label: 'Points', color: '#D4A574' },
    { icon: '🎯', label: 'Actions', color: '#9FB396' },
    { icon: '💎', label: 'Gems', color: '#8A9B7A' }
  ];

  const nodeTemplates = [
    { type: 'start', label: 'Start', icon: '▶️', description: 'Begin a process' },
    { type: 'process', label: 'Process', icon: '⚙️', description: 'A step in the flow' },
    { type: 'decision', label: 'Decision', icon: '❓', description: 'Conditional branching' },
    { type: 'loop', label: 'Loop', icon: '🔄', description: 'Repeat actions' },
    { type: 'end', label: 'End', icon: '🏁', description: 'End a process' },
    { type: 'comment', label: 'Comment', icon: '📝', description: 'Design notes & comments' }
  ];

  const edgeTypes = [
    { value: 'smoothstep', label: 'Smooth Step', icon: '〰️' },
    { value: 'straight', label: 'Straight', icon: '━' },
    { value: 'step', label: 'Step', icon: '⊏⊐' },
    { value: 'bezier', label: 'Bezier', icon: '⌇' }
  ];

  let draggedType = $state(null);
  let previousEdgeCount = $state(edges.length);

  // Load flows on mount (only for flowchart)
  $effect(() => {
    if (activeTool === 'flowchart') {
      loadFlows();
    }
  });

  // Auto-save when nodes or edges change
  $effect(() => {
    if (activeTool !== 'flowchart') return;
    
    // Track nodes and edges for changes
    const _ = [nodes, edges];
    
    // Only autosave if we have a current flow and autosave is enabled
    if (currentFlowId && autoSaveEnabled && !isSaving) {
      scheduleAutoSave();
    }
  });

  function scheduleAutoSave() {
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Schedule autosave after 3 seconds of inactivity
    autoSaveTimeout = setTimeout(() => {
      autoSave();
    }, 3000);
  }

  async function autoSave() {
    if (!currentFlowId || isSaving) return;

    const flowData = {
      nodes: nodes,
      edges: edges
    };

    try {
      const { error } = await supabase
        .from('game_flows')
        .update(flowData)
        .eq('id', currentFlowId);

      if (!error) {
        lastSavedAt = new Date();
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }

  async function loadFlows() {
    const { data, error } = await supabase
      .from('game_flows')
      .select('*')
      .eq('project_id', project.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading flows:', error);
    } else {
      savedFlows = data || [];
    }
  }

  async function saveFlow() {
    if (!flowName.trim()) {
      saveMessage = 'Please enter a flow name';
      return;
    }

    isSaving = true;
    saveMessage = '';

    const flowData = {
      project_id: project.id,
      name: flowName.trim(),
      description: flowDescription.trim(),
      nodes: nodes,
      edges: edges
    };

    try {
      if (currentFlowId) {
        // Update existing flow
        const { error } = await supabase
          .from('game_flows')
          .update(flowData)
          .eq('id', currentFlowId);

        if (error) throw error;
        saveMessage = 'Flow updated successfully!';
        lastSavedAt = new Date();
      } else {
        // Create new flow
        const { data, error } = await supabase
          .from('game_flows')
          .insert([flowData])
          .select()
          .single();

        if (error) throw error;
        currentFlowId = data.id;
        saveMessage = 'Flow saved successfully!';
        lastSavedAt = new Date();
      }

      await loadFlows();
      
      setTimeout(() => {
        saveMessage = '';
        showSaveDialog = false;
      }, 2000);
    } catch (error) {
      console.error('Error saving flow:', error);
      saveMessage = 'Error saving flow. Please try again.';
    } finally {
      isSaving = false;
    }
  }

  async function loadFlowById(flowId: string) {
    const { data, error } = await supabase
      .from('game_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (error) {
      console.error('Error loading flow:', error);
      return;
    }

    if (data) {
      currentFlowId = data.id;
      flowName = data.name;
      flowDescription = data.description || '';
      nodes = data.nodes;
      edges = data.edges;
      lastSavedAt = new Date(data.updated_at);
      
      // Update nodeIdCounter to prevent ID conflicts
      const maxNodeId = Math.max(...nodes.map((n: any) => {
        const match = n.id.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      }));
      nodeIdCounter = maxNodeId + 1;
      
      showLoadDialog = false;
    }
  }

  async function deleteFlow(flowId: string) {
    if (!confirm('Are you sure you want to delete this flow?')) return;

    const { error } = await supabase
      .from('game_flows')
      .delete()
      .eq('id', flowId);

    if (error) {
      console.error('Error deleting flow:', error);
    } else {
      await loadFlows();
      if (currentFlowId === flowId) {
        newFlow();
      }
    }
  }

  function newFlow() {
    currentFlowId = null;
    flowName = 'Untitled Flow';
    flowDescription = '';
    lastSavedAt = null;
    nodes = [
      {
        id: '1',
        type: 'start',
        data: { label: 'Start Turn' },
        position: { x: 250, y: 50 }
      },
      {
        id: '2',
        type: 'end',
        data: { label: 'End Turn' },
        position: { x: 250, y: 200 }
      }
    ];
    edges = [
      { 
        id: 'e1-2', 
        source: '1', 
        target: '2', 
        type: 'smoothstep', 
        label: '', 
        baseLabel: '', 
        selected: false, 
        resources: [] 
      }
    ];
    nodeIdCounter = 3;
  }

  // Generate edge label with resources
  function generateEdgeLabel(baseLabel: string, resources: any[]) {
    const parts = [];
    
    if (baseLabel) {
      parts.push(baseLabel);
    }
    
    if (resources && resources.length > 0) {
      const resourceStr = resources
        .map((r: any) => `${r.icon} ${r.value}`)
        .join(' ');
      parts.push(resourceStr);
    }
    
    return parts.join(' | ');
  }

  // Auto-label edges from decision/loop nodes (only on new edges)
  $effect(() => {
    if (activeTool !== 'flowchart') return;
    
    if (edges.length > previousEdgeCount) {
      edges = edges.map(edge => {
        if (!edge.baseLabel) {
          const sourceNode = nodes.find(n => n.id === edge.source);
          let baseLabel = '';
          
          if (sourceNode?.type === 'decision') {
            if (edge.sourceHandle === 'yes') {
              baseLabel = 'Yes';
            } else if (edge.sourceHandle === 'no') {
              baseLabel = 'No';
            }
          } else if (sourceNode?.type === 'loop') {
            if (edge.sourceHandle === 'loop') {
              baseLabel = 'Loop';
            } else if (edge.sourceHandle === 'exit') {
              baseLabel = 'Exit';
            }
          }

          return { 
            ...edge, 
            baseLabel,
            label: generateEdgeLabel(baseLabel, edge.resources || []),
            resources: edge.resources || [],
            type: edge.type || 'smoothstep'
          };
        }
        
        if (!edge.resources) {
          return { ...edge, resources: [] };
        }
        if (!edge.type) {
          return { ...edge, type: 'smoothstep' };
        }
        return edge;
      });
    }
    previousEdgeCount = edges.length;
  });

  // Get selected edge
  $effect(() => {
    if (activeTool !== 'flowchart') return;
    
    const selected = edges.find(e => e.selected);
    if (selected && selected.id !== selectedEdgeId) {
      selectedEdgeId = selected.id;
      edgeType = selected.type || 'smoothstep';
    } else if (!selected) {
      selectedEdgeId = null;
      showEdgeEditor = false;
    }
  });

  function onDragStart(event: DragEvent, nodeType: string) {
    if (!event.dataTransfer) return;
    
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/svelteflow', nodeType);
    draggedType = nodeType;
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    
    const type = event.dataTransfer?.getData('application/svelteflow');
    if (!type) return;

    const flowBounds = event.currentTarget?.getBoundingClientRect();
    if (!flowBounds) return;

    const position = {
      x: event.clientX - flowBounds.left - 75,
      y: event.clientY - flowBounds.top - 75
    };

    const newNode: any = {
      id: `node-${nodeIdCounter++}`,
      type,
      data: { 
        label: type === 'start' ? 'Start' : 
               type === 'end' ? 'End' : 
               type === 'decision' ? 'Decision?' : 
               type === 'loop' ? 'For Each...' :
               type === 'process' ? 'New Process' : 
               undefined,
        icon: type === 'process' ? '⚙️' : type === 'decision' ? '❓' : undefined,
        text: type === 'comment' ? '' : undefined
      },
      position
    };

    nodes = [...nodes, newNode];
    draggedType = null;
  }

  function openEdgeLabelEditor() {
    if (!selectedEdgeId) return;
    const edge = edges.find(e => e.id === selectedEdgeId);
    if (edge) {
      edgeLabelInput = edge.baseLabel || '';
      edgeResources = [...(edge.resources || [])];
      edgeType = edge.type || 'smoothstep';
      showEdgeEditor = true;
    }
  }

  function changeEdgeType(newType: string) {
    if (selectedEdgeId) {
      edges = edges.map(edge => 
        edge.id === selectedEdgeId 
          ? { ...edge, type: newType }
          : edge
      );
      edgeType = newType as any;
    }
  }

  function addResource() {
    if (!newResourceIcon || !newResourceValue) return;
    
    edgeResources = [...edgeResources, {
      icon: newResourceIcon,
      value: newResourceValue,
      color: newResourceColor
    }];
    
    newResourceIcon = '';
    newResourceValue = '';
    newResourceColor = '#D4A574';
  }

  function useResourcePreset(preset: any) {
    newResourceIcon = preset.icon;
    newResourceColor = preset.color;
  }

  function removeResource(index: number) {
    edgeResources = edgeResources.filter((_, i) => i !== index);
  }

  function saveEdgeLabel() {
    if (selectedEdgeId) {
      const newLabel = generateEdgeLabel(edgeLabelInput, edgeResources);
      edges = edges.map(edge => 
        edge.id === selectedEdgeId 
          ? { ...edge, baseLabel: edgeLabelInput, resources: edgeResources, label: newLabel, type: edgeType }
          : edge
      );
    }
    closeEdgeEditor();
  }

  function deleteSelectedEdge() {
    if (selectedEdgeId) {
      edges = edges.filter(edge => edge.id !== selectedEdgeId);
    }
    closeEdgeEditor();
  }

  function closeEdgeEditor() {
    showEdgeEditor = false;
    edgeLabelInput = '';
    edgeResources = [];
    newResourceIcon = '';
    newResourceValue = '';
  }

  function formatLastSaved() {
    if (!lastSavedAt) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSavedAt.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 10) return 'Saved just now';
    if (diffSecs < 60) return `Saved ${diffSecs}s ago`;
    if (diffMins < 60) return `Saved ${diffMins}m ago`;
    
    return `Saved at ${lastSavedAt.toLocaleTimeString()}`;
  }

  // Update last saved time display every 10 seconds
  $effect(() => {
    if (activeTool !== 'flowchart') return;
    
    const interval = setInterval(() => {
      if (lastSavedAt) {
        // Force re-render
        lastSavedAt = lastSavedAt;
      }
    }, 10000);

    return () => clearInterval(interval);
  });
</script>

<div class="mechanics-container">
  {#if activeTool === 'select'}
    <!-- Tool Selection View -->
    <div class="tool-selection">
      <div class="selection-header">
        <h2 class="selection-title">⚙️ Game Mechanics Tools</h2>
        <p class="selection-subtitle">Choose a tool to design your game mechanics</p>
      </div>

      <div class="tools-grid">
        {#each mechanicsTools as tool}
          <button
            class="tool-card"
            class:coming-soon={tool.comingSoon}
            style="--tool-color: {tool.color}"
            on:click={() => !tool.comingSoon && (activeTool = tool.id)}
            disabled={tool.comingSoon}
          >
            <div class="tool-icon">{tool.icon}</div>
            <h3 class="tool-name">{tool.name}</h3>
            <p class="tool-description">{tool.description}</p>
            {#if tool.comingSoon}
              <span class="coming-soon-badge">Coming Soon</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

  {:else if activeTool === 'flowchart'}
    <!-- Flowchart Tool (existing flowchart UI) -->
    <div class="tool-view">
      <!-- Header -->
      <div class="mechanics-header">
        <div class="header-content">
          <div class="header-left">
            <button 
              class="back-btn"
              on:click={() => activeTool = 'select'}
            >
              ← Back to Tools
            </button>
            <div class="header-divider"></div>
            <div>
              <h2 class="header-title">📊 Flow Charts - {flowName}</h2>
              <div class="header-meta">
                {#if flowDescription}
                  <p class="flow-description">{flowDescription}</p>
                {/if}
                {#if currentFlowId && lastSavedAt}
                  <p class="autosave-indicator">
                    <span class="status-dot"></span>
                    {formatLastSaved()}
                  </p>
                {/if}
              </div>
            </div>
          </div>
          <div class="header-actions">
            {#if currentFlowId}
              <label class="autosave-toggle">
                <input 
                  type="checkbox" 
                  bind:checked={autoSaveEnabled}
                />
                Auto-save
              </label>
            {/if}
            <button 
              on:click|stopPropagation={newFlow}
              type="button"
              class="btn btn-secondary"
            >
              🆕 New Flow
            </button>
            <button 
              on:click|stopPropagation={() => showLoadDialog = true}
              type="button"
              class="btn btn-accent"
            >
              📂 Load Flow
            </button>
            <button 
              on:click|stopPropagation={() => showSaveDialog = true}
              type="button"
              class="btn btn-primary"
            >
              💾 Save Flow
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content: Sidebar + Canvas -->
      <div class="mechanics-main">
        <!-- Left Sidebar -->
        <div class="sidebar">
          <h3 class="sidebar-title">Node Types</h3>
          <p class="sidebar-subtitle">Drag nodes onto the canvas</p>
          
          <div class="node-templates">
            {#each nodeTemplates as template}
              <div 
                draggable="true"
                on:dragstart={(e) => onDragStart(e, template.type)}
                class="node-template"
              >
                <div class="template-header">
                  <span class="template-icon">{template.icon}</span>
                  <span class="template-label">{template.label}</span>
                </div>
                <p class="template-description">{template.description}</p>
              </div>
            {/each}
          </div>

          <div class="sidebar-tips">
            <h4 class="tips-title">Tips</h4>
            <ul class="tips-list">
              <li>Drag nodes from here to the canvas</li>
              <li>Click edges to change line style</li>
              <li>Add resource flows to edges</li>
              <li>Loop nodes have 2 outputs</li>
              <li>Double-click to edit nodes</li>
              {#if autoSaveEnabled && currentFlowId}
                <li class="tip-success">✓ Auto-save is enabled</li>
              {/if}
            </ul>
          </div>
        </div>

        <!-- Flow Canvas -->
        <div 
          class="canvas-container"
          on:drop={onDrop}
          on:dragover={onDragOver}
        >
          <SvelteFlow 
            bind:nodes 
            bind:edges 
            {nodeTypes}
            {defaultEdgeOptions}
            edgesReconnectable={true}
            fitView
          >
            <Controls />
            <Background />
            <MiniMap />
            
            <Panel position="top-right">
              <div class="stats-panel">
                <div class="stats-text">
                  <strong>{nodes.length}</strong> nodes • <strong>{edges.length}</strong> connections
                </div>
              </div>
            </Panel>

            {#if selectedEdgeId}
              <Panel position="top-center">
                <div class="edge-toolbar">
                  <button 
                    on:click={openEdgeLabelEditor}
                    class="btn btn-primary btn-sm"
                  >
                    ✏️ Edit Connection
                  </button>
                  
                  <!-- Quick edge type selector -->
                  <div class="edge-type-selector">
                    {#each edgeTypes as type}
                      <button
                        on:click={() => changeEdgeType(type.value)}
                        title={type.label}
                        class="edge-type-btn"
                        class:active={edgeType === type.value}
                      >
                        {type.icon}
                      </button>
                    {/each}
                  </div>
                </div>
              </Panel>
            {/if}
          </SvelteFlow>

          <!-- Save Dialog -->
          {#if showSaveDialog}
            <div class="dialog-overlay" on:click={() => showSaveDialog = false}></div>
            <div class="dialog">
              <h3 class="dialog-title">Save Flow</h3>
              
              <div class="form-group">
                <label class="form-label">Flow Name</label>
                <input
                  type="text"
                  bind:value={flowName}
                  placeholder="e.g., Turn Sequence"
                  class="input nodrag"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Description (Optional)</label>
                <textarea
                  bind:value={flowDescription}
                  placeholder="Describe this flow..."
                  rows="3"
                  class="input nodrag"
                ></textarea>
              </div>

              {#if saveMessage}
                <div class="save-message" class:error={saveMessage.includes('Error')}>
                  {saveMessage}
                </div>
              {/if}

              <div class="dialog-actions">
                <button 
                  on:click={saveFlow} 
                  disabled={isSaving}
                  class="btn btn-primary nodrag"
                  style="opacity: {isSaving ? 0.6 : 1};"
                >
                  {isSaving ? 'Saving...' : '💾 Save'}
                </button>
                <button 
                  on:click={() => showSaveDialog = false}
                  class="btn btn-secondary nodrag"
                >
                  Cancel
                </button>
              </div>
            </div>
          {/if}

          <!-- Load Dialog -->
          {#if showLoadDialog}
            <div class="dialog-overlay" on:click={() => showLoadDialog = false}></div>
            <div class="dialog dialog-wide">
              <h3 class="dialog-title">Load Flow</h3>
              
              {#if savedFlows.length === 0}
                <div class="empty-state">
                  <div class="empty-icon">📂</div>
                  <div class="empty-title">No saved flows yet</div>
                  <p class="empty-description">Create and save your first flow!</p>
                </div>
              {:else}
                <div class="flows-list">
                  {#each savedFlows as flow}
                    <div 
                      class="flow-item"
                      class:active={currentFlowId === flow.id}
                      on:click={() => loadFlowById(flow.id)}
                    >
                      <div class="flow-content">
                        <div class="flow-name">{flow.name}</div>
                        {#if flow.description}
                          <div class="flow-description">{flow.description}</div>
                        {/if}
                        <div class="flow-meta">
                          Updated: {new Date(flow.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        on:click|stopPropagation={() => deleteFlow(flow.id)}
                        class="btn-delete nodrag"
                      >
                        🗑️
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}

              <div class="dialog-actions">
                <button 
                  on:click={() => showLoadDialog = false}
                  class="btn btn-secondary nodrag"
                  style="width: 100%;"
                >
                  Close
                </button>
              </div>
            </div>
          {/if}

          <!-- Edge Editor -->
          {#if showEdgeEditor}
            <div class="dialog-overlay" on:click={closeEdgeEditor}></div>
            <div class="edge-editor">
              <h3 class="dialog-title">Edit Connection</h3>
              
              <!-- Edge Type Section -->
              <div class="form-group">
                <label class="form-label">Line Style</label>
                <div class="edge-type-grid">
                  {#each edgeTypes as type}
                    <button
                      on:click={() => changeEdgeType(type.value)}
                      class="edge-type-card nodrag"
                      class:active={edgeType === type.value}
                    >
                      <span class="type-icon">{type.icon}</span>
                      <span class="type-label">{type.label}</span>
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Label Section -->
              <div class="form-group">
                <label class="form-label">Label</label>
                <input
                  type="text"
                  bind:value={edgeLabelInput}
                  placeholder="e.g., Yes, No, then..."
                  class="input nodrag"
                  on:keydown={(e) => {
                    if (e.key === 'Enter') saveEdgeLabel();
                    if (e.key === 'Escape') closeEdgeEditor();
                  }}
                />
              </div>

              <!-- Resource Flow Section -->
              <div class="form-group">
                <label class="form-label">Resource Flows</label>
                
                <!-- Existing Resources -->
                {#if edgeResources.length > 0}
                  <div class="resources-list">
                    {#each edgeResources as resource, index}
                      <div 
                        class="resource-tag"
                        style="background: {resource.color};"
                      >
                        <span>{resource.icon} {resource.value}</span>
                        <button
                          on:click={() => removeResource(index)}
                          class="resource-remove nodrag"
                        >
                          ×
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}

                <!-- Resource Presets -->
                <div class="presets-section">
                  <div class="presets-label">Quick add:</div>
                  <div class="presets-grid">
                    {#each resourcePresets as preset}
                      <button
                        on:click={() => useResourcePreset(preset)}
                        class="preset-btn nodrag"
                        style="background: {preset.color};"
                        title={preset.label}
                      >
                        {preset.icon}
                      </button>
                    {/each}
                  </div>
                </div>

                <!-- Add New Resource -->
                <div class="resource-input-group">
                  <input
                    type="text"
                    bind:value={newResourceIcon}
                    placeholder="Icon (e.g., 💰)"
                    class="input input-sm nodrag"
                  />
                  <input
                    type="text"
                    bind:value={newResourceValue}
                    placeholder="Value (e.g., +5)"
                    class="input input-sm nodrag"
                  />
                  <input
                    type="color"
                    bind:value={newResourceColor}
                    class="color-input nodrag"
                  />
                  <button
                    on:click={addResource}
                    class="btn btn-primary btn-sm nodrag"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="dialog-actions">
                <button on:click={saveEdgeLabel} class="btn btn-primary">
                  ✓ Save
                </button>
                <button on:click={closeEdgeEditor} class="btn btn-secondary">
                  Cancel
                </button>
                <button on:click={deleteSelectedEdge} class="btn-delete-edge">
                  🗑️ Delete
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

  {:else if activeTool === 'cards'}
    <!-- Card Database Tool -->
    <CardDatabase {project} />
  {/if}
</div>

<style>
  /* Container */
  .mechanics-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--warm-gray-700);
  }

  /* ============= TOOL SELECTION STYLES ============= */
  .tool-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 3rem 2rem;
    overflow-y: auto;
    background: var(--warm-gray-700);
  }

  .selection-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .selection-title {
    font-size: 2rem;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 0.5rem 0;
  }

  .selection-subtitle {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .tool-card {
    background: var(--warm-gray-600);
    border: 2px solid rgba(227, 223, 215, 0.15);
    border-radius: var(--radius-lg);
    padding: 2rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .tool-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--tool-color);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .tool-card:hover:not(.coming-soon) {
    border-color: var(--tool-color);
    background: var(--warm-gray-500);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .tool-card:hover:not(.coming-soon)::before {
    opacity: 1;
  }

  .tool-card.coming-soon {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tool-icon {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
  }

  .tool-name {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 0.75rem 0;
  }

  .tool-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: var(--line-height-relaxed);
  }

  .coming-soon-badge {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.375rem 0.875rem;
    background: rgba(227, 223, 215, 0.1);
    color: var(--color-text-tertiary);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ============= TOOL VIEW STYLES ============= */
  .tool-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .placeholder-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem;
    background: var(--warm-gray-700);
  }

  .placeholder-icon {
    font-size: 5rem;
    margin-bottom: 1.5rem;
    opacity: 0.6;
  }

  .placeholder-title {
    font-size: 1.75rem;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 1rem 0;
  }

  .placeholder-description {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    margin: 0;
    max-width: 500px;
  }

  /* ============= HEADER STYLES ============= */
  .mechanics-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--warm-gray-600);
    flex-shrink: 0;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    min-width: 0;
  }

  .back-btn {
    background: var(--warm-gray-500);
    color: var(--color-text-secondary);
    border: 1px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-md);
    padding: 0.5rem 1rem;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .back-btn:hover {
    background: var(--warm-gray-400);
    color: var(--color-text-primary);
    border-color: rgba(227, 223, 215, 0.3);
  }

  .header-divider {
    width: 1px;
    height: 24px;
    background: rgba(227, 223, 215, 0.2);
  }

  .header-title {
    margin: 0 0 0.5rem 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .flow-description {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .autosave-indicator {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-success);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    background: var(--color-success);
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(159, 179, 150, 0.5);
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .autosave-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  .autosave-toggle input {
    cursor: pointer;
  }

  /* ============= MAIN LAYOUT (FLOWCHART) ============= */
  .mechanics-main {
    flex: 1;
    display: flex;
    background: var(--warm-gray-600);
    overflow: hidden;
  }

  /* Sidebar */
  .sidebar {
    width: 280px;
    background: var(--warm-gray-500);
    border-right: 1px solid rgba(227, 223, 215, 0.2);
    padding: 1.5rem;
    overflow-y: auto;
  }

  .sidebar-title {
    margin: 0 0 0.5rem 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .sidebar-subtitle {
    margin: 0 0 1.5rem 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-tertiary);
  }

  .node-templates {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .node-template {
    background: var(--warm-gray-400);
    border: 2px dashed rgba(227, 223, 215, 0.3);
    border-radius: var(--radius-md);
    padding: 1rem;
    cursor: grab;
    transition: all var(--transition-fast);
  }

  .node-template:hover {
    border-color: var(--color-primary);
    background: var(--warm-gray-300);
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }

  .node-template:active {
    cursor: grabbing;
  }

  .template-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .template-icon {
    font-size: 1.25rem;
  }

  .template-label {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
  }

  .template-description {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    line-height: var(--line-height-normal);
  }

  .sidebar-tips {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(227, 223, 215, 0.2);
  }

  .tips-title {
    margin: 0 0 0.75rem 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .tips-list {
    margin: 0;
    padding-left: 1.25rem;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    line-height: 1.6;
  }

  .tips-list li {
    margin-bottom: 0.5rem;
  }

  .tip-success {
    color: var(--color-success);
  }

  /* Canvas */
  .canvas-container {
    flex: 1;
    position: relative;
  }

  .stats-panel {
    background: var(--warm-gray-500);
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    border: 1px solid rgba(227, 223, 215, 0.2);
    box-shadow: var(--shadow-sm);
  }

  .stats-text {
    font-size: var(--font-size-sm);
    color: var(--warm-gray-200);
  }

  .edge-toolbar {
    background: var(--warm-gray-500);
    padding: 0.75rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-primary);
    box-shadow: var(--shadow-md);
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .edge-type-selector {
    display: flex;
    gap: 0.25rem;
    padding-left: 0.75rem;
    border-left: 1px solid rgba(227, 223, 215, 0.2);
  }

  .edge-type-btn {
    background: var(--warm-gray-400);
    color: var(--warm-gray-100);
    border: 1px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.6rem;
    cursor: pointer;
    font-size: 1rem;
    transition: all var(--transition-fast);
  }

  .edge-type-btn:hover {
    background: var(--warm-gray-300);
    border-color: rgba(227, 223, 215, 0.3);
  }

  .edge-type-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  /* Dialogs */
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(36, 33, 28, 0.7);
    z-index: 100;
    backdrop-filter: blur(2px);
  }

  .dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--warm-gray-500);
    padding: 2rem;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(227, 223, 215, 0.2);
    box-shadow: var(--shadow-xl);
    min-width: 400px;
    max-width: 600px;
    z-index: 101;
  }

  .dialog-wide {
    min-width: 500px;
  }

  .dialog-title {
    margin: 0 0 1.5rem 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .save-message {
    margin-bottom: 1.25rem;
    padding: 0.75rem 1rem;
    background: var(--color-success-light);
    color: var(--color-success);
    border: 1px solid var(--color-success);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  .save-message.error {
    background: var(--color-error-light);
    color: var(--color-error);
    border-color: var(--color-error);
  }

  .dialog-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  /* Flows List */
  .flows-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .flow-item {
    padding: 1rem;
    border: 1px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-md);
    margin-bottom: 0.75rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    background: var(--warm-gray-400);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .flow-item:hover {
    border-color: rgba(227, 223, 215, 0.3);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
    background: var(--warm-gray-300);
  }

  .flow-item.active {
    background: var(--color-primary-light);
    border-color: var(--color-primary);
  }

  .flow-content {
    flex: 1;
  }

  .flow-name {
    font-weight: var(--font-weight-semibold);
    margin-bottom: 0.25rem;
    color: var(--color-text-primary);
  }

  .flow-item .flow-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .flow-meta {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  .btn-delete {
    background: var(--color-error-light);
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: var(--font-size-xs);
    transition: all var(--transition-fast);
  }

  .btn-delete:hover {
    background: var(--color-error);
    color: white;
  }

  /* Edge Editor */
  .edge-editor {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--warm-gray-500);
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    border: 2px solid var(--color-primary);
    box-shadow: var(--shadow-xl);
    min-width: 450px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 11;
  }

  .edge-type-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .edge-type-card {
    background: var(--warm-gray-400);
    border: 2px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all var(--transition-fast);
  }

  .edge-type-card:hover {
    background: var(--warm-gray-300);
    border-color: rgba(227, 223, 215, 0.3);
  }

  .edge-type-card.active {
    background: var(--color-primary-light);
    border-color: var(--color-primary);
  }

  .type-icon {
    font-size: 1.2rem;
  }

  .type-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .edge-type-card.active .type-label {
    color: var(--color-primary);
  }

  .resources-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .resource-tag {
    color: white;
    padding: 0.4rem 0.75rem;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .resource-remove {
    background: rgba(255,255,255,0.3);
    border: none;
    color: white;
    cursor: pointer;
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: bold;
    transition: all var(--transition-fast);
  }

  .resource-remove:hover {
    background: rgba(255,255,255,0.5);
  }

  .presets-section {
    margin-bottom: 1rem;
  }

  .presets-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    margin-bottom: 0.5rem;
  }

  .presets-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .preset-btn {
    color: white;
    border: none;
    padding: 0.4rem 0.7rem;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .preset-btn:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-sm);
  }

  .resource-input-group {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
  }

  .input-sm {
    flex: 1;
  }

  .color-input {
    width: 50px;
    height: 38px;
    border: 1px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .btn-delete-edge {
    background: var(--color-error-light);
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
  }

  .btn-delete-edge:hover {
    background: var(--color-error);
    color: white;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
  }

  .empty-icon {
    font-size: 3.5rem;
    opacity: 0.4;
    margin-bottom: 1rem;
  }

  .empty-title {
    font-size: 1.125rem;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin-bottom: 0.5rem;
  }

  .empty-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
  }

  /* Scrollbar */
  .sidebar::-webkit-scrollbar,
  .flows-list::-webkit-scrollbar,
  .edge-editor::-webkit-scrollbar,
  .tool-selection::-webkit-scrollbar {
    width: 8px;
  }

  .sidebar::-webkit-scrollbar-track,
  .flows-list::-webkit-scrollbar-track,
  .edge-editor::-webkit-scrollbar-track,
  .tool-selection::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar::-webkit-scrollbar-thumb,
  .flows-list::-webkit-scrollbar-thumb,
  .edge-editor::-webkit-scrollbar-thumb,
  .tool-selection::-webkit-scrollbar-thumb {
    background: rgba(159, 179, 150, 0.25);
    border-radius: var(--radius-sm);
  }

  .sidebar::-webkit-scrollbar-thumb:hover,
  .flows-list::-webkit-scrollbar-thumb:hover,
  .edge-editor::-webkit-scrollbar-thumb:hover,
  .tool-selection::-webkit-scrollbar-thumb:hover {
    background: rgba(159, 179, 150, 0.35);
  }

  /* SvelteFlow Dark Mode */
  :global(.svelte-flow) {
    background: var(--warm-gray-800) !important;
  }

  :global(.svelte-flow__background) {
    background: var(--warm-gray-800) !important;
  }

  :global(.svelte-flow__background-pattern) {
    stroke: rgba(227, 223, 215, 0.1) !important;
  }

  :global(.svelte-flow__edge-path) {
    stroke: var(--warm-gray-400) !important;
  }

  :global(.svelte-flow__edge.selected .svelte-flow__edge-path) {
    stroke: var(--color-primary) !important;
  }

  :global(.svelte-flow__edge-text) {
    fill: var(--warm-gray-200) !important;
  }

  :global(.svelte-flow__edge-textbg) {
    fill: var(--warm-gray-700) !important;
  }

  :global(.svelte-flow__controls) {
    background: var(--warm-gray-600) !important;
    border: 1px solid rgba(227, 223, 215, 0.2) !important;
    border-radius: var(--radius-md) !important;
  }

  :global(.svelte-flow__controls-button) {
    background: var(--warm-gray-500) !important;
    border-bottom: 1px solid rgba(227, 223, 215, 0.1) !important;
    color: var(--warm-gray-200) !important;
  }

  :global(.svelte-flow__controls-button:hover) {
    background: var(--warm-gray-400) !important;
  }

  :global(.svelte-flow__controls-button svg) {
    fill: var(--warm-gray-200) !important;
  }

  :global(.svelte-flow__minimap) {
    background: var(--warm-gray-700) !important;
    border: 1px solid rgba(227, 223, 215, 0.2) !important;
    border-radius: var(--radius-md) !important;
  }

  :global(.svelte-flow__minimap-mask) {
    fill: var(--warm-gray-800) !important;
    fill-opacity: 0.8 !important;
  }

  :global(.svelte-flow__minimap-node) {
    fill: var(--warm-gray-500) !important;
    stroke: var(--warm-gray-400) !important;
  }

  :global(.svelte-flow__selection) {
    background: rgba(159, 179, 150, 0.1) !important;
    border: 1px solid var(--color-primary) !important;
  }

  :global(.svelte-flow__edge.animated .svelte-flow__edge-path) {
    stroke-dasharray: 5;
    animation: dashdraw 0.5s linear infinite;
  }

  :global(.svelte-flow__handle) {
    background: var(--warm-gray-400) !important;
    border: 2px solid var(--warm-gray-700) !important;
  }

  :global(.svelte-flow__handle.connectable:hover) {
    background: var(--color-primary) !important;
  }

  @keyframes dashdraw {
    from {
      stroke-dashoffset: 10;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
</style>
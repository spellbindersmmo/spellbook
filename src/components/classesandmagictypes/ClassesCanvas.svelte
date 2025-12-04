<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { SvelteFlow, Controls, Background, MiniMap } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import ClassNode from '../nodes/ClassNode.svelte';
  import SubclassNode from '../nodes/SubclassNode.svelte';
  
  let { world, onClose } = $props();
  
  // View state
  let currentView = $state('flowchart');
  let selectedClass = $state(null);
  let selectedSubclass = $state(null);
  
  // World selection
  let worlds = $state([]);
  let selectedWorldId = $state(null);
  
  // Data
  let classes = $state([]);
  let allSubclasses = $state([]);
  let subclasses = $state([]);
  
  // Flowchart
  let nodes = $state.raw([]);
  let edges = $state.raw([]);
  
  const nodeTypes = {
    classNode: ClassNode,
    subclassNode: SubclassNode
  };
  
  // Modals
  let showAddClassModal = $state(false);
  let showAddSubclassModal = $state(false);
  let newClassName = $state('');
  let newClassDescription = $state('');
  let newClassType = $state('martial');
  let newSubclassName = $state('');
  let newSubclassDescription = $state('');
  let newSubclassTier = $state(1);
  let parentClassForSubclass = $state(null);
  let parentSubclassForSubclass = $state(null);
  
  // Canvas state
  let canvasContainer;
  let canvasTransform = $state({ x: 0, y: 0, scale: 1 });
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0 });
  let lastPanPosition = $state({ x: 0, y: 0 });
  let blocks = $state([]);
  let selectedBlock = $state(null);
  let draggingBlock = $state(null);
  let dragOffset = $state({ x: 0, y: 0 });
  let showAddMenu = $state(false);
  let addMenuPosition = $state({ x: 0, y: 0 });
  
  const blockTypes = [
    { type: 'heading', label: 'Heading', icon: '📌' },
    { type: 'text', label: 'Text Block', icon: '📝' },
    { type: 'ability', label: 'Class Ability', icon: '⚔️' },
    { type: 'feature', label: 'Class Feature', icon: '✨' },
    { type: 'progression', label: 'Level Progression', icon: '📊' },
    { type: 'stats', label: 'Stat Block', icon: '🎲' },
    { type: 'equipment', label: 'Equipment', icon: '🛡️' },
    { type: 'note', label: 'Design Note', icon: '📋' },
  ];
  
  const classTypes = [
    { value: 'martial', label: 'Martial', icon: '⚔️', color: '#d66e6e' },
    { value: 'caster', label: 'Caster', icon: '✨', color: '#6e8dd6' },
    { value: 'hybrid', label: 'Hybrid', icon: '🌟', color: '#b68dd6' },
    { value: 'other', label: 'Other', icon: '🎭', color: '#6b8e6f' },
  ];
  
  onMount(() => {
    loadWorlds();
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (currentView === 'canvas') {
          if (selectedSubclass) {
            selectedSubclass = null;
            loadBlocks(selectedClass.id, null);
          } else {
            backToFlowchart();
          }
        } else {
          showAddClassModal = false;
          showAddSubclassModal = false;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
  
  async function loadWorlds() {
    const { data, error } = await supabase
      .from('worlds')
      .select('*')
      .eq('project_id', world.id)
      .order('name');
    
    if (!error && data && data.length > 0) {
      worlds = data;
      selectedWorldId = data[0].id;
    }
  }
  
  $effect(() => {
    if (selectedWorldId) {
      loadClasses();
      loadAllSubclasses();
    }
  });
  
  async function loadClasses() {
    if (!selectedWorldId) return;
    
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('world_id', selectedWorldId)
      .order('name');
    
    if (!error) {
      classes = data || [];
      // Only rebuild after both classes and subclasses are loaded
      if (allSubclasses.length > 0 || classes.length === 0) {
        buildFlowchart();
      }
    }
  }
  
  async function loadAllSubclasses() {
    if (!selectedWorldId) return;
    
    const { data, error } = await supabase
      .from('subclasses')
      .select('*')
      .eq('world_id', selectedWorldId)
      .order('name');
    
    if (!error) {
      allSubclasses = data || [];
      // Rebuild after subclasses are loaded
      buildFlowchart();
    }
  }
  
  function buildFlowchart() {
    console.log('Building flowchart...');
    console.log('Classes:', classes.map(c => ({ id: c.id, name: c.name, flow_x: c.flow_x, flow_y: c.flow_y })));
    console.log('Subclasses:', allSubclasses.map(s => ({ id: s.id, name: s.name, flow_x: s.flow_x, flow_y: s.flow_y })));
    
    const newNodes = [];
    const newEdges = [];
    const xSpacing = 400;
    
    classes.forEach((classData, classIndex) => {
      const typeInfo = getClassTypeInfo(classData.class_type);
      // Only calculate default if position is null or undefined
      const classX = (classData.flow_x !== null && classData.flow_x !== undefined) 
        ? classData.flow_x 
        : 50 + (classIndex * xSpacing);
      const classY = (classData.flow_y !== null && classData.flow_y !== undefined) 
        ? classData.flow_y 
        : 50;
      
      console.log(`Class ${classData.name}: using position (${classX}, ${classY}) - from DB: (${classData.flow_x}, ${classData.flow_y})`);
      
      newNodes.push({
        id: `class-${classData.id}`,
        type: 'classNode',
        draggable: true,
        data: { 
          classData,
          typeInfo,
          onEdit: () => openClassCanvas(classData),
          onDelete: (e) => { e.stopPropagation(); deleteClass(classData.id); },
          onAddSubclass: (e) => { e.stopPropagation(); openAddSubclassModal(classData, null); }
        },
        position: { x: classX, y: classY }
      });
      
      const tier1Subclasses = allSubclasses.filter(s => 
        s.class_id === classData.id && 
        (s.tier || 1) === 1 && 
        !s.parent_subclass_id
      );
      
      tier1Subclasses.forEach((subclass, subIndex) => {
        const subX = (subclass.flow_x !== null && subclass.flow_x !== undefined)
          ? subclass.flow_x
          : classX + (subIndex - tier1Subclasses.length / 2 + 0.5) * 250;
        const subY = (subclass.flow_y !== null && subclass.flow_y !== undefined)
          ? subclass.flow_y
          : classY + 200;
        
        newNodes.push({
          id: `subclass-${subclass.id}`,
          type: 'subclassNode',
          draggable: true,
          data: {
            subclass,
            tier: 1,
            onEdit: () => {
              selectedClass = classData;
              openSubclassCanvas(subclass);
            },
            onDelete: (e) => { e.stopPropagation(); deleteSubclass(subclass.id); },
            onAddChild: (e) => { e.stopPropagation(); openAddSubclassModal(classData, subclass); }
          },
          position: { x: subX, y: subY }
        });
        
        newEdges.push({
          id: `e-class-${classData.id}-sub-${subclass.id}`,
          source: `class-${classData.id}`,
          target: `subclass-${subclass.id}`,
          type: 'smoothstep',
          style: { stroke: typeInfo.color, strokeWidth: 2 }
        });
        
        addChildSubclasses(subclass, classData, typeInfo, newNodes, newEdges, subX, subY + 180);
      });
    });
    
    nodes = newNodes;
    edges = newEdges;
  }
  
  function addChildSubclasses(parentSubclass, classData, typeInfo, nodesArray, edgesArray, parentX, parentY) {
    const children = allSubclasses.filter(s => s.parent_subclass_id === parentSubclass.id);
    
    children.forEach((child, childIndex) => {
      const childX = (child.flow_x !== null && child.flow_x !== undefined)
        ? child.flow_x
        : parentX + (childIndex - children.length / 2 + 0.5) * 200;
      const childY = (child.flow_y !== null && child.flow_y !== undefined)
        ? child.flow_y
        : parentY;
      
      nodesArray.push({
        id: `subclass-${child.id}`,
        type: 'subclassNode',
        draggable: true,
        data: {
          subclass: child,
          tier: child.tier || 2,
          onEdit: () => {
            selectedClass = classData;
            openSubclassCanvas(child);
          },
          onDelete: (e) => { e.stopPropagation(); deleteSubclass(child.id); },
          onAddChild: (e) => { e.stopPropagation(); openAddSubclassModal(classData, child); }
        },
        position: { x: childX, y: childY }
      });
      
      edgesArray.push({
        id: `e-sub-${parentSubclass.id}-sub-${child.id}`,
        source: `subclass-${parentSubclass.id}`,
        target: `subclass-${child.id}`,
        type: 'smoothstep',
        style: { stroke: typeInfo.color, strokeWidth: 2, opacity: 0.6 }
      });
      
      addChildSubclasses(child, classData, typeInfo, nodesArray, edgesArray, childX, childY + 180);
    });
  }
  
  async function handleNodeDragStop(event) {
    console.log('handleNodeDragStop called!', event);
    
    // event.nodes contains ALL nodes that were dragged (single or multiple)
    // Sometimes targetNode is null when dragging multiple, so always use event.nodes
    const draggedNodes = event.nodes || (event.targetNode ? [event.targetNode] : []);
    
    if (draggedNodes.length === 0) {
      console.error('No nodes found in event:', event);
      return;
    }
    
    console.log(`Saving ${draggedNodes.length} node(s)`);
    
    // Save each dragged node
    for (const node of draggedNodes) {
      if (!node || !node.id) continue;
      
      console.log('Saving node:', node.id, 'at position:', node.position);
      
      // Extract type and ID properly
      let type, id;
      if (node.id.startsWith('class-')) {
        type = 'class';
        id = node.id.substring(6);
      } else if (node.id.startsWith('subclass-')) {
        type = 'subclass';
        id = node.id.substring(9);
      }
      
      // Save to database
      if (type === 'class') {
        const { error } = await supabase
          .from('classes')
          .update({ 
            flow_x: node.position.x, 
            flow_y: node.position.y 
          })
          .eq('id', id);
        
        if (error) {
          console.error('Error saving class position:', error);
        } else {
          console.log('✅ Class position saved:', node.position);
          // Update local state
          const classIndex = classes.findIndex(c => c.id === id);
          if (classIndex !== -1) {
            classes[classIndex].flow_x = node.position.x;
            classes[classIndex].flow_y = node.position.y;
          }
        }
      } else if (type === 'subclass') {
        const { error } = await supabase
          .from('subclasses')
          .update({ 
            flow_x: node.position.x, 
            flow_y: node.position.y 
          })
          .eq('id', id);
        
        if (error) {
          console.error('Error saving subclass position:', error);
        } else {
          console.log('✅ Subclass position saved:', node.position);
          // Update local state
          const subIndex = allSubclasses.findIndex(s => s.id === id);
          if (subIndex !== -1) {
            allSubclasses[subIndex].flow_x = node.position.x;
            allSubclasses[subIndex].flow_y = node.position.y;
          }
        }
      }
    }
    
    console.log(`✅ Saved all ${draggedNodes.length} node positions`);
  }
  
  function getClassTypeInfo(type) {
    return classTypes.find(ct => ct.value === type) || classTypes[3];
  }
  
  async function createClass() {
    if (!newClassName.trim() || !selectedWorldId) return;
    
    const { data, error } = await supabase
      .from('classes')
      .insert({
        name: newClassName,
        description: newClassDescription,
        class_type: newClassType,
        world_id: selectedWorldId,
        flow_x: 50 + classes.length * 400,
        flow_y: 50
      })
      .select()
      .single();
    
    if (!error) {
      classes = [...classes, data];
      // Add the new node directly to the nodes array
      const typeInfo = getClassTypeInfo(data.class_type);
      nodes = [...nodes, {
        id: `class-${data.id}`,
        type: 'classNode',
        draggable: true,
        data: { 
          classData: data,
          typeInfo,
          onEdit: () => openClassCanvas(data),
          onDelete: (e) => { e.stopPropagation(); deleteClass(data.id); },
          onAddSubclass: (e) => { e.stopPropagation(); openAddSubclassModal(data, null); }
        },
        position: { x: data.flow_x, y: data.flow_y }
      }];
      
      showAddClassModal = false;
      newClassName = '';
      newClassDescription = '';
      newClassType = 'martial';
    }
  }
  
  async function deleteClass(classId) {
    if (!confirm('Delete this class? All subclasses and canvas content will be lost.')) return;
    
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);
    
    if (!error) {
      await loadClasses();
      await loadAllSubclasses();
    }
  }
  
  function openAddSubclassModal(classData, parentSubclass = null) {
    parentClassForSubclass = classData;
    parentSubclassForSubclass = parentSubclass;
    newSubclassTier = parentSubclass ? (parentSubclass.tier || 1) + 1 : 1;
    showAddSubclassModal = true;
  }
  
  async function createSubclass() {
    if (!newSubclassName.trim() || !parentClassForSubclass || !selectedWorldId) return;
    
    const parentNode = parentSubclassForSubclass 
      ? nodes.find(n => n.id === `subclass-${parentSubclassForSubclass.id}`)
      : nodes.find(n => n.id === `class-${parentClassForSubclass.id}`);
    
    const flowX = parentNode ? parentNode.position.x : 50;
    const flowY = parentNode ? parentNode.position.y + 200 : 250;
    
    const { data, error } = await supabase
      .from('subclasses')
      .insert({
        name: newSubclassName,
        description: newSubclassDescription,
        class_id: parentClassForSubclass.id,
        parent_subclass_id: parentSubclassForSubclass?.id || null,
        tier: newSubclassTier,
        world_id: selectedWorldId,
        flow_x: flowX,
        flow_y: flowY
      })
      .select()
      .single();
    
    if (!error) {
      allSubclasses = [...allSubclasses, data];
      buildFlowchart();
      
      showAddSubclassModal = false;
      newSubclassName = '';
      newSubclassDescription = '';
      newSubclassTier = 1;
      parentClassForSubclass = null;
      parentSubclassForSubclass = null;
    }
  }
  
  async function deleteSubclass(subclassId) {
    if (!confirm('Delete this subclass? All canvas content will be lost.')) return;
    
    const { error } = await supabase
      .from('subclasses')
      .delete()
      .eq('id', subclassId);
    
    if (!error) {
      await loadAllSubclasses();
      if (currentView === 'canvas') await loadSubclasses(selectedClass.id);
    }
  }
  
  async function loadSubclasses(classId) {
    const { data, error } = await supabase
      .from('subclasses')
      .select('*')
      .eq('class_id', classId)
      .order('name');
    
    if (!error) subclasses = data || [];
  }
  
  async function openClassCanvas(classData) {
    selectedClass = classData;
    selectedSubclass = null;
    currentView = 'canvas';
    await loadSubclasses(classData.id);
    await loadBlocks(classData.id, null);
  }
  
  async function openSubclassCanvas(subclass) {
    selectedSubclass = subclass;
    currentView = 'canvas';
    await loadSubclasses(selectedClass.id);
    await loadBlocks(selectedClass.id, subclass.id);
  }
  
  function backToFlowchart() {
    currentView = 'flowchart';
    selectedClass = null;
    selectedSubclass = null;
    subclasses = [];
    blocks = [];
  }
  
  function backToClass() {
    selectedSubclass = null;
    loadBlocks(selectedClass.id, null);
  }
  
  async function loadBlocks(classId, subclassId) {
    if (!selectedWorldId) return;
    
    const { data, error } = await supabase
      .from('class_blocks')
      .select('*')
      .eq('class_id', classId)
      .eq('subclass_id', subclassId || '')
      .eq('world_id', selectedWorldId)
      .order('y')
      .order('x');
    
    if (!error) {
      blocks = data || [];
      if (blocks.length === 0) await createDefaultBlocks(classId, subclassId);
    }
  }
  
  async function createDefaultBlocks(classId, subclassId) {
    if (!selectedWorldId) return;
    
    const context = selectedSubclass || selectedClass;
    const defaultBlocks = [
      {
        class_id: classId,
        subclass_id: subclassId || '',
        world_id: selectedWorldId,
        type: 'heading',
        content: context.name,
        x: 100,
        y: 100,
        width: 400,
        height: 60,
        metadata: {}
      },
      {
        class_id: classId,
        subclass_id: subclassId || '',
        world_id: selectedWorldId,
        type: 'text',
        content: context.description || 'Add description here...',
        x: 100,
        y: 180,
        width: 400,
        height: 150,
        metadata: {}
      }
    ];
    
    const { data } = await supabase
      .from('class_blocks')
      .insert(defaultBlocks)
      .select();
    
    if (data) blocks = data;
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
      canvasTransform = {
        x: canvasTransform.x - (mouseX - canvasTransform.x) * scaleDiff / canvasTransform.scale,
        y: canvasTransform.y - (mouseY - canvasTransform.y) * scaleDiff / canvasTransform.scale,
        scale: newScale
      };
    } else {
      canvasTransform = {
        ...canvasTransform,
        x: canvasTransform.x - e.deltaX,
        y: canvasTransform.y - e.deltaY
      };
    }
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
      canvasTransform = {
        ...canvasTransform,
        x: lastPanPosition.x + dx,
        y: lastPanPosition.y + dy
      };
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
      supabase
        .from('class_blocks')
        .update({ x: draggingBlock.x, y: draggingBlock.y })
        .eq('id', draggingBlock.id);
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
      dragOffset = { x: canvasX - block.x, y: canvasY - block.y };
    }
  }
  
  function handleCanvasContextMenu(e) {
    e.preventDefault();
    const rect = canvasContainer.getBoundingClientRect();
    addMenuPosition = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    showAddMenu = true;
  }
  
  async function addBlock(type) {
    if (!selectedWorldId) return;
    
    const rect = canvasContainer.getBoundingClientRect();
    const canvasX = (addMenuPosition.x - canvasTransform.x) / canvasTransform.scale;
    const canvasY = (addMenuPosition.y - canvasTransform.y) / canvasTransform.scale;
    
    let content = 'Double-click to edit...';
    let width = 300;
    let height = 150;
    
    if (type === 'heading') {
      content = 'New Heading';
      width = 400;
      height = 60;
    } else if (type === 'ability') {
      content = JSON.stringify({ name: 'Ability Name', level: 1, description: 'Ability description...', cost: 'Action' });
    }
    
    const { data } = await supabase
      .from('class_blocks')
      .insert({
        class_id: selectedClass.id,
        subclass_id: selectedSubclass?.id || '',
        world_id: selectedWorldId,
        type,
        content,
        x: canvasX,
        y: canvasY,
        width,
        height,
        metadata: {}
      })
      .select()
      .single();
    
    if (data) {
      blocks = [...blocks, data];
      selectedBlock = data;
    }
    showAddMenu = false;
  }
  
  async function updateBlockContent(block, newContent) {
    block.content = newContent;
    blocks = [...blocks];
    clearTimeout(block._saveTimeout);
    block._saveTimeout = setTimeout(async () => {
      await supabase
        .from('class_blocks')
        .update({ content: newContent })
        .eq('id', block.id);
    }, 1000);
  }
  
  async function deleteBlock(block) {
    if (!confirm('Delete this block?')) return;
    await supabase.from('class_blocks').delete().eq('id', block.id);
    blocks = blocks.filter(b => b.id !== block.id);
    selectedBlock = null;
  }
  
  function resetView() {
    canvasTransform = { x: 0, y: 0, scale: 1 };
  }
</script>

<div class="canvas-overlay">
  <div class="canvas-header">
    <div class="canvas-title-section">
      <button class="back-btn" on:click={currentView === 'canvas' ? (selectedSubclass ? backToClass : backToFlowchart) : onClose}>
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 4L6 8l4 4"/>
        </svg>
      </button>
      <div>
        <h2 class="canvas-title">
          {#if currentView === 'flowchart'}
            Classes & Archetypes
          {:else if selectedSubclass}
            {selectedSubclass.name}
          {:else}
            {selectedClass?.name || 'Class'}
          {/if}
        </h2>
        <p class="canvas-subtitle">
          {#if currentView === 'flowchart'}
            {world.name}
          {:else if selectedSubclass}
            Subclass of {selectedClass?.name}
          {:else}
            Base Class
          {/if}
        </p>
      </div>
    </div>
    
    <div class="canvas-controls">
      {#if currentView === 'flowchart' && worlds.length > 1}
        <select bind:value={selectedWorldId} class="world-selector">
          {#each worlds as worldOption}
            <option value={worldOption.id}>{worldOption.name}</option>
          {/each}
        </select>
      {/if}
      
      {#if currentView === 'flowchart'}
        <button class="control-btn secondary" on:click={() => showAddClassModal = true}>
          + Add Class
        </button>
      {/if}
      
      {#if currentView === 'canvas'}
        {#if !selectedSubclass && subclasses.length > 0}
          <button class="control-btn secondary" on:click={() => showAddSubclassModal = true}>
            + Add Subclass
          </button>
        {/if}
        <button class="control-btn" on:click={resetView} title="Reset view">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="12" height="12" rx="1"/>
          </svg>
          Reset View
        </button>
        <span class="zoom-indicator">{Math.round(canvasTransform.scale * 100)}%</span>
      {/if}
    </div>
  </div>
  
  {#if currentView === 'flowchart'}
    <div class="flowchart-container">
      {#if worlds.length === 0}
        <div class="empty-flowchart">
          <div class="empty-icon">🌍</div>
          <h3 class="empty-title">No worlds in this project</h3>
          <p class="empty-description">Create a world in the World section first.</p>
        </div>
      {:else if classes.length === 0}
        <div class="empty-flowchart">
          <div class="empty-icon">⚔️</div>
          <h3 class="empty-title">No classes yet</h3>
          <p class="empty-description">Create your first character class</p>
          <button class="empty-action" on:click={() => showAddClassModal = true}>
            Create Class
          </button>
        </div>
      {:else}
        <SvelteFlow
          bind:nodes
          bind:edges
          {nodeTypes}
          fitView
          selectionOnDrag
          multiSelectionKeyCode="Shift"
          panOnDrag={[1, 2]}
          selectionKeyCode="Shift"
          onnodedragstop={handleNodeDragStop}
          onnodedrag={(e) => console.log('Node dragging:', e)}
          onnodeclick={(e) => console.log('Node clicked:', e)}
          onnodemouseenter={(e) => console.log('Mouse enter:', e)}
        >
          <Controls />
          <Background />
          <MiniMap />
        </SvelteFlow>
      {/if}
    </div>
  
  {:else}
    <div class="canvas-layout">
      {#if !selectedSubclass && subclasses.length > 0}
        <div class="subclass-sidebar">
          <div class="sidebar-header">
            <h3>Subclasses</h3>
            <button class="sidebar-add-btn" on:click={() => showAddSubclassModal = true} title="Add Subclass">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3v10M3 8h10"/>
              </svg>
            </button>
          </div>
          <div class="subclass-list">
            {#each subclasses as subclass}
              <div class="subclass-item">
                <button 
                  class="subclass-item-btn"
                  on:click={() => openSubclassCanvas(subclass)}
                >
                  <span class="subclass-icon">⚡</span>
                  <span class="subclass-name">{subclass.name}</span>
                </button>
                <button 
                  class="subclass-delete-btn"
                  on:click={(e) => { e.stopPropagation(); deleteSubclass(subclass.id); }}
                  title="Delete subclass"
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
              {:else}
                <textarea
                  class="block-textarea"
                  class:structured={block.type === 'ability' || block.type === 'feature' || block.type === 'stats'}
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
          Right-click to add blocks • Drag background to pan • Ctrl+Scroll to zoom
        </div>
      </div>
    </div>
  {/if}
</div>

{#if showAddClassModal}
  <div class="modal-overlay" on:click={() => showAddClassModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <h3 class="modal-title">Add New Class</h3>
      
      <div class="form-group">
        <label>Class Name</label>
        <input 
          type="text" 
          bind:value={newClassName}
          placeholder="e.g., Warrior, Mage, Rogue..."
          class="text-input"
          autofocus
        />
      </div>
      
      <div class="form-group">
        <label>Class Type</label>
        <div class="class-type-grid">
          {#each classTypes as type}
            <button 
              class="class-type-option"
              class:selected={newClassType === type.value}
              style="--type-color: {type.color}"
              on:click={() => newClassType = type.value}
            >
              <span class="type-icon">{type.icon}</span>
              <span class="type-label">{type.label}</span>
            </button>
          {/each}
        </div>
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea 
          bind:value={newClassDescription}
          placeholder="Brief description..."
          class="textarea-input"
          rows="3"
        ></textarea>
      </div>
      
      <div class="modal-actions">
        <button class="secondary-btn" on:click={() => showAddClassModal = false}>
          Cancel
        </button>
        <button class="primary-btn" on:click={createClass}>
          Create Class
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showAddSubclassModal}
  <div class="modal-overlay" on:click={() => { showAddSubclassModal = false; parentClassForSubclass = null; parentSubclassForSubclass = null; }}>
    <div class="modal-content" on:click|stopPropagation>
      <h3 class="modal-title">
        Add {parentSubclassForSubclass ? 'Specialization' : 'Subclass'} to {parentSubclassForSubclass?.name || parentClassForSubclass?.name}
      </h3>
      
      {#if parentSubclassForSubclass}
        <div class="tier-info">
          <span class="tier-badge-large">Tier {newSubclassTier}</span>
          <span class="tier-description">Sub-specialization of {parentSubclassForSubclass.name}</span>
        </div>
      {/if}
      
      <div class="form-group">
        <label>{parentSubclassForSubclass ? 'Specialization' : 'Subclass'} Name</label>
        <input 
          type="text" 
          bind:value={newSubclassName}
          placeholder="e.g., Berserker, Elementalist..."
          class="text-input"
          autofocus
        />
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea 
          bind:value={newSubclassDescription}
          placeholder="Brief description..."
          class="textarea-input"
          rows="3"
        ></textarea>
      </div>
      
      <div class="modal-actions">
        <button class="secondary-btn" on:click={() => { showAddSubclassModal = false; parentClassForSubclass = null; parentSubclassForSubclass = null; }}>
          Cancel
        </button>
        <button class="primary-btn" on:click={createSubclass}>
          Create {parentSubclassForSubclass ? 'Specialization' : 'Subclass'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
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
    color: #6b8e6f;
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
    border-color: #6b8e6f;
  }
  
  .control-btn.secondary {
    background: #6b8e6f;
    border-color: #6b8e6f;
    color: white;
  }
  
  .control-btn.secondary:hover {
    background: #5a7a5e;
  }
  
  .zoom-indicator {
    color: #a0a0a0;
    font-size: 13px;
    font-weight: 500;
    min-width: 50px;
    text-align: right;
  }
  
  .world-selector {
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #e8dcc8;
    font-size: 13px;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
  }
  
  .flowchart-container {
    flex: 1;
    background: #1a1a1a;
    position: relative;
  }
  
  .empty-flowchart {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    padding: 60px 40px;
    background: rgba(42, 42, 42, 0.4);
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .empty-title {
    color: #e8dcc8;
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }
  
  .empty-description {
    color: #a0a0a0;
    font-size: 14px;
    margin: 0 0 24px 0;
  }
  
  .empty-action {
    padding: 10px 20px;
    background: #6b8e6f;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .empty-action:hover {
    background: #5a7a5e;
  }
  
  /* Canvas Layout */
  .canvas-layout {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  
  .subclass-sidebar {
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
    color: #6b8e6f;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
  }
  
  .sidebar-add-btn {
    width: 28px;
    height: 28px;
    background: rgba(107, 142, 111, 0.2);
    border: 1px solid #6b8e6f;
    border-radius: 4px;
    color: #6b8e6f;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .sidebar-add-btn:hover {
    background: rgba(107, 142, 111, 0.3);
  }
  
  .subclass-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  
  .subclass-item {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
  }
  
  .subclass-item-btn {
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
  
  .subclass-item-btn:hover {
    background: rgba(107, 142, 111, 0.2);
    border-color: #6b8e6f;
  }
  
  .subclass-icon {
    font-size: 18px;
  }
  
  .subclass-name {
    font-size: 14px;
    font-weight: 500;
  }
  
  .subclass-delete-btn {
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
  
  .subclass-delete-btn:hover {
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
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
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
    border-color: rgba(107, 142, 111, 0.3);
  }
  
  .block.selected {
    border-color: #6b8e6f;
    box-shadow: 0 0 0 3px rgba(107, 142, 111, 0.2);
  }
  
  .block-heading {
    background: rgba(107, 142, 111, 0.1);
    border-color: rgba(107, 142, 111, 0.3);
  }
  
  .block-ability {
    background: rgba(214, 110, 110, 0.1);
    border-color: rgba(214, 110, 110, 0.3);
  }
  
  .block-feature {
    background: rgba(110, 141, 214, 0.1);
    border-color: rgba(110, 141, 214, 0.3);
  }
  
  .block-heading-input {
    width: 100%;
    background: transparent;
    border: none;
    color: #6b8e6f;
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
    border: 1px solid #6b8e6f;
    border-radius: 8px;
    padding: 8px;
    min-width: 220px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 1000;
  }
  
  .add-menu-header {
    color: #6b8e6f;
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
    background: rgba(107, 142, 111, 0.2);
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
    border: 1px solid rgba(107, 142, 111, 0.3);
    border-radius: 8px;
    padding: 8px 16px;
    color: #a0a0a0;
    font-size: 12px;
    pointer-events: none;
  }
  
  /* Modals */
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
    border: 2px solid #6b8e6f;
    border-radius: 12px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
  }
  
  .modal-title {
    color: #6b8e6f;
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
    border-color: #6b8e6f;
    background: rgba(255, 255, 255, 0.08);
  }
  
  .textarea-input {
    resize: vertical;
    min-height: 80px;
  }
  
  .class-type-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .class-type-option {
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
  
  .class-type-option:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--type-color);
  }
  
  .class-type-option.selected {
    background: color-mix(in srgb, var(--type-color) 10%, transparent);
    border-color: var(--type-color);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--type-color) 20%, transparent);
  }
  
  .type-icon {
    font-size: 32px;
  }
  
  .type-label {
    color: #e8dcc8;
    font-size: 13px;
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
    background: #6b8e6f;
    color: white;
  }
  
  .primary-btn:hover {
    background: #5a7a5e;
  }
  
  .secondary-btn {
    background: transparent;
    color: #e8dcc8;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .secondary-btn:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .tier-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(107, 142, 111, 0.1);
    border: 1px solid rgba(107, 142, 111, 0.3);
    border-radius: 8px;
    margin-bottom: 20px;
  }
  
  .tier-badge-large {
    padding: 6px 12px;
    background: #6b8e6f;
    color: white;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .tier-description {
    color: #a0a0a0;
    font-size: 13px;
  }
  
  /* SvelteFlow styling */
  :global(.svelte-flow) {
    background: #1a1a1a !important;
  }
  
  :global(.svelte-flow__background) {
    background: #1a1a1a !important;
  }
  
  :global(.svelte-flow__background-pattern) {
    stroke: rgba(255, 255, 255, 0.05) !important;
  }
  
  :global(.svelte-flow__edge-path) {
    stroke-width: 2;
  }
  
  :global(.svelte-flow__controls) {
    background: rgba(42, 42, 42, 0.95) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
  }
  
  :global(.svelte-flow__controls-button) {
    background: rgba(255, 255, 255, 0.05) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: #e8dcc8 !important;
  }
  
  :global(.svelte-flow__controls-button:hover) {
    background: rgba(107, 142, 111, 0.2) !important;
  }
  
  :global(.svelte-flow__minimap) {
    background: rgba(42, 42, 42, 0.95) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
  }
</style>
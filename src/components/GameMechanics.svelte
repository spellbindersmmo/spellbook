<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import * as d3 from 'd3'
	import type { Project } from '../types'

	export let project: Project

	interface MechanicNode {
		id: string
		name: string
		description: string
		category: string
		mechanicType: 'core' | 'rule' | 'component' | 'action' | 'condition' | 'resource'
		details: {
			trigger?: string
			effect?: string
			cost?: string
			requirements?: string
			examples?: string
		}
		x: number
		y: number
		color?: string
	}

	interface MechanicLink {
		id: string
		source: string
		target: string
		relationship: string
		description?: string
	}

	let svgElement: SVGElement
	let showModal = false
	let showConnectionModal = false
	let editingNode: MechanicNode | null = null
	let isNewNode = false
	let selectedNodes: string[] = []
    // Connection manager modal state
    let showConnectionManager = false
    let showConfirmModal = false
    let confirmMessage = ''
    let confirmAction = null

	// Node categories and types
	const nodeCategories = [
		'Core Mechanics',
		'Game Components', 
		'Player Actions',
		'Rules & Conditions',
		'Resources',
		'Victory Conditions',
		'Setup & Flow'
	]

	const nodeTypes = [
		{ value: 'core', label: 'Core Mechanic', color: '#1976d2' },
		{ value: 'component', label: 'Game Component', color: '#4caf50' },
		{ value: 'action', label: 'Player Action', color: '#ff9800' },
		{ value: 'rule', label: 'Rule/Condition', color: '#9c27b0' },
		{ value: 'resource', label: 'Resource/Currency', color: '#f44336' },
		{ value: 'condition', label: 'Win/Lose Condition', color: '#607d8b' }
	]

	const relationshipTypes = [
		'requires',
		'triggers',
		'modifies',
		'consumes',
		'produces',
		'prevents',
		'enables',
		'depends on',
		'part of'
	]

	// Initial example for card game
	let nodes: MechanicNode[] = [
		{
			id: 'deck',
			name: 'Deck',
			description: 'Collection of cards each player uses',
			category: 'Game Components',
			mechanicType: 'component',
			details: {
				examples: 'Standard 52-card deck, custom game cards, etc.'
			},
			x: 200,
			y: 300,
			color: '#4caf50'
		},
		{
			id: 'hand',
			name: 'Hand',
			description: 'Cards currently held by player',
			category: 'Game Components',
			mechanicType: 'component',
			details: {
				requirements: 'Must have deck to draw from',
				examples: 'Hand limit of 7 cards, no hand limit, etc.'
			},
			x: 400,
			y: 200,
			color: '#4caf50'
		},
		{
			id: 'draw',
			name: 'Draw Card',
			description: 'Take a card from deck to hand',
			category: 'Player Actions',
			mechanicType: 'action',
			details: {
				trigger: 'Start of turn, specific actions',
				cost: 'May cost action points or be automatic',
				requirements: 'Deck must have cards, hand not at limit'
			},
			x: 300,
			y: 100,
			color: '#ff9800'
		}
	]

	let links: MechanicLink[] = [
		{
			id: 'deck-to-hand',
			source: 'deck',
			target: 'hand',
			relationship: 'produces',
			description: 'Cards move from deck to hand when drawn'
		},
		{
			id: 'draw-requires-deck',
			source: 'draw',
			target: 'deck',
			relationship: 'requires',
			description: 'Drawing requires a deck with cards'
		}
	]

	// Modal form data
	let nodeName = ''
	let nodeDescription = ''
	let nodeCategory = 'Core Mechanics'
	let nodeMechanicType: 'core' | 'rule' | 'component' | 'action' | 'condition' | 'resource' = 'core'
	let nodeTrigger = ''
	let nodeEffect = ''
	let nodeCost = ''
	let nodeRequirements = ''
	let nodeExamples = ''

	// Connection modal data
	let connectionSource = ''
	let connectionTarget = ''
	let connectionRelationship = 'requires'
	let connectionDescription = ''

	let width = 900
	let height = 700

	// Drag state
	let isDragging = false
	let dragNodeId = ''

	onMount(() => {
		setupMindMap()
	})

	function getNodeColor(mechanicType: string): string {
		const typeInfo = nodeTypes.find(t => t.value === mechanicType)
		return typeInfo?.color || '#666'
	}

	function setupMindMap() {
		const svg = d3.select(svgElement)
			.attr('width', width)
			.attr('height', height)

		svg.selectAll('*').remove()

		const g = svg.append('g')
		const zoom = d3.zoom()
			.scaleExtent([0.1, 3])
			.on('zoom', (event) => {
				g.attr('transform', event.transform)
			})

		svg.call(zoom)

		// Add arrow markers for directed relationships
		svg.append('defs').selectAll('marker')
			.data(['arrow'])
			.enter().append('marker')
			.attr('id', 'arrow')
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', 15)
			.attr('refY', 0)
			.attr('markerWidth', 6)
			.attr('markerHeight', 6)
			.attr('orient', 'auto')
			.append('path')
			.attr('d', 'M0,-5L10,0L0,5')
			.attr('fill', '#666')

		updateVisualization(g)

		// Add double-click to canvas for new nodes
		svg.on('dblclick', (event) => {
			const [x, y] = d3.pointer(event, g.node())
			createNewNode(x, y)
		})
	}

function updateVisualization(g) {
	// Bind links data
	const linkGroup = g.selectAll('.links')
		.data([links])

	const linkGroupEnter = linkGroup.enter()
		.append('g')
		.attr('class', 'links')

	const linkGroupMerged = linkGroupEnter.merge(linkGroup)

	// Update links
	const links_selection = linkGroupMerged.selectAll('.link')
		.data(links, d => d.id)

	const linksEnter = links_selection.enter()
		.append('g')
		.attr('class', 'link')

	// Add line for each link
	linksEnter.append('line')
		.attr('stroke', '#666')
		.attr('stroke-opacity', 0.8)
		.attr('stroke-width', 2)
		.attr('marker-end', 'url(#arrow)')

	// Add text for each link
	linksEnter.append('text')
		.attr('dy', -5)
		.attr('text-anchor', 'middle')
		.attr('font-size', '10px')
		.attr('fill', '#666')

	// Update all links (enter + existing)
	const linksMerged = linksEnter.merge(links_selection)

	linksMerged.select('line')
		.attr('x1', d => getNodeById(d.source).x)
		.attr('y1', d => getNodeById(d.source).y)
		.attr('x2', d => getNodeById(d.target).x)
		.attr('y2', d => getNodeById(d.target).y)
		.style('cursor', 'pointer') // Add cursor pointer

	linksMerged.select('text')
		.attr('x', d => (getNodeById(d.source).x + getNodeById(d.target).x) / 2)
		.attr('y', d => (getNodeById(d.source).y + getNodeById(d.target).y) / 2)
		.text(d => d.relationship)
		.style('cursor', 'pointer') // Add cursor pointer

	// Add click handlers to delete connections
    linksMerged
        .on('contextmenu', (event, d) => {
            event.preventDefault()
            showDeleteConnectionConfirm(d)
        })
        .on('click', (event, d) => {
            event.stopPropagation()
            showDeleteConnectionConfirm(d)
        })

	// Remove old links
	links_selection.exit().remove()

	// Bind nodes data
	const nodeGroup = g.selectAll('.nodes')
		.data([nodes])

	const nodeGroupEnter = nodeGroup.enter()
		.append('g')
		.attr('class', 'nodes')

	const nodeGroupMerged = nodeGroupEnter.merge(nodeGroup)

	// Update nodes
	const nodes_selection = nodeGroupMerged.selectAll('.node')
		.data(nodes, d => d.id)

	const nodesEnter = nodes_selection.enter()
		.append('g')
		.attr('class', 'node')

	// Add rectangle for each node
	nodesEnter.append('rect')
		.attr('width', 140)
		.attr('height', 80)
		.attr('x', -70)
		.attr('y', -40)
		.attr('rx', 10)
		.attr('stroke', '#333')
		.attr('stroke-width', 2)
		.style('cursor', 'move')

	// Add title text
	nodesEnter.append('text')
		.attr('class', 'title')
		.attr('dy', -10)
		.attr('text-anchor', 'middle')
		.attr('fill', 'white')
		.attr('font-size', '12px')
		.attr('font-weight', 'bold')
		.style('pointer-events', 'none')

	// Add type text
	nodesEnter.append('text')
		.attr('class', 'type')
		.attr('dy', 10)
		.attr('text-anchor', 'middle')
		.attr('fill', 'rgba(255,255,255,0.8)')
		.attr('font-size', '10px')
		.style('pointer-events', 'none')

	// Update all nodes (enter + existing)
	const nodesMerged = nodesEnter.merge(nodes_selection)

	nodesMerged
		.attr('transform', d => `translate(${d.x}, ${d.y})`)

	nodesMerged.select('rect')
		.attr('fill', d => d.color || getNodeColor(d.mechanicType))
		.attr('stroke-width', d => selectedNodes.includes(d.id) ? 4 : 2)

	nodesMerged.select('.title')
		.text(d => d.name.length > 18 ? d.name.substring(0, 15) + '...' : d.name)

	nodesMerged.select('.type')
		.text(d => nodeTypes.find(t => t.value === d.mechanicType)?.label || d.mechanicType)

	// FIXED NODE EVENT HANDLERS - Proper mouse state management with right-click fix
	let isMouseDown = false
	let mouseStartPos = null
	let dragStarted = false
	let dragNode = null

	nodesMerged
		.on('mousedown', (event, d) => {
			// Don't handle right-click here
			if (event.button === 2) return
			
			event.preventDefault()
			event.stopPropagation()
			
			isMouseDown = true
			mouseStartPos = { x: event.clientX, y: event.clientY }
			dragStarted = false
			dragNode = d
		})
		.on('mouseup', (event, d) => {
			// Don't handle right-click here
			if (event.button === 2) return
			
			event.preventDefault()
			event.stopPropagation()
			
			if (!isMouseDown) return
			
			// Reset all tracking variables
			const wasClick = !dragStarted
			isMouseDown = false
			mouseStartPos = null
			dragStarted = false
			dragNode = null
			
			// Handle click if it wasn't a drag
			if (wasClick) {
				handleNodeClick(event, d)
			}
		})
		.on('mouseleave', (event, d) => {
			// Stop dragging if mouse leaves the node
			isMouseDown = false
			mouseStartPos = null
			dragStarted = false
			dragNode = null
		})
        .on('contextmenu', (event, d) => {
            event.preventDefault()
            event.stopPropagation()
            
            // Show confirmation modal for deleting nodes
            showDeleteNodeConfirm(d)
        })

	// Add mousemove to the SVG itself, not individual nodes
	const svg = d3.select(svgElement)
	svg.on('mousemove', (event) => {
		if (!isMouseDown || !mouseStartPos || !dragNode) return
		
		const currentPos = { x: event.clientX, y: event.clientY }
		const deltaX = currentPos.x - mouseStartPos.x
		const deltaY = currentPos.y - mouseStartPos.y
		
		// Start dragging if moved more than 5 pixels
		if (!dragStarted && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
			dragStarted = true
		}
		
		if (dragStarted) {
			// Get the transform of the parent group for proper coordinate conversion
			const transform = d3.zoomTransform(g.node())
			const svgRect = svgElement.getBoundingClientRect()
			
			// Convert screen coordinates to SVG coordinates
			const svgX = (currentPos.x - svgRect.left - transform.x) / transform.k
			const svgY = (currentPos.y - svgRect.top - transform.y) / transform.k
			
			// Update node position
			dragNode.x = svgX
			dragNode.y = svgY
			
			// Update visual immediately
			const nodeSelection = g.selectAll('.node').filter(d => d.id === dragNode.id)
			nodeSelection.attr('transform', `translate(${dragNode.x}, ${dragNode.y})`)
			
			// Update links
			updateLinks(g)
		}
	})
	
	// Also handle mouseup on the SVG to catch releases outside of nodes
	svg.on('mouseup', (event) => {
		if (isMouseDown) {
			isMouseDown = false
			mouseStartPos = null
			dragStarted = false
			dragNode = null
		}
	})

	// Remove old nodes
	nodes_selection.exit().remove()
}

// Keep this helper function the same
function handleNodeClick(event, d) {
	console.log('Node clicked:', d.name) // Debug log
	
	if (event.shiftKey) {
		// Multi-select for connections
		toggleNodeSelection(d.id)
		const svg = d3.select(svgElement)
		const g = svg.select('g')
		updateVisualization(g)
	} else {
		// Single click to edit
		openNodeEditor(d)
	}
}


	function updateLinks(g) {
		// Update all link positions
		g.selectAll('.link line')
			.attr('x1', d => getNodeById(d.source).x)
			.attr('y1', d => getNodeById(d.source).y)
			.attr('x2', d => getNodeById(d.target).x)
			.attr('y2', d => getNodeById(d.target).y)

		g.selectAll('.link text')
			.attr('x', d => (getNodeById(d.source).x + getNodeById(d.target).x) / 2)
			.attr('y', d => (getNodeById(d.source).y + getNodeById(d.target).y) / 2)
	}

	function getNodeById(id: string): MechanicNode {
		return nodes.find(n => n.id === id) || nodes[0]
	}

	function toggleNodeSelection(nodeId: string) {
		if (selectedNodes.includes(nodeId)) {
			selectedNodes = selectedNodes.filter(id => id !== nodeId)
		} else {
			selectedNodes = [...selectedNodes, nodeId]
		}
	}

	function createNewNode(x: number, y: number) {
		editingNode = {
			id: `node_${Date.now()}`,
			name: '',
			description: '',
			category: 'Core Mechanics',
			mechanicType: 'core',
			details: {},
			x,
			y
		}
		isNewNode = true
		showModal = true
		resetModalForm()
	}

    function openNodeEditor(node) {
        console.log('Opening editor for node:', node) // Add debug log
        
        editingNode = node
        isNewNode = false
        showModal = true
        loadModalForm(node)
        
        console.log('showModal is now:', showModal) // Add debug log
    }

    function loadModalForm(node) {
        console.log('Loading form data:', node) // Add debug log
        
        nodeName = node.name
        nodeDescription = node.description
        nodeCategory = node.category
        nodeMechanicType = node.mechanicType
        nodeTrigger = node.details?.trigger || ''
        nodeEffect = node.details?.effect || ''
        nodeCost = node.details?.cost || ''
        nodeRequirements = node.details?.requirements || ''
        nodeExamples = node.details?.examples || ''
    }

	function resetModalForm() {
		nodeName = ''
		nodeDescription = ''
		nodeCategory = 'Core Mechanics'
		nodeMechanicType = 'core'
		nodeTrigger = ''
		nodeEffect = ''
		nodeCost = ''
		nodeRequirements = ''
		nodeExamples = ''
	}

	function saveNode() {
		if (!editingNode || !nodeName.trim()) return

		const nodeData = {
			...editingNode,
			name: nodeName.trim(),
			description: nodeDescription.trim(),
			category: nodeCategory,
			mechanicType: nodeMechanicType,
			details: {
				trigger: nodeTrigger.trim(),
				effect: nodeEffect.trim(),
				cost: nodeCost.trim(),
				requirements: nodeRequirements.trim(),
				examples: nodeExamples.trim()
			},
			color: getNodeColor(nodeMechanicType)
		}

		if (isNewNode) {
			nodes = [...nodes, nodeData]
		} else {
			const nodeIndex = nodes.findIndex(n => n.id === editingNode.id)
			if (nodeIndex >= 0) {
				nodes[nodeIndex] = nodeData
				nodes = nodes
			}
		}

		showModal = false
		editingNode = null
		
		// Refresh visualization
		const svg = d3.select(svgElement)
		const g = svg.select('g')
		updateVisualization(g)
	}

	function deleteNode(nodeId: string) {
		nodes = nodes.filter(n => n.id !== nodeId)
		links = links.filter(l => l.source !== nodeId && l.target !== nodeId)
		selectedNodes = selectedNodes.filter(id => id !== nodeId)
		
		// Refresh visualization
		const svg = d3.select(svgElement)
		const g = svg.select('g')
		updateVisualization(g)
	}

    function showDeleteConnectionConfirm(connection) {
	const sourceNode = getNodeById(connection.source)
	const targetNode = getNodeById(connection.target)
	
	confirmMessage = `Delete connection: "${sourceNode.name}" ${connection.relationship} "${targetNode.name}"?`
	confirmAction = () => deleteConnection(connection.id)
	showConfirmModal = true
}

function showDeleteNodeConfirm(node) {
	confirmMessage = `Delete mechanic: "${node.name}"?`
	confirmAction = () => deleteNode(node.id)
	showConfirmModal = true
}

function executeConfirmAction() {
	if (confirmAction) {
		confirmAction()
	}
	closeConfirmModal()
}

function closeConfirmModal() {
	showConfirmModal = false
	confirmMessage = ''
	confirmAction = null
}

    function openConnectionManager() {
	    showConnectionManager = true
    }

    function closeConnectionManager() {
        showConnectionManager = false
    }

    function deleteConnection(connectionId) {
        links = links.filter(l => l.id !== connectionId)
        
        // Refresh visualization
        const svg = d3.select(svgElement)
        const g = svg.select('g')
        updateVisualization(g)
    }

	function openConnectionModal() {
		if (selectedNodes.length !== 2) {
			alert('Please select exactly 2 nodes (Shift+click) to create a connection')
			return
		}
		
		connectionSource = selectedNodes[0]
		connectionTarget = selectedNodes[1]
		connectionRelationship = 'requires'
		connectionDescription = ''
		showConnectionModal = true
	}

	function saveConnection() {
		if (!connectionSource || !connectionTarget || !connectionRelationship) return

		const newLink: MechanicLink = {
			id: `link_${Date.now()}`,
			source: connectionSource,
			target: connectionTarget,
			relationship: connectionRelationship,
			description: connectionDescription.trim()
		}

		links = [...links, newLink]
		selectedNodes = []
		showConnectionModal = false
		
		// Refresh visualization
		const svg = d3.select(svgElement)
		const g = svg.select('g')
		updateVisualization(g)
	}

	function clearSelection() {
		selectedNodes = []
		const svg = d3.select(svgElement)
		const g = svg.select('g')
		updateVisualization(g)
	}

	function resetView() {
		const svg = d3.select(svgElement)
		svg.transition().duration(750).call(
			d3.zoom().transform,
			d3.zoomIdentity
		)
	}

	// Predefined templates
	function loadCardGameTemplate() {
		nodes = [
			{
				id: 'deck',
				name: 'Deck',
				description: 'Collection of cards',
				category: 'Game Components',
				mechanicType: 'component',
				details: { examples: 'Standard 52-card deck, custom cards' },
				x: 200, y: 300, color: '#4caf50'
			},
			{
				id: 'hand',
				name: 'Player Hand',
				description: 'Cards held by player',
				category: 'Game Components',
				mechanicType: 'component',
				details: { requirements: 'Hand size limits' },
				x: 400, y: 200, color: '#4caf50'
			},
			{
				id: 'draw',
				name: 'Draw Cards',
				description: 'Take cards from deck',
				category: 'Player Actions',
				mechanicType: 'action',
				details: { trigger: 'Start of turn', cost: 'Free action' },
				x: 300, y: 100, color: '#ff9800'
			},
			{
				id: 'play',
				name: 'Play Card',
				description: 'Use a card from hand',
				category: 'Player Actions',
				mechanicType: 'action',
				details: { cost: 'Card from hand', effect: 'Varies by card' },
				x: 500, y: 100, color: '#ff9800'
			},
			{
				id: 'discard',
				name: 'Discard Pile',
				description: 'Used cards pile',
				category: 'Game Components',
				mechanicType: 'component',
				details: { trigger: 'Cards played or discarded' },
				x: 600, y: 300, color: '#4caf50'
			}
		]
		
		links = [
			{ id: 'deck-hand', source: 'deck', target: 'hand', relationship: 'produces' },
			{ id: 'draw-deck', source: 'draw', target: 'deck', relationship: 'requires' },
			{ id: 'play-hand', source: 'play', target: 'hand', relationship: 'requires' },
			{ id: 'play-discard', source: 'play', target: 'discard', relationship: 'produces' }
		]
		
		selectedNodes = []
		const svg = d3.select(svgElement)
		const g = svg.select('g')
		updateVisualization(g)
	}
</script>

<!-- Rest of your template stays exactly the same -->
<div style="padding: 2rem;">
	<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
		<h2 style="margin: 0;">⚙️ Game Mechanics Flow Chart</h2>
		<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
			<button 
				on:click={loadCardGameTemplate}
				style="padding: 0.5rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;"
			>
				📋 Card Game Template
			</button>
			<button 
				on:click={openConnectionModal}
				style="padding: 0.5rem 1rem; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;"
			>
				🔗 Connect Nodes ({selectedNodes.length})
			</button>
            	<button 
                    on:click={openConnectionManager}
                    style="padding: 0.5rem 1rem; background: #9c27b0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;"
                >
                    🔗 Manage Connections
                </button>
			<button 
				on:click={clearSelection}
				style="padding: 0.5rem 1rem; background: #f5f5f5; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.875rem;"
			>
				Clear Selection
			</button>
			<button 
				on:click={resetView}
				style="padding: 0.5rem 1rem; background: #f5f5f5; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.875rem;"
			>
				Reset View
			</button>
			<button 
				on:click={() => createNewNode(450, 350)}
				style="padding: 0.5rem 1rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;"
			>
				+ Add Mechanic
			</button>
		</div>
	</div>

	<div style="background: white; border-radius: 8px; border: 1px solid #ddd; position: relative; overflow: hidden;">
		<svg bind:this={svgElement} style="display: block;"></svg>
		
        <!-- Update the instructions overlay -->
        <div style="position: absolute; top: 10px; left: 10px; background: rgba(255,255,255,0.95); padding: 1rem; border-radius: 6px; font-size: 0.8rem; max-width: 280px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">Quick Guide:</h4>
            <ul style="margin: 0; padding-left: 1.2rem; line-height: 1.4;">
                <li><strong>Double-click</strong>: Add new mechanic</li>
                <li><strong>Click node</strong>: Edit mechanic details</li>
                <li><strong>Drag</strong>: Move node</li>
                <li><strong>Shift+Click</strong>: Select multiple nodes</li>
                <li><strong>Connect button</strong>: Link 2 selected nodes</li>
                <li><strong>Click connection</strong>: Delete connection</li>
                <li><strong>Right-click</strong>: Delete mechanic/connection</li>
            </ul>
        </div>

		<!-- Legend -->
		<div style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.95); padding: 1rem; border-radius: 6px; font-size: 0.8rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
			<h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">Node Types:</h4>
			{#each nodeTypes as type}
				<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
					<div style="width: 12px; height: 12px; background: {type.color}; border-radius: 2px;"></div>
					<span style="font-size: 0.75rem;">{type.label}</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Enhanced Node Editor Modal -->
{#if showModal && editingNode}
	<div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000;">
		<div style="background: white; padding: 2rem; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
			<h3 style="margin: 0 0 1.5rem 0; color: #1976d2;">
				{isNewNode ? 'Add New Mechanic' : 'Edit Mechanic'}
			</h3>

			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
				<div>
					<label for="node-name" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
						Name *
					</label>
					<input
						id="node-name"
						type="text"
						bind:value={nodeName}
						placeholder="e.g., Draw Card, Health Points"
						style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px;"
					/>
				</div>

				<div>
					<label for="node-type" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
						Type *
					</label>
					<select
						id="node-type"
						bind:value={nodeMechanicType}
						style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px;"
					>
						{#each nodeTypes as type}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<div style="margin-bottom: 1rem;">
				<label for="node-category" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
					Category
				</label>
				<select
					id="node-category"
					bind:value={nodeCategory}
					style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px;"
				>
					{#each nodeCategories as category}
						<option value={category}>{category}</option>
					{/each}
				</select>
			</div>

			<div style="margin-bottom: 1rem;">
				<label for="node-description" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
					Description
				</label>
				<textarea
					id="node-description"
					bind:value={nodeDescription}
					placeholder="Describe what this mechanic does..."
					rows="3"
					style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"
				></textarea>
			</div>

			<!-- Detailed fields based on type -->
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
				<div>
					<label for="node-trigger" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
						Trigger/When
					</label>
					<input
						id="node-trigger"
						type="text"
						bind:value={nodeTrigger}
						placeholder="When does this activate?"
						style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;"
					/>
				</div>

				<div>
					<label for="node-cost" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
						Cost/Resource
					</label>
					<input
						id="node-cost"
						type="text"
						bind:value={nodeCost}
						placeholder="What does it cost?"
						style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;"
					/>
				</div>
			</div>

			<div style="margin-bottom: 1rem;">
				<label for="node-effect" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
					Effect/What Happens
				</label>
				<input
					id="node-effect"
					type="text"
					bind:value={nodeEffect}
					placeholder="What is the result or effect?"
					style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;"
				/>
			</div>

			<div style="margin-bottom: 1rem;">
				<label for="node-requirements" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
					Requirements/Conditions
				</label>
				<input
					id="node-requirements"
					type="text"
					bind:value={nodeRequirements}
					placeholder="What conditions must be met?"
					style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;"
				/>
			</div>

			<div style="margin-bottom: 1.5rem;">
				<label for="node-examples" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
					Examples
				</label>
				<input
					id="node-examples"
					type="text"
					bind:value={nodeExamples}
					placeholder="Specific examples or variations"
					style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;"
				/>
			</div>

			<div style="display: flex; justify-content: flex-end; gap: 1rem;">
				<button 
					on:click={() => showModal = false}
					style="padding: 0.75rem 1.5rem; background: #f5f5f5; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;"
				>
					Cancel
				</button>
				<button 
					on:click={saveNode}
					disabled={!nodeName.trim()}
					style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; opacity: {nodeName.trim() ? 1 : 0.5};"
				>
					{isNewNode ? 'Add Mechanic' : 'Save Changes'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Connection Modal -->
{#if showConnectionModal}
	<div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000;">
		<div style="background: white; padding: 2rem; border-radius: 12px; width: 90%; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
			<h3 style="margin: 0 0 1.5rem 0; color: #1976d2;">Create Connection</h3>

			<div style="margin-bottom: 1rem;">
				<label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
					From: {nodes.find(n => n.id === connectionSource)?.name}
				</label>
				<label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
					To: {nodes.find(n => n.id === connectionTarget)?.name}
				</label>
			</div>

			<div style="margin-bottom: 1rem;">
				<label for="relationship" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
					Relationship *
				</label>
				<select
					id="relationship"
					bind:value={connectionRelationship}
					style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px;"
				>
					{#each relationshipTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>

			<div style="margin-bottom: 1.5rem;">
				<label for="connection-desc" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
					Description (optional)
				</label>
				<input
					id="connection-desc"
					type="text"
					bind:value={connectionDescription}
					placeholder="Describe the relationship..."
					style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px;"
				/>
			</div>

			<div style="display: flex; justify-content: flex-end; gap: 1rem;">
				<button 
					on:click={() => showConnectionModal = false}
					style="padding: 0.75rem 1.5rem; background: #f5f5f5; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;"
				>
					Cancel
				</button>
				<button 
					on:click={saveConnection}
					style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;"
				>
					Create Connection
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Confirmation Modal -->
{#if showConfirmModal}
	<div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1001;">
		<div style="background: white; padding: 2rem; border-radius: 12px; width: 90%; max-width: 450px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
			<h3 style="margin: 0 0 1rem 0; color: #f44336; display: flex; align-items: center; gap: 0.5rem;">
				⚠️ Confirm Deletion
			</h3>

			<p style="margin: 0 0 2rem 0; color: #333; line-height: 1.5;">
				{confirmMessage}
			</p>

			<div style="display: flex; justify-content: flex-end; gap: 1rem;">
				<button 
					on:click={closeConfirmModal}
					style="padding: 0.75rem 1.5rem; background: #f5f5f5; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;"
				>
					Cancel
				</button>
				<button 
					on:click={executeConfirmAction}
					style="padding: 0.75rem 1.5rem; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;"
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}
<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  // Props
  export let worlds = [];
  export let onWorldClick = undefined;

  let container;
  let scene, camera, renderer, controls;
  let worldMeshes = [];
  let connectionLines = []; // Track connection lines separately
  let raycaster, mouse;
  let hoveredWorld = null;
  let isInitialized = false;
  let worldsSnapshot = '';

  // Color palette - earthy tones
  const colors = {
    primary: 0x6b8e6f,    // sage green
    secondary: 0xa8896c,  // clay
    accent: 0x8fae92,     // light sage
    background: 0x2a2a2a, // dark bg
    connection: 0x5a6f5c  // muted green
  };

  onMount(() => {
    initScene();
    isInitialized = true;
    worldsSnapshot = JSON.stringify(worlds);
    updateWorldNodes();
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer) {
        renderer.dispose();
      }
      isInitialized = false;
    };
  });

  // Rebuild when worlds data actually changes
  $: if (isInitialized && worlds) {
    const newSnapshot = JSON.stringify(worlds);
    if (newSnapshot !== worldsSnapshot) {
      worldsSnapshot = newSnapshot;
      updateWorldNodes();
    }
  }

  function updateWorldNodes() {
    if (!scene) return;
    
    // Remove all tracked connection lines first
    connectionLines.forEach(line => {
      scene.remove(line);
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
    });
    connectionLines = [];
    
    // Clear existing world nodes (this will also remove their children including labels)
    worldMeshes.forEach(mesh => {
      // Dispose of all children
      mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
        if (child.material?.map) child.material.map.dispose();
      });
      scene.remove(mesh);
    });
    worldMeshes = [];
    
    // Remove any remaining connection lines from scene
    const linesToRemove = [];
    scene.traverse((object) => {
      if (object.type === 'Line') {
        linesToRemove.push(object);
      }
    });
    linesToRemove.forEach(obj => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    
    // Recreate world nodes and connections
    createWorldNodes();
    createConnections();
  }

  function initScene() {
    // Scene setup
    scene = new THREE.Scene();
    
    // Create starfield background
    createStarfield();
    
    // Add subtle nebula-like fog
    scene.fog = new THREE.FogExp2(0x0a0a15, 0.015);

    // Camera
    camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(12, 12, 12);

    // Renderer with better quality settings
    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;

    // Enhanced lighting for better depth
    const ambientLight = new THREE.AmbientLight(0x4a5a7a, 0.3);
    scene.add(ambientLight);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 10, 10);
    mainLight.castShadow = true;
    scene.add(mainLight);

    // Rim light for depth
    const rimLight = new THREE.DirectionalLight(0x8fae92, 0.4);
    rimLight.position.set(-10, -5, -10);
    scene.add(rimLight);

    // Accent point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0x6b8e6f, 0.6, 30);
    pointLight1.position.set(0, 5, 0);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xa8896c, 0.4, 25);
    pointLight2.position.set(-8, -3, 8);
    scene.add(pointLight2);

    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Mouse move event
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);
  }

  function setupDragControls() {
    if (worldMeshes.length === 0) return;
    
    dragControls = new DragControls(worldMeshes, camera, renderer.domElement);
    dragControls.enabled = editMode;
    
    let isDragging = false;
    let draggedWorldMesh = null;
    
    // When dragging starts, disable orbit controls
    dragControls.addEventListener('dragstart', (event) => {
      controls.enabled = false;
      isDragging = true;
      
      // Find the actual world mesh (parent with userData)
      draggedWorldMesh = findWorldMesh(event.object);
      if (draggedWorldMesh) {
        draggedWorldMesh.material.emissiveIntensity = 0.8;
      }
      
      console.log('Drag start - connectionLines before removal:', connectionLines.length);
      
      // Remove all tracked connection lines but keep them in the array temporarily
      // rebuildConnections will clear the array properly
      connectionLines.forEach(line => {
        scene.remove(line);
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
      });
      
      console.log('Drag start - removed lines from scene');
    });
    
    // When dragging ends, save position and re-enable orbit controls
    dragControls.addEventListener('dragend', (event) => {
      isDragging = false;
      if (!editMode) {
        controls.enabled = true;
      }
      
      // Find the actual world mesh
      const worldMesh = findWorldMesh(event.object);
      
      if (worldMesh) {
        worldMesh.material.emissiveIntensity = 0.3;
        
        const worldData = worldMesh.userData;
        const position = worldMesh.position;
        
        if (onPositionUpdate && worldData?.id !== undefined) {
          onPositionUpdate(worldData.id, {
            x: Math.round(position.x * 100) / 100,
            y: Math.round(position.y * 100) / 100,
            z: Math.round(position.z * 100) / 100
          });
        }
      }
      
      draggedWorldMesh = null;
      
      // Rebuild connections after drag ends
      setTimeout(() => {
        rebuildConnections();
      }, 100);
    });
  }

  // Helper function to find the world mesh (the parent with userData)
  function findWorldMesh(object) {
    // Check if this object is already a world mesh
    if (worldMeshes.includes(object)) {
      return object;
    }
    
    // Check if the parent is a world mesh
    if (object.parent && worldMeshes.includes(object.parent)) {
      return object.parent;
    }
    
    // Search up the tree
    let current = object;
    while (current.parent) {
      if (worldMeshes.includes(current.parent)) {
        return current.parent;
      }
      current = current.parent;
    }
    
    return null;
  }

  function rebuildConnections() {
    console.log('Rebuilding connections. Current connectionLines count:', connectionLines.length);
    
    // Remove all tracked connection lines
    connectionLines.forEach(line => {
      scene.remove(line);
      if (line.geometry) {
        line.geometry.dispose();
      }
      if (line.material) {
        if (Array.isArray(line.material)) {
          line.material.forEach(mat => mat.dispose());
        } else {
          line.material.dispose();
        }
      }
    });
    
    // Clear the array
    connectionLines = [];
    
    // Check for any orphaned lines in the scene
    const orphanedLines = [];
    scene.traverse((obj) => {
      if (obj.type === 'Line') {
        orphanedLines.push(obj);
      }
    });
    
    console.log('Found orphaned lines in scene:', orphanedLines.length);
    
    // Remove any orphaned lines
    orphanedLines.forEach(line => {
      console.log('Removing orphaned line:', line);
      scene.remove(line);
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
    });
    
    // Recreate connections with current positions
    createConnections();
    console.log('Created new connectionLines count:', connectionLines.length);
  }

  function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Random position in a sphere
      const radius = 100 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Varied star colors (whites, blues, warm tones)
      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        // White stars
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.85) {
        // Bluish stars
        colors[i * 3] = 0.7;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 1;
      } else {
        // Warm stars (sage/clay tones)
        colors[i * 3] = 0.9;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.7;
      }

      // Varied sizes
      sizes[i] = Math.random() * 2 + 0.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  }

  function createWorldNodes() {
    worlds.forEach(world => {
      // Create sphere for world with improved material
      const geometry = new THREE.SphereGeometry(0.6, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: colors.primary,
        emissive: colors.primary,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.4
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(world.x, world.y, world.z);
      // Store both id and full world data
      sphere.userData = { 
        id: world.id,
        name: world.name,
        description: world.description,
        connections: world.connections
      };
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      scene.add(sphere);
      worldMeshes.push(sphere);

      // Outer glow ring for depth
      const ringGeometry = new THREE.RingGeometry(0.7, 0.75, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: colors.accent,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      sphere.add(ring);

      // Inner glow sphere
      const glowGeometry = new THREE.SphereGeometry(0.65, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: colors.accent,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      sphere.add(glow);

      // Larger outer glow for atmosphere
      const outerGlowGeometry = new THREE.SphereGeometry(0.85, 32, 32);
      const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: colors.primary,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending
      });
      const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
      sphere.add(outerGlow);

      // Add small orbiting particle for visual interest
      const particleGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: colors.secondary,
        transparent: true,
        opacity: 0.8
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(0.9, 0, 0);
      sphere.add(particle);

      // Create text label as child of sphere (so it moves with the world)
      const label = createLabel(world.name);
      label.position.set(0, 1.2, 0);
      sphere.add(label);
    });
  }

  function createLabel(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Dark background with border
    context.fillStyle = 'rgba(10, 10, 21, 0.85)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    context.strokeStyle = 'rgba(107, 142, 111, 0.6)';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Text
    context.font = 'Bold 22px Inter, Arial, sans-serif';
    context.fillStyle = '#e8dcc8';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2.5, 0.625, 1);
    return sprite;
  }

  function createConnections() {
    console.log('createConnections called, current connectionLines.length:', connectionLines.length);
    worlds.forEach((world, worldIndex) => {
      if (world.connections) {
        world.connections.forEach(targetId => {
          const targetWorld = worlds.find(w => w.id === targetId);
          if (targetWorld) {
            // Find the actual mesh positions (in case they've been moved)
            const worldMesh = worldMeshes.find(m => m.userData.id === world.id);
            const targetMesh = worldMeshes.find(m => m.userData.id === targetId);
            
            if (worldMesh && targetMesh) {
              const points = [
                worldMesh.position.clone(),
                targetMesh.position.clone()
              ];
              
              // Main connection line
              const geometry = new THREE.BufferGeometry().setFromPoints(points);
              const material = new THREE.LineBasicMaterial({
                color: colors.connection,
                transparent: true,
                opacity: 0.4,
                linewidth: 2
              });
              const line = new THREE.Line(geometry, material);
              line.userData.isConnectionLine = true; // Mark as connection line
              scene.add(line);
              connectionLines.push(line);
              
              // Glowing line overlay for depth
              const glowMaterial = new THREE.LineBasicMaterial({
                color: colors.accent,
                transparent: true,
                opacity: 0.15,
                linewidth: 3,
                blending: THREE.AdditiveBlending
              });
              const glowLine = new THREE.Line(geometry.clone(), glowMaterial);
              glowLine.userData.isConnectionLine = true; // Mark as connection line
              scene.add(glowLine);
              connectionLines.push(glowLine);
            }
          }
        });
      }
    });
    console.log('createConnections finished, new connectionLines.length:', connectionLines.length);
  }

  function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(worldMeshes);

    // Reset previous hover
    if (hoveredWorld) {
      hoveredWorld.material.emissiveIntensity = 0.3;
      // Scale back all children except the label (sprite)
      hoveredWorld.children.forEach((child, index) => {
        if (child.type !== 'Sprite') {
          child.scale.set(1, 1, 1);
        }
      });
      hoveredWorld = null;
      renderer.domElement.style.cursor = 'default';
    }

    // Set new hover with scale effect
    if (intersects.length > 0) {
      hoveredWorld = intersects[0].object;
      hoveredWorld.material.emissiveIntensity = 0.6;
      // Scale up all children except the label (sprite)
      hoveredWorld.children.forEach((child, index) => {
        if (child.type !== 'Sprite') {
          child.scale.set(1.15, 1.15, 1.15);
        }
      });
      renderer.domElement.style.cursor = 'pointer';
    }
  }

  function onMouseClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(worldMeshes, true); // Include children

    if (intersects.length > 0) {
      // Find the actual world mesh (parent with userData)
      let clickedObject = intersects[0].object;
      let worldMesh = null;
      
      // Check if clicked object is a world mesh
      if (worldMeshes.includes(clickedObject)) {
        worldMesh = clickedObject;
      } else if (clickedObject.parent && worldMeshes.includes(clickedObject.parent)) {
        // Clicked a child, get the parent
        worldMesh = clickedObject.parent;
      }
      
      if (worldMesh && worldMesh.userData && onWorldClick) {
        onWorldClick(worldMesh.userData);
      }
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Animate world nodes
    worldMeshes.forEach((mesh, index) => {
      // Gentle rotation
      mesh.rotation.y += 0.002 + (index * 0.0003);
      
      // Pulse the glow slightly
      const time = Date.now() * 0.001;
      const pulse = Math.sin(time + index) * 0.05 + 0.95;
      if (mesh.children[1]) { // Inner glow
        mesh.children[1].material.opacity = 0.15 * pulse;
      }
      
      // Rotate the ring
      if (mesh.children[0]) { // Ring
        mesh.children[0].rotation.z += 0.01;
      }
      
      // Orbit the particle
      if (mesh.children[3]) { // Particle
        const orbitSpeed = 0.02 + (index * 0.005);
        const orbitRadius = 0.9;
        mesh.children[3].position.x = Math.cos(time * orbitSpeed + index) * orbitRadius;
        mesh.children[3].position.z = Math.sin(time * orbitSpeed + index) * orbitRadius;
        mesh.children[3].position.y = Math.sin(time * orbitSpeed * 2 + index) * 0.2;
      }
    });

    renderer.render(scene, camera);
  }
</script>

<div class="world-graph-container">
  <div bind:this={container} class="canvas-container"></div>
  
  <div class="controls-overlay">
    <div class="control-hint">
      <span>🖱️ Drag to orbit</span>
      <span>🔍 Scroll to zoom</span>
      <span>👆 Click to explore</span>
    </div>
  </div>
</div>

<style>
  .world-graph-container {
    width: 100%;
    height: 100vh;
    position: relative;
    background: linear-gradient(to bottom, #0a0a15 0%, #1a1a2e 50%, #0f0f1a 100%);
  }

  .canvas-container {
    width: 100%;
    height: 100%;
  }

  .controls-overlay {
    position: absolute;
    top: 20px;
    right: 20px;
    pointer-events: none;
  }

  .control-hint {
    background: rgba(10, 10, 21, 0.85);
    border: 1px solid rgba(107, 142, 111, 0.4);
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    color: #e8dcc8;
    font-family: 'Inter', -apple-system, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .control-hint span {
    display: block;
  }

  .edit-mode-label {
    color: #6b8e6f;
    font-weight: 600;
    border-bottom: 1px solid rgba(107, 142, 111, 0.3);
    padding-bottom: 4px;
    margin-bottom: 4px;
  }
</style>
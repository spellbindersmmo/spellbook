<script lang="ts">
  import { supabase } from '$lib/supabase';
  import type { Project } from '../types';

  interface Props {
    project: Project;
  }

  let { project }: Props = $props();

  // User-defined keyword library (loaded from database)
  let keywordLibrary = $state<Array<{id: string, name: string, definition: string}>>([]);
  
  // Classes and subclasses from the world
  let worldClasses = $state<Array<{id: string, name: string, description: string}>>([]);
  let worldSubclasses = $state<Array<{id: string, name: string, description: string, class_id: string}>>([]);
  
  // Filtered subclasses based on selected class
  let filteredSubclasses = $derived.by(() => {
    if (!currentCard.class) {
      console.log('No class selected');
      return [];
    }
    
    const selectedClass = worldClasses.find(c => c.name === currentCard.class);
    console.log('Selected class:', selectedClass);
    console.log('All subclasses:', worldSubclasses);
    
    if (!selectedClass) {
      console.log('Class not found in worldClasses');
      return [];
    }
    
    const filtered = worldSubclasses.filter(sc => {
      console.log(`Checking subclass ${sc.name}: class_id=${sc.class_id} vs selected=${selectedClass.id}`);
      return sc.class_id === selectedClass.id;
    });
    
    console.log('Filtered subclasses:', filtered);
    return filtered;
  });
  
  // Load keyword library from database
  async function loadKeywordLibrary() {
    const { data, error } = await supabase
      .from('game_keywords')
      .select('*')
      .eq('project_id', project.id)
      .order('name');
    
    if (error) {
      console.error('Error loading keyword library:', error);
    } else {
      keywordLibrary = data || [];
    }
  }

  // Load classes from the project's worlds
  async function loadWorldClasses() {
    console.log('Loading classes for project:', project.id);
    
    // Get all worlds for this project
    const { data: worlds, error: worldsError } = await supabase
      .from('worlds')
      .select('id')
      .eq('project_id', project.id);
    
    if (worldsError) {
      console.error('Error loading worlds:', worldsError);
      return;
    }
    
    if (!worlds || worlds.length === 0) {
      console.log('No worlds found for project');
      worldClasses = [];
      return;
    }
    
    const worldIds = worlds.map(w => w.id);
    console.log('Found world IDs:', worldIds);
    
    // Query classes from project's worlds
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, description, world_id')
      .in('world_id', worldIds)
      .order('name');
    
    console.log('Classes query result:', { data, error });
    
    if (error) {
      console.error('Error loading classes:', error);
    } else {
      worldClasses = data || [];
      console.log('Loaded classes:', worldClasses);
    }
  }

  // Load subclasses from the project's worlds
  async function loadWorldSubclasses() {
    console.log('Loading subclasses for project:', project.id);
    
    // Get all worlds for this project
    const { data: worlds, error: worldsError } = await supabase
      .from('worlds')
      .select('id')
      .eq('project_id', project.id);
    
    if (worldsError) {
      console.error('Error loading worlds:', worldsError);
      return;
    }
    
    if (!worlds || worlds.length === 0) {
      console.log('No worlds found for project');
      worldSubclasses = [];
      return;
    }
    
    const worldIds = worlds.map(w => w.id);
    
    // Query subclasses from project's worlds
    const { data, error } = await supabase
      .from('subclasses')
      .select('id, name, description, class_id, world_id')
      .in('world_id', worldIds)
      .order('name');
    
    console.log('Subclasses query result:', { data, error });
    
    if (error) {
      console.error('Error loading subclasses:', error);
    } else {
      worldSubclasses = data || [];
      console.log('Loaded subclasses:', worldSubclasses);
    }
  }

  // Save keyword to library
  async function saveKeyword(name: string, definition: string) {
    const { data, error } = await supabase
      .from('game_keywords')
      .insert({
        project_id: project.id,
        name: name.toLowerCase(),
        definition: definition
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving keyword:', error);
      return null;
    } else {
      keywordLibrary = [...keywordLibrary, data];
      return data;
    }
  }

  // Update keyword in library
  async function updateKeyword(id: string, name: string, definition: string) {
    const { error } = await supabase
      .from('game_keywords')
      .update({ name: name.toLowerCase(), definition })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating keyword:', error);
    } else {
      keywordLibrary = keywordLibrary.map(kw => 
        kw.id === id ? { ...kw, name: name.toLowerCase(), definition } : kw
      );
    }
  }

  // Delete keyword from library
  async function deleteKeyword(id: string) {
    const { error } = await supabase
      .from('game_keywords')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting keyword:', error);
    } else {
      keywordLibrary = keywordLibrary.filter(kw => kw.id !== id);
    }
  }

  // View state
  let activeView = $state<'gallery' | 'create' | 'template'>('gallery');
  
  // Keyword library modal
  let showKeywordLibrary = $state(false);
  let editingKeyword = $state<{id: string, name: string, definition: string} | null>(null);
  let newKeywordName = $state('');
  let newKeywordDefinition = $state('');
  
  // Card template configuration
  let cardTemplate = $state({
    fields: [
      { id: 'name', label: 'Name', type: 'text', required: true, showOnCard: true, position: 'top', placeholder: '' },
      { id: 'image', label: 'Image', type: 'image', required: false, showOnCard: true, position: 'center', placeholder: '' },
      { id: 'cost', label: 'Cost', type: 'number', required: false, showOnCard: true, position: 'top-right', placeholder: '' },
      { id: 'attack', label: 'Attack', type: 'number', required: false, showOnCard: true, position: 'bottom-left', placeholder: '' },
      { id: 'defense', label: 'Defense', type: 'number', required: false, showOnCard: true, position: 'bottom-right', placeholder: '' },
      { id: 'class', label: 'Class', type: 'select', options: [], required: false, showOnCard: true, position: 'bottom', placeholder: '' },
      { id: 'subclass', label: 'Subclass', type: 'select', required: false, showOnCard: true, position: 'bottom', placeholder: '' },
      { id: 'description', label: 'Description', type: 'textarea', required: false, showOnCard: true, position: 'bottom', placeholder: '' }
    ],
    layout: 'standard', // standard, minimal, detailed
    theme: 'fantasy' // fantasy, scifi, modern, custom
  });

  // Create a derived value that forces reactivity for custom fields in preview
  let customFieldsForPreview = $derived(
    cardTemplate.fields.filter(f => 
      f.showOnCard && 
      !['name', 'image', 'cost', 'attack', 'defense', 'class', 'subclass', 'keywords', 'description'].includes(f.id)
    )
  );

  // Create derived values for standard fields to ensure reactivity
  let nameField = $derived(cardTemplate.fields.find(f => f.id === 'name'));
  let imageField = $derived(cardTemplate.fields.find(f => f.id === 'image'));
  let costField = $derived(cardTemplate.fields.find(f => f.id === 'cost'));
  let attackField = $derived(cardTemplate.fields.find(f => f.id === 'attack'));
  let defenseField = $derived(cardTemplate.fields.find(f => f.id === 'defense'));
  let classField = $derived(cardTemplate.fields.find(f => f.id === 'class'));
  let subclassField = $derived(cardTemplate.fields.find(f => f.id === 'subclass'));
  let keywordsField = $derived(cardTemplate.fields.find(f => f.id === 'keywords'));
  let descriptionField = $derived(cardTemplate.fields.find(f => f.id === 'description'));

  // Helper to find field by id with reactivity
  function getField(id: string) {
    return cardTemplate.fields.find(f => f.id === id);
  }

  // Helper to check if field should show
  function shouldShowField(id: string) {
    return getField(id)?.showOnCard ?? false;
  }

  // Extract keyword name from brackets (e.g., "[disease]" -> "disease")
  function getKeywordName(keyword: string): string {
    const match = keyword.match(/^\[(.*?)\]$/);
    return match ? match[1].toLowerCase() : keyword.toLowerCase();
  }

  // Get keyword definition for tooltip from library
  function getKeywordDefinition(keyword: string): string | undefined {
    const keywordName = getKeywordName(keyword);
    const found = keywordLibrary.find(kw => kw.name === keywordName);
    return found?.definition;
  }

  // Check if keyword has a definition
  function hasDefinition(keyword: string): boolean {
    return getKeywordDefinition(keyword) !== undefined;
  }

  // Parse description text and extract keywords for rendering
  function parseDescriptionWithKeywords(text: string) {
    if (!text) return [];
    
    const parts: Array<{type: 'text' | 'keyword' | 'linebreak', content: string, definition?: string}> = [];
    const regex = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the keyword
      if (match.index > lastIndex) {
        const textBefore = text.substring(lastIndex, match.index);
        addTextWithLineBreaks(parts, textBefore);
      }

      // Add the keyword
      const keywordName = match[1].toLowerCase();
      const definition = keywordLibrary.find(kw => kw.name === keywordName)?.definition;
      
      parts.push({
        type: 'keyword',
        content: keywordName,
        definition: definition
      });

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const textAfter = text.substring(lastIndex);
      addTextWithLineBreaks(parts, textAfter);
    }

    return parts;
  }

  // Helper to add text with line breaks
  function addTextWithLineBreaks(parts: any[], text: string) {
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (line) {
        parts.push({
          type: 'text',
          content: line
        });
      }
      // Add line break after each line except the last
      if (index < lines.length - 1) {
        parts.push({
          type: 'linebreak',
          content: ''
        });
      }
    });
  }

  // Debug: Log when template changes
  $effect(() => {
    console.log('Template changed:', cardTemplate.fields.length, 'fields');
    console.log('Custom fields for preview:', customFieldsForPreview.length);
    console.log('Name field visible:', nameField?.showOnCard);
    console.log('Cost field visible:', costField?.showOnCard);
  });

  // Create a computed visibility string to force re-rendering
  let visibilityState = $derived(
    cardTemplate.layout + ':' + cardTemplate.theme + ':' + 
    cardTemplate.fields.map(f => `${f.id}:${f.showOnCard}:${f.position}`).join(',')
  );

  // Group fields by position for dynamic rendering
  let fieldsByPosition = $derived.by(() => {
    const grouped: Record<string, any[]> = {
      'top': [],
      'top-left': [],
      'top-right': [],
      'center': [],
      'middle': [],
      'bottom': [],
      'bottom-left': [],
      'bottom-right': [],
      'hidden': []
    };
    
    cardTemplate.fields.forEach(field => {
      if (field.showOnCard && field.position) {
        grouped[field.position].push(field);
      }
    });
    
    return grouped;
  });

  // Card data
  let cards = $state<any[]>([]);
  let currentCard = $state<any>(createEmptyCard());
  let editingCardId = $state<string | null>(null);
  
  // Search & filter
  let searchQuery = $state('');
  let filterClass = $state('all');
  let sortBy = $state<'name' | 'cost' | 'created'>('created');
  
  // UI state
  let isSaving = $state(false);
  let saveMessage = $state('');
  let showImageUpload = $state(false);
  let cardScale = $state(1);
  let editingFieldIndex = $state<number | null>(null);
  let templateSaving = $state(false);
  let templateMessage = $state('');

  // Available themes
  const themes = [
    { id: 'fantasy', name: 'Fantasy', colors: { primary: '#9FB396', secondary: '#D4A574', bg: '#2F2C25' } },
    { id: 'scifi', name: 'Sci-Fi', colors: { primary: '#64B5F6', secondary: '#BA68C8', bg: '#1A1A2E' } },
    { id: 'modern', name: 'Modern', colors: { primary: '#4A5568', secondary: '#ECC94B', bg: '#F7FAFC' } },
    { id: 'horror', name: 'Horror', colors: { primary: '#742A2A', secondary: '#2D3748', bg: '#1A1A1A' } }
  ];

  function createEmptyCard() {
    const card: any = { id: null };
    cardTemplate.fields.forEach(field => {
      if (field.type === 'tags') {
        card[field.id] = [];
      } else if (field.type === 'number') {
        card[field.id] = 0;
      } else if (field.type === 'checkbox') {
        card[field.id] = false;
      } else if (field.type === 'color') {
        card[field.id] = '#D4A574';
      } else {
        card[field.id] = '';
      }
    });
    return card;
  }

  // Load cards on mount
  $effect(() => {
    loadCards();
    loadKeywordLibrary();
    loadWorldClasses();
    loadWorldSubclasses();
  });

  async function loadCards() {
    const { data, error } = await supabase
      .from('game_cards')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading cards:', error);
    } else {
      cards = data || [];
    }
  }

  async function saveCard() {
    isSaving = true;
    saveMessage = '';

    // Remove id field from card data (database will generate it)
    const { id, ...cardDataWithoutId } = currentCard;
    
    const cardData = {
      project_id: project.id,
      ...cardDataWithoutId
    };

    try {
      if (editingCardId) {
        // Update existing card - don't include project_id in update
        const { project_id, ...updateData } = cardData;
        const { error } = await supabase
          .from('game_cards')
          .update(updateData)
          .eq('id', editingCardId);

        if (error) throw error;
        saveMessage = 'Card updated successfully!';
      } else {
        // Create new card
        const { error } = await supabase
          .from('game_cards')
          .insert([cardData]);

        if (error) throw error;
        saveMessage = 'Card created successfully!';
      }

      await loadCards();
      
      setTimeout(() => {
        saveMessage = '';
        activeView = 'gallery';
        currentCard = createEmptyCard();
        editingCardId = null;
      }, 1500);
    } catch (error) {
      console.error('Error saving card:', error);
      saveMessage = 'Error saving card. Please try again.';
    } finally {
      isSaving = false;
    }
  }

  function editCard(card: any) {
    currentCard = { ...card };
    editingCardId = card.id;
    activeView = 'create';
  }

  async function deleteCard(cardId: string) {
    if (!confirm('Are you sure you want to delete this card?')) return;

    const { error } = await supabase
      .from('game_cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      console.error('Error deleting card:', error);
    } else {
      await loadCards();
    }
  }

  function newCard() {
    currentCard = createEmptyCard();
    editingCardId = null;
    activeView = 'create';
  }

  function addKeyword(fieldId: string) {
    const input = document.getElementById(`${fieldId}-input`) as HTMLInputElement;
    const value = input?.value.trim();
    if (value && !currentCard[fieldId].includes(value)) {
      currentCard[fieldId] = [...currentCard[fieldId], value];
      input.value = '';
    }
  }

  function removeKeyword(fieldId: string, keyword: string) {
    currentCard[fieldId] = currentCard[fieldId].filter((k: string) => k !== keyword);
  }

  // Computed filtered cards
  let filteredCards = $derived.by(() => {
    let filtered = cards;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(card => 
        card.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Class filter
    if (filterClass !== 'all') {
      filtered = filtered.filter(card => card.class === filterClass);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'cost') return (a.cost || 0) - (b.cost || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  });

  // Get unique classes from cards
  let cardClasses = $derived([...new Set(cards.map(c => c.class).filter(Boolean))]);

  // Template management functions
  function toggleFieldEditor(index: number) {
    editingFieldIndex = editingFieldIndex === index ? null : index;
  }

  function addCustomField() {
    const newField = {
      id: `custom_field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      showOnCard: true,
      position: 'bottom',
      placeholder: ''
    };
    cardTemplate.fields = [...cardTemplate.fields, newField];
    editingFieldIndex = cardTemplate.fields.length - 1;
  }

  function deleteField(index: number) {
    if (confirm('Are you sure you want to delete this field?')) {
      cardTemplate.fields = cardTemplate.fields.filter((_, i) => i !== index);
      editingFieldIndex = null;
    }
  }

  function updateField(index: number, updates: any) {
    cardTemplate.fields = cardTemplate.fields.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    );
  }

  async function saveTemplate() {
    templateSaving = true;
    templateMessage = '';

    try {
      // Save template to localStorage or database
      localStorage.setItem(`card_template_${project.id}`, JSON.stringify(cardTemplate));
      templateMessage = 'Template saved successfully!';
      
      setTimeout(() => {
        templateMessage = '';
      }, 2000);
    } catch (error) {
      console.error('Error saving template:', error);
      templateMessage = 'Error saving template';
    } finally {
      templateSaving = false;
    }
  }

  function loadTemplate() {
    try {
      const saved = localStorage.getItem(`card_template_${project.id}`);
      if (saved) {
        const loaded = JSON.parse(saved);
        // Ensure all fields have placeholder property
        loaded.fields = loaded.fields.map((f: any) => ({
          ...f,
          placeholder: f.placeholder || ''
        }));
        cardTemplate = loaded;
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  }

  // Load template on mount
  $effect(() => {
    loadTemplate();
  });
</script>

<div class="card-database">
  <!-- Header -->
  <div class="database-header">
    <div class="header-content">
      <div class="header-left">
        <h2 class="header-title">🎴 Card Database</h2>
        <div class="view-tabs">
          <button 
            class="tab"
            class:active={activeView === 'gallery'}
            on:click={() => activeView = 'gallery'}
          >
            Gallery
          </button>
          <button 
            class="tab"
            class:active={activeView === 'create'}
            on:click={() => activeView = 'create'}
          >
            {editingCardId ? 'Edit Card' : 'Create Card'}
          </button>
          <button 
            class="tab"
            class:active={activeView === 'template'}
            on:click={() => activeView = 'template'}
          >
            Configure Template
          </button>
          <button 
            class="btn-keyword-library"
            on:click={() => showKeywordLibrary = true}
            title="Manage keyword definitions"
          >
            📖 Keywords
          </button>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat">
          <span class="stat-value">{cards.length}</span>
          <span class="stat-label">Total Cards</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Gallery View -->
  {#if activeView === 'gallery'}
    <div class="gallery-view">
      <!-- Filters & Search -->
      <div class="gallery-controls">
        <div class="search-bar">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="8" cy="8" r="6"/>
            <path d="M12.5 12.5L16 16"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search cards..."
            bind:value={searchQuery}
            class="search-input"
          />
        </div>

        <div class="filters">
          <select bind:value={filterClass} class="filter-select">
            <option value="all">All Classes</option>
            {#each cardClasses as cls}
              <option value={cls}>{cls}</option>
            {/each}
          </select>

          <select bind:value={sortBy} class="filter-select">
            <option value="created">Newest First</option>
            <option value="name">Name (A-Z)</option>
            <option value="cost">Cost (Low-High)</option>
          </select>

          <div class="scale-control">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="5" height="5" rx="1"/>
              <rect x="9" y="2" width="5" height="5" rx="1"/>
              <rect x="2" y="9" width="5" height="5" rx="1"/>
              <rect x="9" y="9" width="5" height="5" rx="1"/>
            </svg>
            <input 
              type="range" 
              min="0.5" 
              max="1.5" 
              step="0.1"
              bind:value={cardScale}
              class="scale-slider"
            />
          </div>
        </div>

        <button class="btn btn-primary" on:click={newCard}>
          + New Card
        </button>
      </div>

      <!-- Cards Grid -->
      {#if filteredCards.length === 0}
        <div class="empty-state">
          <div class="empty-icon">🎴</div>
          <h3 class="empty-title">
            {searchQuery || filterClass !== 'all' ? 'No cards found' : 'No cards yet'}
          </h3>
          <p class="empty-description">
            {searchQuery || filterClass !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first card to get started'}
          </p>
          {#if !searchQuery && filterClass === 'all'}
            <button class="btn btn-primary" on:click={newCard}>
              Create First Card
            </button>
          {/if}
        </div>
      {:else}
        <div class="cards-grid" style="--card-scale: {cardScale};">
          {#each filteredCards as card}
            <div class="card-wrapper">
              <div class="game-card" style="transform: scale(var(--card-scale));">
                <div class="card-header">
                  <span class="card-name">{card.name || 'Unnamed'}</span>
                  {#if card.cost !== undefined && card.cost !== null && card.cost !== ''}
                    <span class="card-cost">{card.cost}</span>
                  {/if}
                </div>

                {#if card.image}
                  <div class="card-image">
                    <img src={card.image} alt={card.name} />
                  </div>
                {/if}

                <div class="card-body">
                  {#if card.class}
                    <div class="card-class">{card.class}{card.subclass ? ` - ${card.subclass}` : ''}</div>
                  {/if}

                  {#if card.description}
                    <p class="card-description">
                      {#each parseDescriptionWithKeywords(card.description) as part}
                        {#if part.type === 'text'}
                          {part.content}
                        {:else if part.type === 'keyword'}
                          <span 
                            class="inline-keyword"
                            class:has-tooltip={part.definition}
                            title={part.definition || ''}
                          >
                            {part.content}
                          </span>
                        {:else if part.type === 'linebreak'}
                          <br />
                        {/if}
                      {/each}
                    </p>
                  {/if}
                </div>

                <div class="card-footer">
                  {#if card.attack !== undefined && card.attack !== null && card.attack !== ''}
                    <div class="card-stat">
                      <span class="stat-icon">⚔️</span>
                      <span class="stat-value">{card.attack}</span>
                    </div>
                  {/if}
                  {#if card.defense !== undefined && card.defense !== null && card.defense !== ''}
                    <div class="card-stat">
                      <span class="stat-icon">🛡️</span>
                      <span class="stat-value">{card.defense}</span>
                    </div>
                  {/if}
                </div>
              </div>

              <div class="card-actions">
                <button class="action-btn" on:click={() => editCard(card)} title="Edit">
                  ✏️
                </button>
                <button class="action-btn delete" on:click={() => deleteCard(card.id)} title="Delete">
                  🗑️
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  <!-- Create/Edit View -->
  {:else if activeView === 'create'}
    <div class="create-view">
      <!-- Left: Form -->
      <div class="form-section">
        <div class="section-header-with-icon">
          <div class="section-icon">✨</div>
          <div>
            <h3 class="section-title">{editingCardId ? 'Edit Card' : 'Craft New Card'}</h3>
            <p class="section-subtitle">Design your card with precision and creativity</p>
          </div>
        </div>
        
        <div class="form-container">
          {#each cardTemplate.fields.filter(f => f.position !== 'hidden') as field}
            {#if field.type === 'text'}
              <div class="form-field">
                <label class="field-label">
                  <span class="label-text">{field.label}</span>
                  {#if field.required}<span class="label-required">*</span>{/if}
                </label>
                <input
                  type="text"
                  bind:value={currentCard[field.id]}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  class="field-input"
                  required={field.required}
                />
              </div>

            {:else if field.type === 'number'}
              <div class="form-field form-field-small">
                <label class="field-label">
                  <span class="label-text">{field.label}</span>
                  {#if field.required}<span class="label-required">*</span>{/if}
                </label>
                <input
                  type="number"
                  bind:value={currentCard[field.id]}
                  placeholder={field.placeholder || "0"}
                  class="field-input"
                  min="0"
                  required={field.required}
                />
              </div>

            {:else if field.type === 'textarea'}
              <div class="form-field form-field-full">
                <label class="field-label">
                  <span class="label-text">{field.label}</span>
                  {#if field.required}<span class="label-required">*</span>{/if}
                </label>
                <textarea
                  bind:value={currentCard[field.id]}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  class="field-textarea"
                  rows="4"
                  required={field.required}
                ></textarea>
                {#if field.id === 'description'}
                  <p class="field-hint" style="margin-top: 0.5rem;">
                    💡 <strong>Tip:</strong> Use <code>[keyword]</code> syntax to add keyword tooltips. Example: "Deals 3 damage and applies <code>[poison]</code>"
                  </p>
                {/if}
              </div>

            {:else if field.type === 'tags'}
              <div class="form-field form-field-full">
                <label class="field-label">
                  <span class="label-text">{field.label}</span>
                  {#if field.required}<span class="label-required">*</span>{/if}
                </label>
                <div class="tags-container">
                  {#each (currentCard[field.id] || []) as tag}
                    <span class="tag-pill">
                      {tag}
                      <button 
                        type="button"
                        class="tag-remove"
                        on:click={() => removeKeyword(field.id, tag)}
                      >×</button>
                    </span>
                  {/each}
                  <input
                    type="text"
                    id="{field.id}-input"
                    placeholder={field.placeholder || "Add keyword..."}
                    class="tag-field-input"
                    on:keydown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword(field.id);
                      }
                    }}
                  />
                </div>
                <button 
                  type="button"
                  class="btn-add-tag"
                  on:click={() => addKeyword(field.id)}
                >
                  <span>+</span> Add {field.label}
                </button>
                {#if field.id === 'keywords'}
                  <p class="field-hint" style="margin-top: 0.75rem;">
                    💡 <strong>Tip:</strong> Wrap keywords in brackets like <code>[disease]</code>, <code>[shield]</code>, or <code>[trap]</code> to show tooltips on hover with automatic definitions!
                  </p>
                {/if}
              </div>

            {:else if field.type === 'select'}
              <div class="form-field form-field-small">
                <label class="field-label">
                  <span class="label-text">{field.label}</span>
                  {#if field.required}<span class="label-required">*</span>{/if}
                </label>
                {#if field.id === 'class'}
                  <!-- Class selector with world classes -->
                  <select 
                    bind:value={currentCard[field.id]} 
                    class="field-input" 
                    required={field.required}
                    on:change={() => {
                      // Clear subclass when class changes
                      currentCard.subclass = '';
                    }}
                  >
                    <option value="">Select {field.label}...</option>
                    {#each worldClasses as cls}
                      <option value={cls.name}>{cls.name}</option>
                    {/each}
                  </select>
                  {#if worldClasses.length === 0}
                    <p class="field-hint" style="margin-top: 0.5rem;">
                      💡 No classes found. Create classes in the Classes section first.
                    </p>
                  {/if}
                {:else if field.id === 'subclass'}
                  <!-- Subclass selector filtered by selected class -->
                  <select 
                    bind:value={currentCard[field.id]} 
                    class="field-input" 
                    required={field.required}
                    disabled={!currentCard.class}
                  >
                    <option value="">Select {field.label}...</option>
                    {#each filteredSubclasses as subcls}
                      <option value={subcls.name}>{subcls.name}</option>
                    {/each}
                  </select>
                  {#if !currentCard.class}
                    <p class="field-hint" style="margin-top: 0.5rem;">
                      Select a class first to see available subclasses
                    </p>
                  {:else if filteredSubclasses.length === 0}
                    <p class="field-hint" style="margin-top: 0.5rem;">
                      No subclasses available for this class
                    </p>
                  {/if}
                {:else if field.options && field.options.length > 0}
                  <!-- Generic select with predefined options -->
                  <select bind:value={currentCard[field.id]} class="field-input" required={field.required}>
                    <option value="">Select {field.label}...</option>
                    {#each field.options as option}
                      <option value={option}>{option}</option>
                    {/each}
                  </select>
                {:else}
                  <!-- Text input with datalist fallback -->
                  <input
                    type="text"
                    bind:value={currentCard[field.id]}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    class="field-input"
                    list="{field.id}-options"
                    required={field.required}
                  />
                  <datalist id="{field.id}-options">
                    {#each cardClasses as cls}
                      <option value={cls}></option>
                    {/each}
                  </datalist>
                {/if}
              </div>

            {:else if field.type === 'image'}
              <div class="form-field form-field-full">
                <label class="field-label">
                  <span class="label-text">{field.label}</span>
                  {#if field.required}<span class="label-required">*</span>{/if}
                </label>
                <input
                  type="url"
                  bind:value={currentCard[field.id]}
                  placeholder={field.placeholder || "https://example.com/image.jpg"}
                  class="field-input"
                  required={field.required}
                />
                <p class="field-hint">Enter a direct URL to an image file</p>
              </div>

            {:else if field.type === 'color'}
              <div class="form-field form-field-small">
                <label class="field-label">
                  <span class="label-text">{field.label}</span>
                  {#if field.required}<span class="label-required">*</span>{/if}
                </label>
                <div class="color-picker-group">
                  <input
                    type="color"
                    bind:value={currentCard[field.id]}
                    class="color-picker"
                    required={field.required}
                  />
                  <input
                    type="text"
                    bind:value={currentCard[field.id]}
                    placeholder={field.placeholder || "#D4A574"}
                    class="field-input"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

            {:else if field.type === 'checkbox'}
              <div class="form-field form-field-checkbox">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    bind:checked={currentCard[field.id]}
                    class="checkbox-input"
                  />
                  <span class="checkbox-text">{field.label}</span>
                </label>
              </div>
            {/if}
          {/each}
        </div>

        {#if saveMessage}
          <div class="save-status" class:error={saveMessage.includes('Error')}>
            <span class="status-icon">{saveMessage.includes('Error') ? '⚠️' : '✓'}</span>
            {saveMessage}
          </div>
        {/if}

        <div class="form-actions">
          <button 
            class="btn-primary-action"
            on:click={saveCard}
            disabled={isSaving}
          >
            <span class="btn-icon">{isSaving ? '⏳' : '💾'}</span>
            <span>{isSaving ? 'Saving...' : (editingCardId ? 'Update Card' : 'Create Card')}</span>
          </button>
          <button 
            class="btn-secondary-action"
            on:click={() => {
              activeView = 'gallery';
              currentCard = createEmptyCard();
              editingCardId = null;
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      <!-- Right: Live Preview -->
      <div class="preview-section">
        <div class="preview-header">
          <div class="preview-icon">👁️</div>
          <div>
            <h3 class="preview-title">Live Preview</h3>
            <p class="preview-subtitle">Watch your card come to life</p>
          </div>
        </div>
        <div class="preview-card-container">
          <div class="game-card preview-card">
            <div class="card-header">
              <span class="card-name">{currentCard.name || 'Card Name'}</span>
              {#if currentCard.cost !== undefined && currentCard.cost !== null && currentCard.cost !== ''}
                <span class="card-cost">{currentCard.cost}</span>
              {/if}
            </div>

            {#if currentCard.image}
              <div class="card-image">
                <img src={currentCard.image} alt={currentCard.name} />
              </div>
            {:else}
              <div class="card-image-placeholder">
                <span>🖼️</span>
              </div>
            {/if}

            <div class="card-body">
              {#if currentCard.class}
                <div class="card-class">{currentCard.class}{currentCard.subclass ? ` - ${currentCard.subclass}` : ''}</div>
              {/if}

              {#if currentCard.description}
                <p class="card-description">
                  {#each parseDescriptionWithKeywords(currentCard.description) as part}
                    {#if part.type === 'text'}
                      {part.content}
                    {:else if part.type === 'keyword'}
                      <span 
                        class="inline-keyword"
                        class:has-tooltip={part.definition}
                        title={part.definition || ''}
                      >
                        {part.content}
                      </span>
                    {:else if part.type === 'linebreak'}
                      <br />
                    {/if}
                  {/each}
                </p>
              {:else}
                <p class="card-description placeholder">Card description will appear here...</p>
              {/if}
            </div>

            <div class="card-footer">
              {#if currentCard.attack !== undefined && currentCard.attack !== null && currentCard.attack !== ''}
                <div class="card-stat">
                  <span class="stat-icon">⚔️</span>
                  <span class="stat-value">{currentCard.attack}</span>
                </div>
              {/if}
              {#if currentCard.defense !== undefined && currentCard.defense !== null && currentCard.defense !== ''}
                <div class="card-stat">
                  <span class="stat-icon">🛡️</span>
                  <span class="stat-value">{currentCard.defense}</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>

  <!-- Template Configuration View -->
  {:else if activeView === 'template'}
    <div class="template-view">
      <div class="template-header">
        <div>
          <h3 class="section-title">Card Template Configuration</h3>
          <p class="section-description">
            Customize which fields appear on your cards and how they're displayed. 
            Changes affect how new cards are created and displayed.
          </p>
        </div>
        <div class="template-header-actions">
          {#if templateMessage}
            <span class="template-message">{templateMessage}</span>
          {/if}
          <button 
            class="btn btn-primary" 
            on:click={saveTemplate}
            disabled={templateSaving}
          >
            {templateSaving ? 'Saving...' : '💾 Save Template'}
          </button>
        </div>
      </div>

      <div class="template-grid">
        <!-- Left: Field Configuration -->
        <div class="template-section">
          <div class="section-header-row">
            <h4 class="subsection-title">Card Fields</h4>
            <button class="btn btn-sm btn-secondary" on:click={addCustomField}>
              + Add Field
            </button>
          </div>

          <div class="fields-list">
            {#each cardTemplate.fields as field, index}
              <div class="field-item" class:editing={editingFieldIndex === index}>
                <div class="field-header">
                  <div class="field-drag-handle">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="4" cy="4" r="1.5"/>
                      <circle cx="12" cy="4" r="1.5"/>
                      <circle cx="4" cy="8" r="1.5"/>
                      <circle cx="12" cy="8" r="1.5"/>
                      <circle cx="4" cy="12" r="1.5"/>
                      <circle cx="12" cy="12" r="1.5"/>
                    </svg>
                  </div>
                  <div class="field-info">
                    <div class="field-name-row">
                      <span class="field-label">{field.label}</span>
                      <span class="field-type-badge">{field.type}</span>
                    </div>
                    <div class="field-meta">
                      {#if field.required}
                        <span class="field-tag required">Required</span>
                      {/if}
                      {#if field.showOnCard}
                        <span class="field-tag visible">Visible on card</span>
                      {/if}
                      {#if field.position}
                        <span class="field-tag position">{field.position}</span>
                      {/if}
                    </div>
                  </div>
                  <div class="field-actions">
                    <button 
                      class="icon-btn"
                      on:click={() => toggleFieldEditor(index)}
                      title="Edit field"
                    >
                      ✏️
                    </button>
                    {#if !field.id.match(/^(name|image|cost|attack|defense|class|subclass|keywords|description)$/)}
                      <button 
                        class="icon-btn delete"
                        on:click={() => deleteField(index)}
                        title="Delete field"
                      >
                        🗑️
                      </button>
                    {/if}
                  </div>
                </div>

                {#if editingFieldIndex === index}
                  <div class="field-editor">
                    <div class="editor-grid">
                      <div class="editor-group">
                        <label class="editor-label">Field Label</label>
                        <input
                          type="text"
                          value={field.label}
                          on:input={(e) => {
                            cardTemplate.fields = cardTemplate.fields.map((f, i) => 
                              i === index ? { ...f, label: e.currentTarget.value } : f
                            );
                          }}
                          class="input input-sm"
                          placeholder="e.g., Attack Power"
                        />
                      </div>

                      <div class="editor-group">
                        <label class="editor-label">Field ID</label>
                        <input
                          type="text"
                          value={field.id}
                          on:input={(e) => {
                            cardTemplate.fields = cardTemplate.fields.map((f, i) => 
                              i === index ? { ...f, id: e.currentTarget.value } : f
                            );
                          }}
                          class="input input-sm"
                          placeholder="e.g., attack_power"
                          disabled={field.id.match(/^(name|image|cost|attack|defense|class|subclass|keywords|description)$/)}
                        />
                      </div>

                      <div class="editor-group">
                        <label class="editor-label">Field Type</label>
                        <select 
                          value={field.type}
                          on:change={(e) => {
                            cardTemplate.fields = cardTemplate.fields.map((f, i) => 
                              i === index ? { ...f, type: e.currentTarget.value } : f
                            );
                          }}
                          class="input input-sm"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="textarea">Text Area</option>
                          <option value="tags">Tags/Keywords</option>
                          <option value="select">Select/Dropdown</option>
                          <option value="image">Image URL</option>
                          <option value="color">Color Picker</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>

                      <div class="editor-group">
                        <label class="editor-label">Card Position</label>
                        <select 
                          value={field.position}
                          on:change={(e) => {
                            cardTemplate.fields = cardTemplate.fields.map((f, i) => 
                              i === index ? { ...f, position: e.currentTarget.value } : f
                            );
                          }}
                          class="input input-sm"
                        >
                          <option value="top">Top</option>
                          <option value="top-left">Top Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="center">Center</option>
                          <option value="middle">Middle</option>
                          <option value="bottom">Bottom</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-right">Bottom Right</option>
                          <option value="hidden">Hidden (data only)</option>
                        </select>
                      </div>

                      {#if field.type === 'select'}
                        <div class="editor-group full-width">
                          <label class="editor-label">Options (comma-separated)</label>
                          <input
                            type="text"
                            value={field.options?.join(', ') || ''}
                            on:input={(e) => {
                              const options = e.currentTarget.value.split(',').map(s => s.trim()).filter(Boolean);
                              cardTemplate.fields = cardTemplate.fields.map((f, i) => 
                                i === index ? { ...f, options } : f
                              );
                            }}
                            class="input input-sm"
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        </div>
                      {/if}

                      <div class="editor-group full-width">
                        <label class="editor-label">Placeholder Text</label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          on:input={(e) => {
                            cardTemplate.fields = cardTemplate.fields.map((f, i) => 
                              i === index ? { ...f, placeholder: e.currentTarget.value } : f
                            );
                          }}
                          class="input input-sm"
                          placeholder="e.g., Enter attack value..."
                        />
                      </div>
                    </div>

                    <div class="editor-toggles">
                      <label class="toggle-label">
                        <input 
                          type="checkbox" 
                          checked={field.required}
                          on:change={(e) => {
                            cardTemplate.fields = cardTemplate.fields.map((f, i) => 
                              i === index ? { ...f, required: e.currentTarget.checked } : f
                            );
                          }}
                        />
                        <span>Required field</span>
                      </label>
                      <label class="toggle-label">
                        <input 
                          type="checkbox" 
                          checked={field.showOnCard}
                          on:change={(e) => {
                            cardTemplate.fields = cardTemplate.fields.map((f, i) => 
                              i === index ? { ...f, showOnCard: e.currentTarget.checked } : f
                            );
                          }}
                        />
                        <span>Show on card</span>
                      </label>
                    </div>

                    <div class="editor-actions">
                      <button 
                        class="btn btn-sm btn-primary"
                        on:click={() => editingFieldIndex = null}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Right: Preview & Theme -->
        <div class="template-section">
          <h4 class="subsection-title">Card Preview</h4>
          <div class="preview-explanation">
            <p>This shows how your cards will look with the current template configuration.</p>
            <p class="debug-info" style="font-size: 0.75rem; color: var(--color-accent); margin-top: 0.5rem;">
              Debug: {cardTemplate.fields.filter(f => f.showOnCard).length} visible fields
            </p>
          </div>

          <div class="template-preview-wrapper">
            {#key visibilityState}
            <div class="game-card preview-card layout-{cardTemplate.layout} theme-{cardTemplate.theme}">
              <!-- Debug info to verify reactivity -->
              <div style="font-size: 0.7rem; padding: 0.5rem; background: rgba(212,165,116,0.1); border-bottom: 1px solid rgba(212,165,116,0.3);">
                Layout: {cardTemplate.layout} | Theme: {cardTemplate.theme}
              </div>

              <!-- Header (top, top-left, top-right) -->
              {#if fieldsByPosition['top'].length > 0 || fieldsByPosition['top-left'].length > 0 || fieldsByPosition['top-right'].length > 0}
                <div class="card-header">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    {#each fieldsByPosition['top-left'] as field}
                      <span class="card-badge">{field.label}</span>
                    {/each}
                    {#each fieldsByPosition['top'] as field}
                      {#if field.id === 'name'}
                        <span class="card-name">{field.label}</span>
                      {:else}
                        <span>{field.label}</span>
                      {/if}
                    {/each}
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    {#each fieldsByPosition['top-right'] as field}
                      {#if field.id === 'cost'}
                        <span class="card-cost">3</span>
                      {:else}
                        <span class="card-badge">{field.label}</span>
                      {/if}
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Image/Center -->
              {#if fieldsByPosition['center'].length > 0}
                <div class="card-image-placeholder">
                  <span>🖼️</span>
                </div>
              {/if}

              <div class="card-body">
                <!-- Middle fields -->
                {#each fieldsByPosition['middle'] as field}
                  {#if field.id === 'keywords'}
                    <div class="card-keywords">
                      <span class="keyword-tag">{field.label}</span>
                      <span class="keyword-tag">Sample</span>
                    </div>
                  {:else if field.type === 'tags'}
                    <div class="card-keywords">
                      <span class="keyword-tag">{field.label}</span>
                    </div>
                  {:else}
                    <div class="custom-field-preview">
                      <span class="custom-label">{field.label}:</span>
                      <span class="custom-value">Sample</span>
                    </div>
                  {/if}
                {/each}
                
                <!-- Bottom fields -->
                {#each fieldsByPosition['bottom'] as field}
                  {#if field.id === 'class'}
                    <div class="card-class">
                      {field.label}
                      {#if subclassField?.showOnCard && subclassField.position === 'bottom'}
                        - {subclassField.label}
                      {/if}
                    </div>
                  {:else if field.id === 'description'}
                    <p class="card-description">
                      {field.label}: This is sample text.
                    </p>
                  {:else if field.type === 'textarea'}
                    <p class="card-description">{field.label}: Sample text</p>
                  {:else}
                    <div class="custom-field-preview">
                      <span class="custom-label">{field.label}:</span>
                      <span class="custom-value">
                        {#if field.type === 'number'}
                          0
                        {:else if field.type === 'checkbox'}
                          ✓
                        {:else if field.type === 'color'}
                          <span class="color-preview-dot" style="background: #D4A574;"></span>
                        {:else}
                          Sample
                        {/if}
                      </span>
                    </div>
                  {/if}
                {/each}
              </div>

              <!-- Footer (bottom-left, bottom-right) -->
              {#if fieldsByPosition['bottom-left'].length > 0 || fieldsByPosition['bottom-right'].length > 0}
                <div class="card-footer">
                  {#each fieldsByPosition['bottom-left'] as field}
                    {#if field.id === 'attack'}
                      <div class="card-stat">
                        <span class="stat-icon">⚔️</span>
                        <span class="stat-value">5</span>
                      </div>
                    {:else}
                      <span class="card-badge">{field.label}</span>
                    {/if}
                  {/each}
                  {#each fieldsByPosition['bottom-right'] as field}
                    {#if field.id === 'defense'}
                      <div class="card-stat">
                        <span class="stat-icon">🛡️</span>
                        <span class="stat-value">4</span>
                      </div>
                    {:else}
                      <span class="card-badge">{field.label}</span>
                    {/if}
                  {/each}
                </div>
              {/if}
            </div>
            {/key}
          </div>

          <!-- Card Layout Options -->
          <div class="layout-section">
            <h4 class="subsection-title">Card Layout</h4>
            <div class="layout-grid">
              <button 
                class="layout-card"
                class:active={cardTemplate.layout === 'standard'}
                on:click={() => cardTemplate.layout = 'standard'}
              >
                <div class="layout-preview">
                  <div class="layout-box header"></div>
                  <div class="layout-box image"></div>
                  <div class="layout-box body"></div>
                  <div class="layout-box footer"></div>
                </div>
                <span class="layout-name">Standard</span>
                <span class="layout-desc">Traditional card layout</span>
              </button>

              <button 
                class="layout-card"
                class:active={cardTemplate.layout === 'minimal'}
                on:click={() => cardTemplate.layout = 'minimal'}
              >
                <div class="layout-preview">
                  <div class="layout-box header small"></div>
                  <div class="layout-box image large"></div>
                  <div class="layout-box body small"></div>
                </div>
                <span class="layout-name">Minimal</span>
                <span class="layout-desc">Focus on image</span>
              </button>

              <button 
                class="layout-card"
                class:active={cardTemplate.layout === 'detailed'}
                on:click={() => cardTemplate.layout = 'detailed'}
              >
                <div class="layout-preview">
                  <div class="layout-box header"></div>
                  <div class="layout-box image small"></div>
                  <div class="layout-box body large"></div>
                  <div class="layout-box footer"></div>
                </div>
                <span class="layout-name">Detailed</span>
                <span class="layout-desc">More text space</span>
              </button>
            </div>
          </div>

          <!-- Theme Selection -->
          <div class="theme-selector">
            <h4 class="subsection-title">Card Theme</h4>
            <div class="themes-grid">
              {#each themes as theme}
                <button 
                  class="theme-card"
                  class:active={cardTemplate.theme === theme.id}
                  style="--theme-primary: {theme.colors.primary}; --theme-secondary: {theme.colors.secondary}; --theme-bg: {theme.colors.bg};"
                  on:click={() => cardTemplate.theme = theme.id}
                >
                  <div class="theme-preview">
                    <div class="theme-color" style="background: {theme.colors.primary};"></div>
                    <div class="theme-color" style="background: {theme.colors.secondary};"></div>
                  </div>
                  <span class="theme-name">{theme.name}</span>
                </button>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Keyword Library Modal -->
  {#if showKeywordLibrary}
    <div class="modal-overlay" on:click={() => showKeywordLibrary = false}>
      <div class="modal-content" on:click={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2 class="modal-title">📖 Keyword Library</h2>
          <button class="modal-close" on:click={() => showKeywordLibrary = false}>×</button>
        </div>

        <div class="modal-body">
          <div class="keyword-help">
            <p>Create reusable keyword definitions. Use <code>[keywordname]</code> in your cards to show tooltips automatically!</p>
          </div>

          <!-- Add New Keyword Form -->
          <div class="keyword-form">
            <h3 class="form-section-title">
              {editingKeyword ? '✏️ Edit Keyword' : '➕ Add New Keyword'}
            </h3>
            <div class="keyword-form-fields">
              <div class="keyword-form-field">
                <label class="keyword-form-label">Keyword Name</label>
                <input
                  type="text"
                  bind:value={newKeywordName}
                  placeholder="e.g., disease, shield, poison"
                  class="field-input"
                />
              </div>
              <div class="keyword-form-field">
                <label class="keyword-form-label">Definition</label>
                <textarea
                  bind:value={newKeywordDefinition}
                  placeholder="Enter a clear description of what this keyword does..."
                  class="field-textarea"
                  rows="3"
                ></textarea>
              </div>
              <div class="keyword-form-actions">
                <button
                  class="btn-primary-small"
                  on:click={async () => {
                    if (newKeywordName && newKeywordDefinition) {
                      if (editingKeyword) {
                        await updateKeyword(editingKeyword.id, newKeywordName, newKeywordDefinition);
                        editingKeyword = null;
                      } else {
                        await saveKeyword(newKeywordName, newKeywordDefinition);
                      }
                      newKeywordName = '';
                      newKeywordDefinition = '';
                    }
                  }}
                >
                  {editingKeyword ? '✓ Update Keyword' : '+ Add Keyword'}
                </button>
                {#if editingKeyword}
                  <button
                    class="btn-secondary-small"
                    on:click={() => {
                      editingKeyword = null;
                      newKeywordName = '';
                      newKeywordDefinition = '';
                    }}
                  >
                    Cancel
                  </button>
                {/if}
              </div>
            </div>
          </div>

          <!-- Keyword List -->
          <div class="keyword-list">
            <h3 class="form-section-title">Your Keywords ({keywordLibrary.length})</h3>
            {#if keywordLibrary.length === 0}
              <p class="empty-state">No keywords yet. Add your first keyword above!</p>
            {:else}
              <div class="keyword-items">
                {#each keywordLibrary as keyword}
                  <div class="keyword-item">
                    <div class="keyword-item-content">
                      <div class="keyword-item-name">
                        <span class="keyword-badge">[{keyword.name}]</span>
                      </div>
                      <div class="keyword-item-definition">{keyword.definition}</div>
                    </div>
                    <div class="keyword-item-actions">
                      <button
                        class="btn-icon-small"
                        on:click={() => {
                          editingKeyword = keyword;
                          newKeywordName = keyword.name;
                          newKeywordDefinition = keyword.definition;
                        }}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        class="btn-icon-small btn-delete"
                        on:click={() => {
                          if (confirm(`Delete keyword "${keyword.name}"?`)) {
                            deleteKeyword(keyword.id);
                          }
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Container */
  .card-database {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--warm-gray-700);
  }

  /* Header */
  .database-header {
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
    gap: 2rem;
    flex: 1;
  }

  .header-title {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .view-tabs {
    display: flex;
    gap: 0.5rem;
    background: var(--warm-gray-700);
    padding: 0.25rem;
    border-radius: var(--radius-md);
  }

  .tab {
    background: transparent;
    color: var(--color-text-secondary);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .tab:hover {
    color: var(--color-text-primary);
    background: rgba(227, 223, 215, 0.05);
  }

  .tab.active {
    background: var(--color-primary);
    color: white;
  }

  .header-stats {
    display: flex;
    gap: 1.5rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
    line-height: 1;
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    margin-top: 0.25rem;
  }

  /* Gallery View */
  .gallery-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .gallery-controls {
    display: flex;
    gap: 1rem;
    padding: 1.5rem 2rem;
    background: var(--warm-gray-600);
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
    align-items: center;
  }

  .search-bar {
    flex: 1;
    min-width: 250px;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-tertiary);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.625rem 1rem 0.625rem 2.75rem;
    background: var(--warm-gray-700);
    border: 1px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(159, 179, 150, 0.1);
  }

  .filters {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .filter-select {
    padding: 0.625rem 1rem;
    background: var(--warm-gray-700);
    border: 1px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .filter-select:hover {
    border-color: rgba(227, 223, 215, 0.3);
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .scale-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--warm-gray-700);
    border: 1px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-md);
    color: var(--color-text-tertiary);
  }

  .scale-slider {
    width: 80px;
  }

  /* Cards Grid */
  .cards-grid {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    align-content: start;
  }

  .card-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  /* Game Card Design */
  .game-card {
    width: 280px;
    background: linear-gradient(135deg, var(--warm-gray-500) 0%, var(--warm-gray-600) 100%);
    border: 2px solid rgba(212, 165, 116, 0.3);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 
                inset 0 1px 0 rgba(227, 223, 215, 0.1);
    transition: all 0.3s ease;
    position: relative;
  }

  .game-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
    opacity: 0.6;
  }

  .card-wrapper:hover .game-card {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(227, 223, 215, 0.15);
    border-color: var(--color-accent);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1rem;
    background: rgba(36, 33, 28, 0.5);
    border-bottom: 1px solid rgba(212, 165, 116, 0.2);
  }

  .card-name {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    font-family: 'Cinzel', serif;
    letter-spacing: 0.025em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .card-cost {
    min-width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--color-accent) 0%, #C49565 100%);
    color: white;
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(212, 165, 116, 0.4),
                inset 0 -1px 2px rgba(0, 0, 0, 0.2);
  }

  .card-image {
    width: 100%;
    aspect-ratio: 16/9;
    overflow: hidden;
    background: var(--warm-gray-800);
    position: relative;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-image-placeholder {
    width: 100%;
    aspect-ratio: 16/9;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--warm-gray-700) 0%, var(--warm-gray-800) 100%);
    font-size: 3rem;
    opacity: 0.3;
  }

  .card-body {
    padding: 1rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .card-class {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .keyword-tag {
    padding: 0.25rem 0.625rem;
    background: rgba(159, 179, 150, 0.2);
    color: var(--color-primary);
    border: 1px solid rgba(159, 179, 150, 0.3);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    text-transform: capitalize;
    position: relative;
    transition: all 0.2s ease;
  }

  .keyword-tag.has-tooltip {
    cursor: help;
    border-bottom: 2px dotted var(--color-primary);
  }

  .keyword-tag.has-tooltip:hover {
    background: rgba(159, 179, 150, 0.3);
    border-color: var(--color-primary);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(159, 179, 150, 0.3);
  }

  /* Custom tooltip styling */
  .keyword-tag[title] {
    position: relative;
  }

  .keyword-tag[title]:hover::after {
    content: attr(title);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    padding: 0.75rem 1rem;
    background: var(--warm-gray-800);
    color: var(--color-text-primary);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-normal);
    text-transform: none;
    white-space: normal;
    max-width: 200px;
    width: max-content;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    animation: tooltipFadeIn 0.2s ease;
  }

  .keyword-tag[title]:hover::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: var(--color-primary);
    z-index: 1001;
    pointer-events: none;
    animation: tooltipFadeIn 0.2s ease;
  }

  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  /* Inline Keywords in Description */
  .inline-keyword {
    display: inline;
    padding: 0.125rem 0.375rem;
    background: rgba(159, 179, 150, 0.25);
    color: var(--color-primary);
    border-radius: var(--radius-sm);
    font-weight: var(--font-weight-semibold);
    text-transform: capitalize;
    position: relative;
    transition: all 0.2s ease;
  }

  .inline-keyword.has-tooltip {
    cursor: help;
    border-bottom: 2px dotted var(--color-primary);
  }

  .inline-keyword.has-tooltip:hover {
    background: rgba(159, 179, 150, 0.4);
    transform: translateY(-1px);
  }

  /* Tooltip for inline keywords */
  .inline-keyword[title]:hover::after {
    content: attr(title);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    padding: 0.75rem 1rem;
    background: var(--warm-gray-800);
    color: var(--color-text-primary);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-normal);
    text-transform: none;
    white-space: normal;
    max-width: 220px;
    width: max-content;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    animation: tooltipFadeIn 0.2s ease;
  }

  .inline-keyword[title]:hover::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: var(--color-primary);
    z-index: 1001;
    pointer-events: none;
    animation: tooltipFadeIn 0.2s ease;
  }

  .card-description {
    margin: 0;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-relaxed);
    color: var(--color-text-secondary);
  }

  .card-description.placeholder {
    opacity: 0.5;
    font-style: italic;
  }

  .card-footer {
    display: flex;
    justify-content: space-around;
    padding: 0.75rem 1rem;
    background: rgba(36, 33, 28, 0.5);
    border-top: 1px solid rgba(212, 165, 116, 0.2);
  }

  .card-stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .stat-icon {
    font-size: 1.125rem;
  }

  .stat-value {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  /* Card Actions */
  .card-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    background: var(--warm-gray-600);
    border: 1px solid rgba(227, 223, 215, 0.2);
    color: var(--color-text-secondary);
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
  }

  .action-btn:hover {
    background: var(--warm-gray-500);
    color: var(--color-text-primary);
    border-color: rgba(227, 223, 215, 0.3);
    transform: translateY(-1px);
  }

  .action-btn.delete:hover {
    background: var(--color-error);
    color: white;
    border-color: var(--color-error);
  }

  /* Create View */
  .create-view {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: 2.5rem;
    padding: 2.5rem;
    overflow-y: auto;
    background: var(--warm-gray-700);
  }

  /* Form Section */
  .form-section {
    background: var(--warm-gray-600);
    border: 1px solid rgba(227, 223, 215, 0.12);
    border-radius: var(--radius-lg);
    padding: 0;
    overflow: hidden;
  }

  .section-header-with-icon {
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 2rem 2rem 1.5rem;
    background: linear-gradient(135deg, rgba(159, 179, 150, 0.08) 0%, rgba(212, 165, 116, 0.05) 100%);
    border-bottom: 1px solid rgba(227, 223, 215, 0.1);
  }

  .section-icon {
    font-size: 2rem;
    filter: drop-shadow(0 2px 8px rgba(212, 165, 116, 0.3));
  }

  .section-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    letter-spacing: -0.015em;
  }

  .section-subtitle {
    margin: 0.375rem 0 0 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-tertiary);
    line-height: var(--line-height-relaxed);
  }

  /* Form Container */
  .form-container {
    padding: 2rem;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .form-field-small {
    grid-column: span 1;
  }

  .form-field-full {
    grid-column: 1 / -1;
  }

  .form-field-checkbox {
    grid-column: 1 / -1;
    padding: 1rem;
    background: rgba(159, 179, 150, 0.05);
    border-radius: var(--radius-md);
  }

  .field-label {
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
  }

  .label-text {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .label-required {
    color: var(--color-accent);
    font-weight: var(--font-weight-bold);
  }

  .field-input,
  .field-textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    background: var(--warm-gray-700);
    border: 2px solid rgba(227, 223, 215, 0.15);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    font-family: inherit;
    transition: all 0.2s ease;
  }

  .field-input:focus,
  .field-textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    background: var(--warm-gray-800);
    box-shadow: 0 0 0 3px rgba(159, 179, 150, 0.1);
  }

  .field-input::placeholder,
  .field-textarea::placeholder {
    color: var(--color-text-tertiary);
  }

  .field-textarea {
    resize: vertical;
    min-height: 100px;
    line-height: var(--line-height-relaxed);
  }

  .field-hint {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    font-style: italic;
  }

  .field-hint code {
    background: rgba(159, 179, 150, 0.15);
    color: var(--color-primary);
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm);
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    font-style: normal;
  }

  /* Tags/Keywords */
  .tags-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--warm-gray-700);
    border: 2px solid rgba(227, 223, 215, 0.15);
    border-radius: var(--radius-md);
    min-height: 48px;
    transition: border-color 0.2s ease;
  }

  .tags-container:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(159, 179, 150, 0.1);
  }

  .tag-pill {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--earth-moss) 100%);
    color: white;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .tag-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: rgba(255, 255, 255, 0.25);
    border: none;
    color: white;
    border-radius: 50%;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.15s ease;
  }

  .tag-remove:hover {
    background: rgba(255, 255, 255, 0.4);
    transform: scale(1.1);
  }

  .tag-field-input {
    flex: 1;
    min-width: 120px;
    background: transparent;
    border: none;
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    outline: none;
  }

  .tag-field-input::placeholder {
    color: var(--color-text-tertiary);
  }

  .btn-add-tag {
    margin-top: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(159, 179, 150, 0.1);
    border: 1px solid rgba(159, 179, 150, 0.25);
    color: var(--color-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .btn-add-tag:hover {
    background: rgba(159, 179, 150, 0.15);
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }

  /* Color Picker */
  .color-picker-group {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .color-picker {
    width: 60px;
    height: 48px;
    border: 2px solid rgba(227, 223, 215, 0.15);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .color-picker:hover {
    border-color: var(--color-primary);
    transform: scale(1.05);
  }

  .color-picker-group .field-input {
    flex: 1;
  }

  /* Checkbox */
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    cursor: pointer;
  }

  .checkbox-input {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: var(--color-primary);
  }

  .checkbox-text {
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
  }

  /* Save Status */
  .save-status {
    margin: 0 2rem 1.5rem;
    padding: 1rem 1.25rem;
    background: rgba(159, 179, 150, 0.15);
    color: var(--color-success);
    border: 1px solid rgba(159, 179, 150, 0.3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .save-status.error {
    background: rgba(224, 139, 104, 0.15);
    color: var(--color-error);
    border-color: rgba(224, 139, 104, 0.3);
  }

  .status-icon {
    font-size: 1.125rem;
  }

  /* Form Actions */
  .form-actions {
    display: flex;
    gap: 1rem;
    padding: 1.5rem 2rem 2rem;
    border-top: 1px solid rgba(227, 223, 215, 0.1);
  }

  .btn-primary-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--earth-moss) 100%);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(159, 179, 150, 0.25);
  }

  .btn-primary-action:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(159, 179, 150, 0.35);
  }

  .btn-primary-action:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 1.25rem;
  }

  .btn-secondary-action {
    padding: 1rem 1.5rem;
    background: transparent;
    color: var(--color-text-secondary);
    border: 2px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary-action:hover {
    background: var(--warm-gray-700);
    border-color: rgba(227, 223, 215, 0.3);
    color: var(--color-text-primary);
  }

  /* Preview Section */
  .preview-section {
    background: var(--warm-gray-600);
    border: 1px solid rgba(227, 223, 215, 0.12);
    border-radius: var(--radius-lg);
    padding: 0;
    overflow: hidden;
    position: sticky;
    top: 2.5rem;
    height: fit-content;
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(212, 165, 116, 0.08) 0%, rgba(159, 179, 150, 0.05) 100%);
    border-bottom: 1px solid rgba(227, 223, 215, 0.1);
  }

  .preview-icon {
    font-size: 1.75rem;
    filter: drop-shadow(0 2px 8px rgba(159, 179, 150, 0.3));
  }

  .preview-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .preview-subtitle {
    margin: 0.25rem 0 0 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  .preview-card-container {
    display: flex;
    justify-content: center;
    padding: 2rem 1.5rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  .form-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .required {
    color: var(--color-error);
    margin-left: 0.25rem;
  }

  .form-hint {
    margin: 0.25rem 0 0 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  /* Tags Input */
  .tags-input {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--warm-gray-700);
    border: 1px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-md);
    min-height: 42px;
  }

  .tag {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: var(--color-primary);
    color: white;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .tag-remove {
    background: rgba(255, 255, 255, 0.3);
    border: none;
    color: white;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    transition: all var(--transition-fast);
  }

  .tag-remove:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  .tag-input {
    flex: 1;
    min-width: 120px;
    background: transparent;
    border: none;
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    outline: none;
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

  .form-actions {
    display: flex;
    gap: 0.75rem;
  }

  /* Preview Section */
  .preview-section {
    position: sticky;
    top: 2rem;
    height: fit-content;
  }

  .preview-card-wrapper {
    display: flex;
    justify-content: center;
    padding: 1rem 0;
  }

  .preview-card {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5) !important;
  }

  /* Layout Variations */
  .game-card.layout-minimal .card-image-placeholder,
  .game-card.layout-minimal .card-image {
    aspect-ratio: 1/1;
  }

  .game-card.layout-minimal .card-body {
    padding: 0.75rem;
  }

  .game-card.layout-minimal .card-description {
    font-size: var(--font-size-xs);
    line-height: 1.3;
  }

  .game-card.layout-detailed .card-image-placeholder,
  .game-card.layout-detailed .card-image {
    aspect-ratio: 16/6;
  }

  .game-card.layout-detailed .card-body {
    padding: 1.25rem;
    min-height: 200px;
  }

  .game-card.layout-detailed .card-description {
    font-size: var(--font-size-sm);
    line-height: var(--line-height-relaxed);
  }

  /* Theme Variations */
  .game-card.theme-scifi {
    background: linear-gradient(135deg, #1A1A2E 0%, #2D3561 100%);
    border-color: rgba(100, 181, 246, 0.4);
  }

  .game-card.theme-scifi::before {
    background: linear-gradient(90deg, #64B5F6, #BA68C8);
  }

  .game-card.theme-scifi .card-cost {
    background: linear-gradient(135deg, #64B5F6 0%, #5A9FE0 100%);
  }

  .game-card.theme-scifi .keyword-tag {
    background: rgba(100, 181, 246, 0.2);
    color: #64B5F6;
    border-color: rgba(100, 181, 246, 0.3);
  }

  .game-card.theme-modern {
    background: linear-gradient(135deg, #F7FAFC 0%, #E2E8F0 100%);
    border-color: rgba(74, 85, 104, 0.3);
    color: #2D3748;
  }

  .game-card.theme-modern::before {
    background: linear-gradient(90deg, #4A5568, #ECC94B);
  }

  .game-card.theme-modern .card-name,
  .game-card.theme-modern .card-description,
  .game-card.theme-modern .custom-label {
    color: #2D3748;
  }

  .game-card.theme-modern .card-cost {
    background: linear-gradient(135deg, #ECC94B 0%, #D69E2E 100%);
    color: #2D3748;
  }

  .game-card.theme-modern .keyword-tag {
    background: rgba(74, 85, 104, 0.1);
    color: #4A5568;
    border-color: rgba(74, 85, 104, 0.2);
  }

  .game-card.theme-modern .card-class {
    color: #4A5568;
  }

  .game-card.theme-horror {
    background: linear-gradient(135deg, #1A1A1A 0%, #2D0F0F 100%);
    border-color: rgba(116, 42, 42, 0.5);
  }

  .game-card.theme-horror::before {
    background: linear-gradient(90deg, #742A2A, #2D3748);
  }

  .game-card.theme-horror .card-cost {
    background: linear-gradient(135deg, #742A2A 0%, #5A1F1F 100%);
  }

  .game-card.theme-horror .keyword-tag {
    background: rgba(116, 42, 42, 0.2);
    color: #C53030;
    border-color: rgba(116, 42, 42, 0.3);
  }

  /* Template View */
  .template-view {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    background: var(--warm-gray-700);
  }

  .template-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 2rem;
  }

  .template-header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .template-message {
    font-size: var(--font-size-sm);
    color: var(--color-success);
    font-weight: var(--font-weight-medium);
  }

  .template-grid {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 2rem;
  }

  .template-section {
    background: var(--warm-gray-600);
    border: 1px solid rgba(227, 223, 215, 0.15);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    height: fit-content;
  }

  .section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  /* Fields List */
  .fields-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field-item {
    background: var(--warm-gray-700);
    border: 1px solid rgba(227, 223, 215, 0.15);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: all var(--transition-fast);
  }

  .field-item.editing {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(159, 179, 150, 0.1);
  }

  .field-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
  }

  .field-drag-handle {
    color: var(--color-text-tertiary);
    cursor: grab;
    display: flex;
    align-items: center;
  }

  .field-drag-handle:active {
    cursor: grabbing;
  }

  .field-info {
    flex: 1;
    min-width: 0;
  }

  .field-name-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.375rem;
  }

  .field-label {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
  }

  .field-type-badge {
    padding: 0.125rem 0.5rem;
    background: var(--warm-gray-800);
    color: var(--color-text-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    text-transform: capitalize;
  }

  .field-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .field-tag {
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
  }

  .field-tag.required {
    background: rgba(224, 139, 104, 0.2);
    color: var(--color-error);
  }

  .field-tag.visible {
    background: rgba(159, 179, 150, 0.2);
    color: var(--color-primary);
  }

  .field-tag.position {
    background: rgba(212, 165, 116, 0.2);
    color: var(--color-accent);
  }

  .field-actions {
    display: flex;
    gap: 0.5rem;
  }

  .icon-btn {
    background: transparent;
    border: 1px solid rgba(227, 223, 215, 0.2);
    color: var(--color-text-secondary);
    padding: 0.375rem 0.625rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
  }

  .icon-btn:hover {
    background: var(--warm-gray-600);
    color: var(--color-text-primary);
    border-color: rgba(227, 223, 215, 0.3);
  }

  .icon-btn.delete:hover {
    background: var(--color-error);
    color: white;
    border-color: var(--color-error);
  }

  /* Field Editor */
  .field-editor {
    padding: 1rem;
    border-top: 1px solid rgba(227, 223, 215, 0.15);
    background: var(--warm-gray-800);
  }

  .editor-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .editor-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .editor-group.full-width {
    grid-column: 1 / -1;
  }

  .editor-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .input-sm {
    padding: 0.5rem 0.75rem;
    font-size: var(--font-size-sm);
  }

  .editor-toggles {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--warm-gray-700);
    border-radius: var(--radius-md);
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  .toggle-label input[type="checkbox"] {
    cursor: pointer;
  }

  .editor-actions {
    display: flex;
    justify-content: flex-end;
  }

  /* Preview Section */
  .preview-explanation {
    margin-bottom: 1.5rem;
  }

  .preview-explanation p {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-tertiary);
    line-height: var(--line-height-relaxed);
  }

  .template-preview-wrapper {
    display: flex;
    justify-content: center;
    padding: 1.5rem 0;
    margin-bottom: 2rem;
  }

  .custom-field-preview {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-top: 1px solid rgba(227, 223, 215, 0.1);
    font-size: var(--font-size-xs);
  }

  .custom-label {
    color: var(--color-text-tertiary);
    font-weight: var(--font-weight-medium);
  }

  .custom-value {
    color: var(--color-text-secondary);
  }

  .color-preview-dot {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid rgba(227, 223, 215, 0.3);
    vertical-align: middle;
  }

  /* Layout Selection */
  .layout-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(227, 223, 215, 0.15);
  }

  .layout-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .layout-card {
    background: var(--warm-gray-700);
    border: 2px solid rgba(227, 223, 215, 0.15);
    border-radius: var(--radius-md);
    padding: 1rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
  }

  .layout-card:hover {
    border-color: rgba(227, 223, 215, 0.3);
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }

  .layout-card.active {
    border-color: var(--color-primary);
    background: rgba(159, 179, 150, 0.1);
  }

  .layout-preview {
    width: 100%;
    aspect-ratio: 3/4;
    background: var(--warm-gray-800);
    border: 1px solid rgba(227, 223, 215, 0.1);
    border-radius: var(--radius-sm);
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .layout-box {
    background: rgba(159, 179, 150, 0.3);
    border-radius: 2px;
  }

  .layout-box.header {
    height: 20%;
  }

  .layout-box.image {
    height: 35%;
  }

  .layout-box.image.large {
    height: 50%;
  }

  .layout-box.image.small {
    height: 25%;
  }

  .layout-box.body {
    flex: 1;
  }

  .layout-box.body.small {
    flex: 0.5;
  }

  .layout-box.body.large {
    flex: 1.5;
  }

  .layout-box.footer {
    height: 15%;
  }

  .layout-box.small {
    opacity: 0.5;
  }

  .layout-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .layout-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  .template-info {
    margin-bottom: 2rem;
  }

  .section-description {
    margin: 0.5rem 0 0 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
  }

  .coming-soon-message {
    background: linear-gradient(135deg, rgba(159, 179, 150, 0.1) 0%, rgba(212, 165, 116, 0.1) 100%);
    border: 2px dashed rgba(227, 223, 215, 0.3);
    border-radius: var(--radius-lg);
    padding: 3rem 2rem;
    text-align: center;
    margin-bottom: 2rem;
  }

  .coming-soon-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .coming-soon-title {
    margin: 0 0 1rem 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .coming-soon-text {
    margin: 0.5rem 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .theme-selector {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(227, 223, 215, 0.15);
  }

  .subsection-title {
    margin: 0 0 1rem 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .themes-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .theme-card {
    background: var(--warm-gray-700);
    border: 2px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-md);
    padding: 1rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .theme-card:hover {
    border-color: rgba(227, 223, 215, 0.3);
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }

  .theme-card.active {
    border-color: var(--color-primary);
    background: rgba(159, 179, 150, 0.1);
  }

  .theme-preview {
    display: flex;
    gap: 0.5rem;
  }

  .theme-color {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(227, 223, 215, 0.2);
  }

  .theme-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .color-input-group {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .color-input-group .input {
    flex: 1;
  }

  /* Empty State */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .empty-icon {
    font-size: 5rem;
    margin-bottom: 1.5rem;
    opacity: 0.4;
  }

  .empty-title {
    margin: 0 0 0.75rem 0;
    font-size: 1.5rem;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .empty-description {
    margin: 0 0 2rem 0;
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    max-width: 400px;
  }

  /* Scrollbar */
  .cards-grid::-webkit-scrollbar,
  .create-view::-webkit-scrollbar,
  .template-view::-webkit-scrollbar {
    width: 8px;
  }

  .cards-grid::-webkit-scrollbar-track,
  .create-view::-webkit-scrollbar-track,
  .template-view::-webkit-scrollbar-track {
    background: transparent;
  }

  .cards-grid::-webkit-scrollbar-thumb,
  .create-view::-webkit-scrollbar-thumb,
  .template-view::-webkit-scrollbar-thumb {
    background: rgba(159, 179, 150, 0.25);
    border-radius: var(--radius-sm);
  }

  .cards-grid::-webkit-scrollbar-thumb:hover,
  .create-view::-webkit-scrollbar-thumb:hover,
  .template-view::-webkit-scrollbar-thumb:hover {
    background: rgba(159, 179, 150, 0.35);
  }

  /* Import Cinzel font for card names */
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
  /* Keyword Library Button */
  .btn-keyword-library {
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, var(--color-accent) 0%, #C8956D 100%);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
  }

  .btn-keyword-library:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(212, 165, 116, 0.4);
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background: var(--warm-gray-600);
    border: 1px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 800px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid rgba(227, 223, 215, 0.15);
  }

  .modal-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .modal-close {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 2rem;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    transition: all 0.15s ease;
  }

  .modal-close:hover {
    background: rgba(227, 223, 215, 0.1);
    color: var(--color-text-primary);
  }

  .modal-body {
    padding: 2rem;
    overflow-y: auto;
    flex: 1;
  }

  .keyword-help {
    padding: 1rem 1.25rem;
    background: rgba(212, 165, 116, 0.1);
    border: 1px solid rgba(212, 165, 116, 0.3);
    border-radius: var(--radius-md);
    margin-bottom: 2rem;
  }

  .keyword-help p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .keyword-help code {
    background: rgba(212, 165, 116, 0.2);
    color: var(--color-accent);
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm);
    font-family: 'Courier New', monospace;
  }

  .keyword-form {
    padding: 1.5rem;
    background: var(--warm-gray-700);
    border: 1px solid rgba(227, 223, 215, 0.15);
    border-radius: var(--radius-md);
    margin-bottom: 2rem;
  }

  .form-section-title {
    margin: 0 0 1.25rem 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .keyword-form-fields {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .keyword-form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .keyword-form-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .keyword-form-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding-top: 0.5rem;
  }

  .form-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .btn-primary-small {
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--earth-moss) 100%);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .btn-primary-small:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(159, 179, 150, 0.3);
  }

  .btn-secondary-small {
    padding: 0.75rem 1.25rem;
    background: transparent;
    color: var(--color-text-secondary);
    border: 2px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .btn-secondary-small:hover {
    background: var(--warm-gray-600);
    border-color: rgba(227, 223, 215, 0.3);
  }

  .keyword-list {
    padding: 1.5rem;
    background: var(--warm-gray-700);
    border: 1px solid rgba(227, 223, 215, 0.15);
    border-radius: var(--radius-md);
  }

  .empty-state {
    margin: 2rem 0;
    text-align: center;
    color: var(--color-text-tertiary);
    font-style: italic;
  }

  .keyword-items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .keyword-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    background: var(--warm-gray-600);
    border: 1px solid rgba(227, 223, 215, 0.1);
    border-radius: var(--radius-md);
    transition: all 0.15s ease;
  }

  .keyword-item:hover {
    background: var(--warm-gray-800);
    border-color: rgba(227, 223, 215, 0.2);
  }

  .keyword-item-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .keyword-item-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .keyword-badge {
    padding: 0.25rem 0.75rem;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--earth-moss) 100%);
    color: white;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    font-family: 'Courier New', monospace;
  }

  .keyword-item-definition {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-relaxed);
  }

  .keyword-item-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-icon-small {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(227, 223, 215, 0.2);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 1rem;
  }

  .btn-icon-small:hover {
    background: rgba(159, 179, 150, 0.1);
    border-color: var(--color-primary);
  }

  .btn-icon-small.btn-delete:hover {
    background: rgba(224, 139, 104, 0.1);
    border-color: var(--color-error);
  }
</style>
<!-- components/nodes/PropertyEditor.svelte -->
<script lang="ts">
  interface Property {
    id: string;
    key: string;
    value: any;
    type: 'text' | 'number' | 'checkbox' | 'select';
    options?: string[]; // For select type
  }

  interface Props {
    properties: Property[];
    onUpdate: (properties: Property[]) => void;
  }

  let { properties = $bindable([]), onUpdate }: Props = $props();

  const propertyTypes = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'select', label: 'Dropdown' }
  ];

  function addProperty() {
    const newProperty: Property = {
      id: crypto.randomUUID(),
      key: 'New Property',
      value: '',
      type: 'text'
    };
    properties = [...properties, newProperty];
    onUpdate(properties);
  }

  function updateProperty(propId: string, updates: Partial<Property>) {
    properties = properties.map(p => {
      if (p.id === propId) {
        const updated = { ...p, ...updates };
        // If type changes, reset value appropriately
        if (updates.type && updates.type !== p.type) {
          if (updates.type === 'checkbox') updated.value = false;
          else if (updates.type === 'number') updated.value = 0;
          else if (updates.type === 'select') {
            updated.options = ['Option 1', 'Option 2'];
            updated.value = 'Option 1';
          }
          else updated.value = '';
        }
        return updated;
      }
      return p;
    });
    onUpdate(properties);
  }

  function deleteProperty(propId: string) {
    properties = properties.filter(p => p.id !== propId);
    onUpdate(properties);
  }

  function addSelectOption(propId: string) {
    properties = properties.map(p => {
      if (p.id === propId) {
        const options = [...(p.options || []), `Option ${(p.options?.length || 0) + 1}`];
        return { ...p, options };
      }
      return p;
    });
    onUpdate(properties);
  }

  function updateSelectOption(propId: string, oldOption: string, newOption: string) {
    properties = properties.map(p => {
      if (p.id === propId) {
        const options = p.options?.map(opt => opt === oldOption ? newOption : opt) || [];
        return { ...p, options };
      }
      return p;
    });
    onUpdate(properties);
  }

  function deleteSelectOption(propId: string, option: string) {
    properties = properties.map(p => {
      if (p.id === propId) {
        const options = p.options?.filter(opt => opt !== option) || [];
        return { ...p, options };
      }
      return p;
    });
    onUpdate(properties);
  }
</script>

<div class="property-editor">
  <div class="properties-header">
    <span style="font-weight: 500; font-size: 0.9rem;">Properties</span>
    <button on:click={addProperty} class="add-property-btn">+ Add</button>
  </div>
  
  {#if properties.length === 0}
    <div style="padding: 1rem; text-align: center; color: #999; font-size: 0.85rem;">
      No properties yet
    </div>
  {:else}
    <div class="properties-list">
      {#each properties as prop (prop.id)}
        <div class="property-item">
          <div class="property-row">
            <input
              type="text"
              bind:value={prop.key}
              on:change={() => updateProperty(prop.id, { key: prop.key })}
              placeholder="Property name"
              class="property-key"
            />
            <select
              bind:value={prop.type}
              on:change={(e) => updateProperty(prop.id, { type: e.currentTarget.value as any })}
              class="property-type"
            >
              {#each propertyTypes as type}
                <option value={type.value}>{type.label}</option>
              {/each}
            </select>
            <button 
              on:click={() => deleteProperty(prop.id)}
              class="delete-property"
              title="Delete property"
            >
              ×
            </button>
          </div>

          <div class="property-value-row">
            {#if prop.type === 'text'}
              <input
                type="text"
                bind:value={prop.value}
                on:change={() => updateProperty(prop.id, { value: prop.value })}
                placeholder="Value"
                class="property-value"
              />
            {:else if prop.type === 'number'}
              <input
                type="number"
                bind:value={prop.value}
                on:change={() => updateProperty(prop.id, { value: prop.value })}
                placeholder="0"
                class="property-value"
              />
            {:else if prop.type === 'checkbox'}
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={prop.value}
                  on:change={() => updateProperty(prop.id, { value: prop.value })}
                />
                <span>{prop.value ? 'Enabled' : 'Disabled'}</span>
              </label>
            {:else if prop.type === 'select'}
              <div class="select-editor">
                <select
                  bind:value={prop.value}
                  on:change={() => updateProperty(prop.id, { value: prop.value })}
                  class="property-value"
                >
                  {#each prop.options || [] as option}
                    <option value={option}>{option}</option>
                  {/each}
                </select>
                <div class="select-options">
                  <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">Options:</div>
                  {#each prop.options || [] as option}
                    <div class="option-item">
                      <input
                        type="text"
                        value={option}
                        on:change={(e) => updateSelectOption(prop.id, option, e.currentTarget.value)}
                        class="option-input"
                      />
                      <button
                        on:click={() => deleteSelectOption(prop.id, option)}
                        class="delete-option"
                      >
                        ×
                      </button>
                    </div>
                  {/each}
                  <button on:click={() => addSelectOption(prop.id)} class="add-option-btn">
                    + Add Option
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .property-editor {
    width: 100%;
  }

  .properties-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .add-property-btn {
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-property-btn:hover {
    background: #1565c0;
  }

  .properties-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .property-item {
    background: #f8f9fa;
    padding: 0.75rem;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  }

  .property-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .property-value-row {
    width: 100%;
  }

  .property-key,
  .property-value,
  .property-type {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.4rem;
    font-size: 0.85rem;
    outline: none;
    transition: border-color 0.2s;
    background: white;
  }

  .property-type {
    width: 100px;
  }

  .property-value {
    width: 100%;
  }

  .property-key:focus,
  .property-value:focus,
  .property-type:focus {
    border-color: #1976d2;
  }

  .delete-property {
    background: #ffebee;
    color: #f44336;
    border: 1px solid #f44336;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
    line-height: 1;
  }

  .delete-property:hover {
    background: #f44336;
    color: white;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .select-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .select-options {
    background: white;
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  .option-item {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .option-input {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
  }

  .delete-option {
    background: #ffebee;
    color: #f44336;
    border: 1px solid #f44336;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .delete-option:hover {
    background: #f44336;
    color: white;
  }

  .add-option-btn {
    background: #e3f2fd;
    color: #1976d2;
    border: 1px solid #1976d2;
    border-radius: 4px;
    padding: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
    width: 100%;
    margin-top: 0.25rem;
  }

  .add-option-btn:hover {
    background: #bbdefb;
  }
</style>
<script>
  import { supabase } from '$lib/supabase';
  
  let { project, currentUserId, onClose } = $props();
  
  let shares = $state([]);
  let loading = $state(false);
  let error = $state('');
  let success = $state('');
  
  let inviteEmail = $state('');
  let inviteRole = $state('editor');
  
  const roles = [
    { value: 'viewer', label: 'Viewer', description: 'Can view project' },
    { value: 'editor', label: 'Editor', description: 'Can view and edit' },
    { value: 'admin', label: 'Admin', description: 'Can view, edit, and manage sharing' }
  ];
  
  $effect(() => {
    loadShares();
  });
  
  async function loadShares() {
    loading = true;
    error = '';
    
    const { data, error: err } = await supabase
      .from('project_shares')
      .select(`
        *,
        user:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });
    
    if (err) {
      error = 'Failed to load shares';
      console.error(err);
    } else {
      shares = data || [];
    }
    
    loading = false;
  }
  
  async function inviteUser() {
    if (!inviteEmail.trim()) {
      error = 'Please enter an email address';
      return;
    }
    
    error = '';
    success = '';
    loading = true;
    
    // Find user by email
    const { data: userData, error: userError } = await supabase.rpc('get_user_id_by_email', {
      user_email: inviteEmail.toLowerCase().trim()
    });
    
    if (userError || !userData) {
      error = 'User not found with that email address';
      loading = false;
      return;
    }
    
    // Check if already shared
    const existingShare = shares.find(s => s.user_id === userData);
    if (existingShare) {
      error = 'This user already has access to this project';
      loading = false;
      return;
    }
    
    // Create share
    const { error: shareError } = await supabase
      .from('project_shares')
      .insert({
        project_id: project.id,
        user_id: userData,
        role: inviteRole,
        invited_by: currentUserId
      });
    
    if (shareError) {
      error = 'Failed to share project';
      console.error(shareError);
    } else {
      success = `Project shared with ${inviteEmail}`;
      inviteEmail = '';
      inviteRole = 'editor';
      await loadShares();
    }
    
    loading = false;
  }
  
  async function updateRole(shareId, newRole) {
    const { error: err } = await supabase
      .from('project_shares')
      .update({ role: newRole })
      .eq('id', shareId);
    
    if (err) {
      error = 'Failed to update role';
    } else {
      await loadShares();
    }
  }
  
  async function removeShare(shareId) {
    if (!confirm('Remove this user from the project?')) return;
    
    const { error: err } = await supabase
      .from('project_shares')
      .delete()
      .eq('id', shareId);
    
    if (err) {
      error = 'Failed to remove share';
    } else {
      success = 'User removed from project';
      await loadShares();
    }
  }
  
  function getRoleBadgeColor(role) {
    switch (role) {
      case 'admin': return '#d66e6e';
      case 'editor': return '#6b8e6f';
      case 'viewer': return '#8a9b7a';
      default: return '#7d7669';
    }
  }
</script>

<div class="modal-overlay" on:click={onClose}></div>
<div class="modal-content" on:click|stopPropagation>
  <div class="modal-header">
    <h2 class="modal-title">Share "{project.name}"</h2>
    <button class="close-btn" on:click={onClose}>×</button>
  </div>
  
  <div class="modal-body">
    <!-- Invite Section -->
    <div class="invite-section">
      <h3 class="section-title">Invite People</h3>
      
      {#if error}
        <div class="message error">{error}</div>
      {/if}
      
      {#if success}
        <div class="message success">{success}</div>
      {/if}
      
      <div class="invite-form">
        <input
          type="email"
          bind:value={inviteEmail}
          placeholder="Enter email address"
          class="email-input"
          on:keydown={(e) => e.key === 'Enter' && inviteUser()}
        />
        
        <select bind:value={inviteRole} class="role-select">
          {#each roles as role}
            <option value={role.value}>{role.label}</option>
          {/each}
        </select>
        
        <button 
          class="invite-btn"
          on:click={inviteUser}
          disabled={loading}
        >
          Invite
        </button>
      </div>
      
      <div class="role-descriptions">
        {#each roles as role}
          <div class="role-desc">
            <span class="role-name">{role.label}:</span>
            <span class="role-text">{role.description}</span>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Current Shares -->
    <div class="shares-section">
      <h3 class="section-title">People with Access</h3>
      
      {#if loading}
        <div class="loading">Loading...</div>
      {:else if shares.length === 0}
        <div class="empty-state">
          <p>No one else has access to this project yet.</p>
          <p class="empty-hint">Invite collaborators using the form above.</p>
        </div>
      {:else}
        <div class="shares-list">
          {#each shares as share}
            <div class="share-item">
              <div class="share-info">
                <div class="user-email">
                  {share.user?.email || 'Unknown user'}
                </div>
                <div class="share-meta">
                  Invited {new Date(share.invited_at).toLocaleDateString()}
                </div>
              </div>
              
              <div class="share-actions">
                <select
                  value={share.role}
                  on:change={(e) => updateRole(share.id, e.target.value)}
                  class="role-select-small"
                  style="--badge-color: {getRoleBadgeColor(share.role)}"
                >
                  {#each roles as role}
                    <option value={role.value}>{role.label}</option>
                  {/each}
                </select>
                
                <button
                  class="remove-btn"
                  on:click={() => removeShare(share.id)}
                  title="Remove access"
                >
                  ×
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  
  <div class="modal-footer">
    <button class="close-footer-btn" on:click={onClose}>
      Done
    </button>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 1000;
    backdrop-filter: blur(2px);
  }
  
  .modal-content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #2a2a2a;
    border: 2px solid #6b8e6f;
    border-radius: 12px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    z-index: 1001;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .modal-title {
    color: #6b8e6f;
    font-size: 20px;
    font-weight: 700;
    margin: 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .close-btn {
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #e8dcc8;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background: rgba(214, 110, 110, 0.2);
    border-color: #d66e6e;
    color: #d66e6e;
  }
  
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }
  
  .section-title {
    color: #e8dcc8;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 16px 0;
  }
  
  .invite-section {
    margin-bottom: 32px;
  }
  
  .message {
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 14px;
  }
  
  .message.error {
    background: rgba(214, 110, 110, 0.2);
    border: 1px solid #d66e6e;
    color: #d66e6e;
  }
  
  .message.success {
    background: rgba(107, 142, 111, 0.2);
    border: 1px solid #6b8e6f;
    color: #6b8e6f;
  }
  
  .invite-form {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .email-input {
    flex: 1;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #e8dcc8;
    font-size: 14px;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .email-input:focus {
    outline: none;
    border-color: #6b8e6f;
    background: rgba(255, 255, 255, 0.08);
  }
  
  .role-select {
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #e8dcc8;
    font-size: 14px;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
  }
  
  .invite-btn {
    padding: 10px 20px;
    background: #6b8e6f;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .invite-btn:hover:not(:disabled) {
    background: #5a7a5e;
  }
  
  .invite-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .role-descriptions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .role-desc {
    font-size: 12px;
    color: #a0a0a0;
  }
  
  .role-name {
    font-weight: 600;
    color: #e8dcc8;
  }
  
  .shares-section {
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .loading {
    text-align: center;
    padding: 24px;
    color: #a0a0a0;
  }
  
  .empty-state {
    text-align: center;
    padding: 32px 16px;
    color: #a0a0a0;
  }
  
  .empty-state p {
    margin: 0 0 8px 0;
  }
  
  .empty-hint {
    font-size: 13px;
    color: #7d7669;
  }
  
  .shares-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .share-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: all 0.2s;
  }
  
  .share-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .share-info {
    flex: 1;
  }
  
  .user-email {
    color: #e8dcc8;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
  }
  
  .share-meta {
    color: #a0a0a0;
    font-size: 12px;
  }
  
  .share-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .role-select-small {
    padding: 6px 10px;
    background: var(--badge-color, rgba(107, 142, 111, 0.2));
    border: 1px solid var(--badge-color, #6b8e6f);
    border-radius: 6px;
    color: #e8dcc8;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .remove-btn {
    width: 28px;
    height: 28px;
    background: rgba(214, 110, 110, 0.2);
    border: 1px solid rgba(214, 110, 110, 0.3);
    border-radius: 6px;
    color: #d66e6e;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .remove-btn:hover {
    background: rgba(214, 110, 110, 0.3);
    border-color: #d66e6e;
  }
  
  .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: flex-end;
  }
  
  .close-footer-btn {
    padding: 10px 24px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #e8dcc8;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  .close-footer-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }
</style>
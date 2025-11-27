import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import type { Project, NewProject, GameMechanic, MechanicRelationship } from '../types'

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
})

// Project functions
export async function createProject(project: NewProject): Promise<Project> {
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    throw new Error('You must be logged in to create a project')
  }

  // Insert project with explicit user_id
  const { data, error } = await supabase
    .from('projects')
    .insert([{
      ...project,
      user_id: user.id  // Explicitly set the user_id
    }])
    .select()
    .single()
  
  if (error) {
    console.error('Database error:', error)
    throw error
  }
  
  return data
}

export async function getUserProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
  
  if (error) {
    console.error('Database error:', error)
    throw error
  }
  
  return data || []
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Database error:', error)
    throw error
  }
  
  return data
}

export async function updateProject(id: string, updates: Partial<NewProject>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Database error:', error)
    throw error
  }
  
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Database error:', error)
    throw error
  }
}

// Game Mechanics Functions
export async function createMechanic(projectId: string, mechanic: {
  name: string;
  description: string;
  type: 'general' | 'specific';
  position_x: number;
  position_y: number;
}): Promise<GameMechanic> {
  const { data, error } = await supabase
    .from('game_mechanics')
    .insert([{
      project_id: projectId,
      ...mechanic
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getProjectMechanics(projectId: string): Promise<GameMechanic[]> {
  const { data, error } = await supabase
    .from('game_mechanics')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at')
  
  if (error) throw error
  return data || []
}

export async function updateMechanic(mechanicId: string, updates: {
  name?: string;
  description?: string;
  type?: 'general' | 'specific';
  position_x?: number;
  position_y?: number;
}): Promise<GameMechanic> {
  const { data, error } = await supabase
    .from('game_mechanics')
    .update(updates)
    .eq('id', mechanicId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteMechanic(mechanicId: string): Promise<void> {
  const { error } = await supabase
    .from('game_mechanics')
    .delete()
    .eq('id', mechanicId)
  
  if (error) throw error
}

// Mechanic Relationships Functions
export async function createMechanicRelationship(
  projectId: string,
  sourceId: string,
  targetId: string,
  relationshipType: string = 'implements'
): Promise<MechanicRelationship> {
  const { data, error } = await supabase
    .from('mechanic_relationships')
    .insert([{
      project_id: projectId,
      source_mechanic_id: sourceId,
      target_mechanic_id: targetId,
      relationship_type: relationshipType
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getProjectMechanicRelationships(projectId: string): Promise<MechanicRelationship[]> {
  const { data, error } = await supabase
    .from('mechanic_relationships')
    .select('*')
    .eq('project_id', projectId)
  
  if (error) throw error
  return data || []
}

export async function deleteMechanicRelationship(relationshipId: string): Promise<void> {
  const { error } = await supabase
    .from('mechanic_relationships')
    .delete()
    .eq('id', relationshipId)
  
  if (error) throw error
}

// Bulk save positions (for when user drags nodes around)
export async function saveMechanicPositions(positions: { id: string, x: number, y: number }[]): Promise<void> {
  const updates = positions.map(pos => ({
    id: pos.id,
    position_x: pos.x,
    position_y: pos.y
  }))

  const { error } = await supabase
    .from('game_mechanics')
    .upsert(updates)
  
  if (error) throw error
}
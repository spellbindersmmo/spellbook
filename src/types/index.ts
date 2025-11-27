export interface Project {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface NewProject {
  name: string;
  description?: string;
  image_url?: string;
}

// Add these new types for game mechanics
// Add these to your existing types:
export interface GameMechanic {
  id: string;
  project_id: string;
  name: string;
  description: string;
  type: 'general' | 'specific';
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface MechanicRelationship {
  id: string;
  project_id: string;
  source_mechanic_id: string;
  target_mechanic_id: string;
  relationship_type: string;
  created_at: string;
}
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
export interface ChecklistItem {
  id: string;
  note_id: string;
  text: string;
  is_completed: boolean;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  type: 'note' | 'checklist' | 'idea';
  color: string | null;
  created_at: string;
  updated_at: string;
  items: ChecklistItem[] | null;
  tags: string[] | null;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

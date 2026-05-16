export interface Conversation {
  id: string;
  title: string;
  is_temporary: boolean;
  mode: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  mode?: string | null;
  created_at?: string;
}

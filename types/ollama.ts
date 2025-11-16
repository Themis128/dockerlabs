/**
 * Ollama API types and interfaces
 */

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaListResponse {
  models: OllamaModel[];
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: OllamaOptions;
}

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  repeat_penalty?: number;
  seed?: number;
  stop?: string[];
  num_ctx?: number;
  num_thread?: number;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  format?: 'json';
  options?: OllamaOptions;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaEmbedRequest {
  model: string;
  prompt: string;
  options?: OllamaOptions;
}

export interface OllamaEmbedResponse {
  embedding: number[];
}

export interface OllamaPullRequest {
  name: string;
  stream?: boolean;
}

export interface OllamaPullResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface OllamaState {
  models: OllamaModel[];
  loading: boolean;
  error: string | null;
  selectedModel: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'checking';
}

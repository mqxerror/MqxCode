/**
 * TypeScript types for the Autonomous Coding UI
 */

// Project types
export interface ProjectStats {
  passing: number
  in_progress: number
  total: number
  percentage: number
}

export interface ProjectSummary {
  name: string
  path: string
  has_spec: boolean
  stats: ProjectStats
}

export interface ProjectDetail extends ProjectSummary {
  prompts_dir: string
}

// Filesystem types
export interface DriveInfo {
  letter: string
  label: string
  available?: boolean
}

export interface DirectoryEntry {
  name: string
  path: string
  is_directory: boolean
  has_children: boolean
}

export interface DirectoryListResponse {
  current_path: string
  parent_path: string | null
  entries: DirectoryEntry[]
  drives: DriveInfo[] | null
}

export interface PathValidationResponse {
  valid: boolean
  exists: boolean
  is_directory: boolean
  can_write: boolean
  message: string
}

export interface ProjectPrompts {
  app_spec: string
  initializer_prompt: string
  coding_prompt: string
}

// Feature types
export interface Feature {
  id: number
  priority: number
  category: string
  name: string
  description: string
  steps: string[]
  passes: boolean
  in_progress: boolean
  // Multi-agent fields
  assigned_to_agent_id?: string | null
  attempt_count?: number
  blocked_reason?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface FeatureWithDependencies extends Feature {
  depends_on: number[]
  blocks: number[]
  dependencies_satisfied: boolean
}

export interface FeatureListResponse {
  pending: Feature[]
  in_progress: Feature[]
  done: Feature[]
}

export interface FeatureCreate {
  category: string
  name: string
  description: string
  steps: string[]
  priority?: number
}

export interface FeatureUpdate {
  category?: string
  name?: string
  description?: string
  steps?: string[]
  priority?: number
}

// Agent types
export type AgentStatus = 'stopped' | 'running' | 'paused' | 'crashed'
export type AgentInstanceStatus = 'idle' | 'working' | 'paused' | 'stopped' | 'crashed'

export interface AgentStatusResponse {
  status: AgentStatus
  pid: number | null
  started_at: string | null
  yolo_mode: boolean
  model: string | null  // Model being used by running agent
}

export interface AgentActionResponse {
  success: boolean
  status: AgentStatus
  message: string
}

// Multi-Agent Pool types
export interface AgentInfo {
  agent_id: string
  status: AgentInstanceStatus
  pid: number | null
  model: string
  yolo_mode: boolean
  current_feature_id: number | null
  started_at: string | null
}

export interface AgentPoolStatus {
  project_name: string
  agents: AgentInfo[]
  active_count: number
  idle_count: number
  working_count: number
  paused_count: number
  total_count: number
  max_agents: number
}

export interface SpawnAgentsRequest {
  count: number
  model: string
  yolo_mode: boolean
}

export interface SpawnAgentsResponse {
  spawned: number
  agents: AgentInfo[]
  errors: string[]
}

export interface AgentPoolActionResponse {
  success: boolean
  message: string
}

// Setup types
export interface SetupStatus {
  claude_cli: boolean
  credentials: boolean
  node: boolean
  npm: boolean
}

// Dev Server types
export type DevServerStatus = 'stopped' | 'running' | 'crashed'

export interface DevServerStatusResponse {
  status: DevServerStatus
  pid: number | null
  url: string | null
  command: string | null
  started_at: string | null
}

export interface DevServerConfig {
  detected_type: string | null
  detected_command: string | null
  custom_command: string | null
  effective_command: string | null
}

// Terminal types
export interface TerminalInfo {
  id: string
  name: string
  created_at: string
}

// ============================================================================
// Dependency Types
// ============================================================================

export interface FeatureDependency {
  id: number
  feature_id: number
  depends_on_id: number
  dependency_type: 'blocks' | 'requires' | 'related'
  notes?: string | null
  created_at?: string | null
}

export interface DependencyNode {
  id: number
  name: string
  category: string
  passes: boolean
  in_progress: boolean
  priority: number
}

export interface DependencyEdge {
  source: number  // depends_on_id
  target: number  // feature_id
  dependency_type: string
}

export interface DependencyGraph {
  features: DependencyNode[]
  edges: DependencyEdge[]
  blocked_features: number[]
  ready_features: number[]
}

export interface FeatureDependencyInfo {
  feature_id: number
  feature_name: string
  depends_on: Array<{
    id: number
    name: string
    passes: boolean
    in_progress: boolean
    dependency_type: string
    notes?: string | null
  }>
  blocks: Array<{
    id: number
    name: string
    passes: boolean
    in_progress: boolean
    dependency_type: string
  }>
  all_satisfied: boolean
  unsatisfied_ids: number[]
}

export interface BlockedFeature {
  id: number
  name: string
  priority: number
  unsatisfied_dependencies: Array<{
    id: number
    name: string
    in_progress: boolean
  }>
}

export interface BlockedFeaturesResponse {
  blocked_count: number
  blocked_features: BlockedFeature[]
}

export interface ReadyFeaturesResponse {
  ready_count: number
  ready_features: Array<{
    id: number
    name: string
    priority: number
    category: string
    attempt_count: number
  }>
}

// WebSocket message types
export type WSMessageType = 'progress' | 'feature_update' | 'log' | 'agent_status' | 'pong' | 'dev_log' | 'dev_server_status' | 'agent_pool' | 'agent_log' | 'agent_instance_status' | 'dependency_resolved'

export interface WSProgressMessage {
  type: 'progress'
  passing: number
  in_progress: number
  total: number
  percentage: number
}

export interface WSFeatureUpdateMessage {
  type: 'feature_update'
  feature_id: number
  passes: boolean
}

export interface WSLogMessage {
  type: 'log'
  line: string
  timestamp: string
}

export interface WSAgentStatusMessage {
  type: 'agent_status'
  status: AgentStatus
}

export interface WSPongMessage {
  type: 'pong'
}

export interface WSDevLogMessage {
  type: 'dev_log'
  line: string
  timestamp: string
}

export interface WSDevServerStatusMessage {
  type: 'dev_server_status'
  status: DevServerStatus
  url: string | null
}

// Multi-agent WebSocket messages
export interface WSAgentPoolMessage {
  type: 'agent_pool'
  agents: AgentInfo[]
  active_count: number
  idle_count: number
  working_count: number
}

export interface WSAgentLogMessage {
  type: 'agent_log'
  agent_id: string
  line: string
  timestamp: string
}

export interface WSAgentInstanceStatusMessage {
  type: 'agent_instance_status'
  agent_id: string
  status: AgentInstanceStatus
  feature_id: number | null
}

export interface WSDependencyResolvedMessage {
  type: 'dependency_resolved'
  feature_id: number
  unblocked_feature_ids: number[]
}

export type WSMessage =
  | WSProgressMessage
  | WSFeatureUpdateMessage
  | WSLogMessage
  | WSAgentStatusMessage
  | WSPongMessage
  | WSDevLogMessage
  | WSDevServerStatusMessage
  | WSAgentPoolMessage
  | WSAgentLogMessage
  | WSAgentInstanceStatusMessage
  | WSDependencyResolvedMessage

// ============================================================================
// Spec Chat Types
// ============================================================================

export interface SpecQuestionOption {
  label: string
  description: string
}

export interface SpecQuestion {
  question: string
  header: string
  options: SpecQuestionOption[]
  multiSelect: boolean
}

export interface SpecChatTextMessage {
  type: 'text'
  content: string
}

export interface SpecChatQuestionMessage {
  type: 'question'
  questions: SpecQuestion[]
  tool_id?: string
}

export interface SpecChatCompleteMessage {
  type: 'spec_complete'
  path: string
}

export interface SpecChatFileWrittenMessage {
  type: 'file_written'
  path: string
}

export interface SpecChatSessionCompleteMessage {
  type: 'complete'
}

export interface SpecChatErrorMessage {
  type: 'error'
  content: string
}

export interface SpecChatPongMessage {
  type: 'pong'
}

export interface SpecChatResponseDoneMessage {
  type: 'response_done'
}

export type SpecChatServerMessage =
  | SpecChatTextMessage
  | SpecChatQuestionMessage
  | SpecChatCompleteMessage
  | SpecChatFileWrittenMessage
  | SpecChatSessionCompleteMessage
  | SpecChatErrorMessage
  | SpecChatPongMessage
  | SpecChatResponseDoneMessage

// Image attachment for chat messages
export interface ImageAttachment {
  id: string
  filename: string
  mimeType: 'image/jpeg' | 'image/png'
  base64Data: string    // Raw base64 (without data: prefix)
  previewUrl: string    // data: URL for display
  size: number          // File size in bytes
}

// UI chat message for display
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: ImageAttachment[]
  timestamp: Date
  questions?: SpecQuestion[]
  isStreaming?: boolean
}

// ============================================================================
// Assistant Chat Types
// ============================================================================

export interface AssistantConversation {
  id: number
  project_name: string
  title: string | null
  created_at: string | null
  updated_at: string | null
  message_count: number
}

export interface AssistantMessage {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string | null
}

export interface AssistantConversationDetail {
  id: number
  project_name: string
  title: string | null
  created_at: string | null
  updated_at: string | null
  messages: AssistantMessage[]
}

export interface AssistantChatTextMessage {
  type: 'text'
  content: string
}

export interface AssistantChatToolCallMessage {
  type: 'tool_call'
  tool: string
  input: Record<string, unknown>
}

export interface AssistantChatResponseDoneMessage {
  type: 'response_done'
}

export interface AssistantChatErrorMessage {
  type: 'error'
  content: string
}

export interface AssistantChatConversationCreatedMessage {
  type: 'conversation_created'
  conversation_id: number
}

export interface AssistantChatPongMessage {
  type: 'pong'
}

export type AssistantChatServerMessage =
  | AssistantChatTextMessage
  | AssistantChatToolCallMessage
  | AssistantChatResponseDoneMessage
  | AssistantChatErrorMessage
  | AssistantChatConversationCreatedMessage
  | AssistantChatPongMessage

// ============================================================================
// Expand Chat Types
// ============================================================================

export interface ExpandChatFeaturesCreatedMessage {
  type: 'features_created'
  count: number
  features: { id: number; name: string; category: string }[]
}

export interface ExpandChatCompleteMessage {
  type: 'expansion_complete'
  total_added: number
}

export type ExpandChatServerMessage =
  | SpecChatTextMessage        // Reuse text message type
  | ExpandChatFeaturesCreatedMessage
  | ExpandChatCompleteMessage
  | SpecChatErrorMessage       // Reuse error message type
  | SpecChatPongMessage        // Reuse pong message type
  | SpecChatResponseDoneMessage // Reuse response_done type

// Bulk feature creation
export interface FeatureBulkCreate {
  features: FeatureCreate[]
  starting_priority?: number
}

export interface FeatureBulkCreateResponse {
  created: number
  features: Feature[]
}

// ============================================================================
// Settings Types
// ============================================================================

export interface ModelInfo {
  id: string
  name: string
}

export interface ModelsResponse {
  models: ModelInfo[]
  default: string
}

export interface Settings {
  yolo_mode: boolean
  model: string
  glm_mode: boolean
}

export interface SettingsUpdate {
  yolo_mode?: boolean
  model?: string
}

// ============================================================================
// Config/Command Center Types
// ============================================================================

export interface ConfigFile {
  name: string
  path: string
  description: string
  category: string
}

export interface ClaudeConfig {
  guidance: ConfigFile[]
  commands: ConfigFile[]
  skills: ConfigFile[]
  agents: ConfigFile[]
  templates: ConfigFile[]
}

export interface ConfigFileContent {
  name: string
  path: string
  content: string
  category: string
}

// ============================================================================
// Server Tasks Types
// ============================================================================

/**
 * Result of running a server task command.
 * Contains the command output, exit code, and the command that was executed.
 * Note: Backend uses snake_case (exit_code), frontend transforms to camelCase.
 */
export interface TaskResult {
  output: string
  exit_code: number
  command: string
  success: boolean
}

/**
 * Health status of server components.
 * Used to monitor the state of the agent, database, and UI build.
 * Backend returns strings that may include error details, so we use broader types.
 */
export interface HealthStatus {
  agent: string  // 'ok' | 'missing' | other status strings
  database: string  // 'ok' | 'error: <message>'
  ui: string  // 'ok' | 'not built'
}

/**
 * Database statistics for feature tracking.
 */
export interface DbStats {
  pending: number
  in_progress: number
  done: number
  total: number
  percentage: number
}

// ============================================================================
// Log Parser Types (re-exported from logParser.ts for convenience)
// ============================================================================

export type {
  LogEntryType,
  ParsedLogEntry,
  LogEntryMetadata,
  AgentContext,
} from './logParser'

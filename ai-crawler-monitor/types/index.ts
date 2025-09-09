// Database types (would be generated from Supabase)
export interface Website {
  id: string
  user_id: string
  domain: string
  created_at: string
  settings?: {
    hosting_provider?: string
    alert_threshold?: number
    blocked_bots?: string[]
  }
}

export interface TrafficLog {
  id: string
  website_id: string
  timestamp: string
  ip_address?: string
  user_agent?: string
  bot_name?: string
  is_bot: boolean
  bot_category?: string
  bytes_transferred: number
  response_time_ms?: number
  status_code?: number
  path?: string
  method?: string
}

export interface TrafficMetrics {
  totalRequests: number
  botRequests: number
  humanRequests: number
  aiPercentage: string
  humanPercentage: string
  botBandwidth: number
  humanBandwidth: number
  potentialSavings: {
    total: number
    monthly: number
    yearly: number
    byCategory: Record<string, number>
  }
  botBreakdown: Record<string, {
    requests: number
    bandwidth: number
    bots: string[]
  }>
  timeSeries?: Array<{
    time: string
    total_requests: number
    bot_requests: number
    human_requests: number
    total_bandwidth: number
  }>
}

export interface ProcessingResult {
  success: boolean
  stats: {
    totalEntries: number
    botRequests: number
    humanRequests: number
    totalBytes: number
    potentialSavings: number
  }
  errors?: string[]
  message: string
}
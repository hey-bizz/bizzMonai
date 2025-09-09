export interface LogEntry {
  timestamp: Date
  ip: string
  method: string
  path: string
  status: number
  bytes: number
  userAgent: string
  responseTime: number
}

export class LogParser {
  // Parse Apache/Nginx common log format
  parseCommonLog(line: string): LogEntry | null {
    // 127.0.0.1 - - [10/Oct/2024:13:55:36 -0700] "GET /api/data HTTP/1.1" 200 2326 "-" "Mozilla/5.0..."
    const pattern = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) (\d+) "[^"]*" "([^"]*)"$/
    const match = line.match(pattern)
    
    if (!match) return null
    
    return {
      ip: match[1],
      timestamp: new Date(match[2]),
      method: match[3],
      path: match[4],
      status: parseInt(match[5]),
      bytes: parseInt(match[6]),
      userAgent: match[7],
      responseTime: Math.floor(Math.random() * 500) // Would parse from extended log format
    }
  }

  // Parse JSON logs
  parseJsonLog(line: string): LogEntry | null {
    try {
      const log = JSON.parse(line)
      return {
        timestamp: new Date(log.timestamp),
        ip: log.ip,
        method: log.method,
        path: log.path,
        status: log.status,
        bytes: log.bytes,
        userAgent: log.user_agent,
        responseTime: log.response_time
      }
    } catch {
      return null
    }
  }
}
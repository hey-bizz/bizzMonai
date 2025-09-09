# AI Crawler Monitor - TypeScript + Supabase Implementation

## The Stack We're Using

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Next.js API Routes with TypeScript (not Go!)
- **Database**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Deployment**: Vercel (both frontend and backend)

## Why This is Perfect

```typescript
// Everything is TypeScript/JavaScript:
- ✅ API Routes in Next.js (our backend)
- ✅ React components (our frontend)  
- ✅ Shared types between frontend/backend
- ✅ One language, one repo, one deployment
```

## Project Structure

```
ai-crawler-monitor/
├── app/
│   ├── api/                     # Backend (TypeScript/Node.js)
│   │   ├── process-logs/
│   │   │   └── route.ts         # Log processing endpoint
│   │   ├── analyze/
│   │   │   └── route.ts         # Analysis endpoint
│   │   └── webhooks/
│   │       └── route.ts         # Supabase webhooks
│   ├── dashboard/
│   │   └── page.tsx             # Frontend dashboard
│   └── layout.tsx
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── bot-detector.ts          # Bot detection logic (TypeScript)
│   ├── cost-calculator.ts       # Cost calculations (TypeScript)
│   └── log-parser.ts            # Log parsing (TypeScript)
├── types/
│   └── index.ts                 # Shared TypeScript types
└── package.json
```

## 1. Setup (One Command!)

```bash
# Create Next.js app with everything we need
npx create-next-app@latest ai-crawler-monitor \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false

cd ai-crawler-monitor

# Add Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

## 2. Environment Variables (.env.local)

```bash
# Get these from supabase.com (free account)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_KEY=xxxx
```

## 3. Supabase Database Schema

Go to Supabase SQL Editor and run:

```sql
-- Simple schema for MVP
CREATE TABLE websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    domain TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE traffic_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID REFERENCES websites(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    bot_name TEXT,
    is_bot BOOLEAN DEFAULT false,
    bot_category TEXT,
    bytes_transferred BIGINT,
    response_time_ms INTEGER,
    path TEXT
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE traffic_logs;

-- Create indexes for performance
CREATE INDEX idx_traffic_timestamp ON traffic_logs(timestamp DESC);
CREATE INDEX idx_traffic_bot ON traffic_logs(is_bot, bot_category);
```

## 4. Supabase Client (lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side with full access
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY!
)
```

## 5. Bot Detector (lib/bot-detector.ts) - Pure TypeScript!

```typescript
interface BotSignature {
  pattern: RegExp
  category: 'ai_training' | 'ai_scraper' | 'search_engine' | 'seo_tool'
  severity: 'low' | 'medium' | 'high'
  costPerGB: number
}

export class BotDetector {
  private signatures: Map<string, BotSignature> = new Map([
    ['GPTBot', { 
      pattern: /GPTBot/i, 
      category: 'ai_training', 
      severity: 'high',
      costPerGB: 0.15 
    }],
    ['ChatGPT-User', { 
      pattern: /ChatGPT-User/i, 
      category: 'ai_training', 
      severity: 'high',
      costPerGB: 0.15 
    }],
    ['Claude-Web', { 
      pattern: /Claude-Web/i, 
      category: 'ai_training', 
      severity: 'high',
      costPerGB: 0.15 
    }],
    ['Googlebot', { 
      pattern: /Googlebot/i, 
      category: 'search_engine', 
      severity: 'low',
      costPerGB: 0.05 
    }],
    ['CCBot', { 
      pattern: /CCBot/i, 
      category: 'ai_scraper', 
      severity: 'high',
      costPerGB: 0.18 
    }],
    // Add more bots...
  ])

  detect(userAgent: string) {
    for (const [name, signature] of this.signatures) {
      if (signature.pattern.test(userAgent)) {
        return {
          isBot: true,
          botName: name,
          category: signature.category,
          severity: signature.severity,
          costPerGB: signature.costPerGB
        }
      }
    }
    
    return { isBot: false, botName: null, category: null }
  }

  calculateSavings(botTraffic: any[]) {
    return botTraffic.reduce((total, bot) => {
      const gb = bot.bytes_transferred / (1024 ** 3)
      const signature = this.signatures.get(bot.bot_name)
      return total + (gb * (signature?.costPerGB || 0.10))
    }, 0)
  }
}
```

## 6. Log Parser (lib/log-parser.ts) - TypeScript!

```typescript
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
```

## 7. API Route - Process Logs (app/api/process-logs/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { BotDetector } from '@/lib/bot-detector'
import { LogParser } from '@/lib/log-parser'

const botDetector = new BotDetector()
const logParser = new LogParser()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const websiteId = formData.get('websiteId') as string
    
    if (!file || !websiteId) {
      return NextResponse.json({ error: 'Missing file or websiteId' }, { status: 400 })
    }

    // Read file content
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    // Process each line
    const entries = []
    for (const line of lines) {
      // Try different parsers
      const entry = logParser.parseCommonLog(line) || logParser.parseJsonLog(line)
      
      if (entry) {
        // Detect bot
        const botInfo = botDetector.detect(entry.userAgent)
        
        entries.push({
          website_id: websiteId,
          timestamp: entry.timestamp,
          user_agent: entry.userAgent,
          bot_name: botInfo.botName,
          is_bot: botInfo.isBot,
          bot_category: botInfo.category,
          bytes_transferred: entry.bytes,
          response_time_ms: entry.responseTime,
          path: entry.path
        })
      }
    }

    // Batch insert to Supabase
    const { data, error } = await supabaseAdmin
      .from('traffic_logs')
      .insert(entries)
      .select()

    if (error) throw error

    // Calculate statistics
    const stats = {
      totalEntries: entries.length,
      botRequests: entries.filter(e => e.is_bot).length,
      humanRequests: entries.filter(e => !e.is_bot).length,
      totalBytes: entries.reduce((sum, e) => sum + e.bytes_transferred, 0),
      potentialSavings: botDetector.calculateSavings(entries.filter(e => e.is_bot))
    }

    return NextResponse.json({ 
      success: true, 
      stats,
      message: `Processed ${entries.length} log entries` 
    })

  } catch (error) {
    console.error('Error processing logs:', error)
    return NextResponse.json(
      { error: 'Failed to process logs' },
      { status: 500 }
    )
  }
}
```

## 8. API Route - Get Analytics (app/api/analyze/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const websiteId = searchParams.get('websiteId')
  const timeRange = searchParams.get('timeRange') || '24h'

  if (!websiteId) {
    return NextResponse.json({ error: 'Missing websiteId' }, { status: 400 })
  }

  // Calculate time filter
  const hoursMap: Record<string, number> = {
    '1h': 1,
    '24h': 24,
    '7d': 168,
    '30d': 720
  }
  
  const hours = hoursMap[timeRange] || 24
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  // Get traffic data from Supabase
  const { data: logs, error } = await supabase
    .from('traffic_logs')
    .select('*')
    .eq('website_id', websiteId)
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate metrics
  const totalRequests = logs.length
  const botRequests = logs.filter(l => l.is_bot).length
  const humanRequests = totalRequests - botRequests
  
  const botBytes = logs
    .filter(l => l.is_bot)
    .reduce((sum, l) => sum + (l.bytes_transferred || 0), 0)
  
  const humanBytes = logs
    .filter(l => !l.is_bot)
    .reduce((sum, l) => sum + (l.bytes_transferred || 0), 0)

  // Group by bot category
  const botBreakdown = logs
    .filter(l => l.is_bot)
    .reduce((acc: any, log) => {
      const category = log.bot_category || 'unknown'
      if (!acc[category]) {
        acc[category] = {
          requests: 0,
          bandwidth: 0,
          bots: new Set()
        }
      }
      acc[category].requests++
      acc[category].bandwidth += log.bytes_transferred || 0
      if (log.bot_name) acc[category].bots.add(log.bot_name)
      return acc
    }, {})

  // Convert Sets to arrays for JSON
  Object.keys(botBreakdown).forEach(key => {
    botBreakdown[key].bots = Array.from(botBreakdown[key].bots)
  })

  // Calculate potential savings
  const savingsPerGB = 0.15 // Average cost
  const botGB = botBytes / (1024 ** 3)
  const potentialSavings = botGB * savingsPerGB * 30 // Monthly

  return NextResponse.json({
    metrics: {
      totalRequests,
      botRequests,
      humanRequests,
      aiPercentage: totalRequests > 0 ? ((botRequests / totalRequests) * 100).toFixed(1) : '0',
      humanPercentage: totalRequests > 0 ? ((humanRequests / totalRequests) * 100).toFixed(1) : '0',
      botBandwidth: botBytes,
      humanBandwidth: humanBytes,
      potentialSavings: {
        total: potentialSavings,
        monthly: potentialSavings,
        yearly: potentialSavings * 12
      },
      botBreakdown
    },
    logs: logs.slice(0, 100) // Recent 100 for activity feed
  })
}
```

## 9. Dashboard Component (app/dashboard/page.tsx)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null)
  const [realtimeLogs, setRealtimeLogs] = useState<any[]>([])
  const [websiteId] = useState('demo-website-id') // Would come from auth

  useEffect(() => {
    // Fetch initial metrics
    fetchMetrics()

    // Subscribe to realtime updates
    const subscription = supabase
      .channel('traffic-logs')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'traffic_logs',
          filter: `website_id=eq.${websiteId}`
        },
        (payload) => {
          // Add new log to activity feed
          setRealtimeLogs(prev => [payload.new, ...prev].slice(0, 20))
          // Refresh metrics
          fetchMetrics()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [websiteId])

  async function fetchMetrics() {
    const response = await fetch(`/api/analyze?websiteId=${websiteId}&timeRange=24h`)
    const data = await response.json()
    setMetrics(data.metrics)
    setRealtimeLogs(data.logs || [])
  }

  async function handleFileUpload(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('websiteId', websiteId)

    const response = await fetch('/api/process-logs', {
      method: 'POST',
      body: formData
    })

    const result = await response.json()
    
    if (result.success) {
      // Refresh metrics after processing
      fetchMetrics()
    }
  }

  if (!metrics) return <div>Loading...</div>

  return (
    <div className="p-6">
      {/* File Upload Area */}
      <div className="mb-8 p-8 border-2 border-dashed border-gray-300 rounded-lg">
        <input
          type="file"
          accept=".log,.txt,.json"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
          id="log-upload"
        />
        <label htmlFor="log-upload" className="cursor-pointer">
          <div className="text-center">
            <p className="text-lg">Drop your server logs here or click to upload</p>
            <p className="text-sm text-gray-500">Supports Apache, Nginx, JSON logs</p>
          </div>
        </label>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Total Requests</h3>
          <p className="text-3xl font-bold">{metrics.totalRequests.toLocaleString()}</p>
          <div className="mt-2 text-sm">
            <span className="text-green-600">Human: {metrics.humanPercentage}%</span>
            <span className="ml-4 text-orange-600">Bots: {metrics.aiPercentage}%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">AI Bot Traffic</h3>
          <p className="text-3xl font-bold">{metrics.botRequests.toLocaleString()}</p>
          <p className="text-sm text-gray-500">
            {(metrics.botBandwidth / (1024 ** 3)).toFixed(2)} GB bandwidth
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Potential Savings</h3>
          <p className="text-3xl font-bold text-green-600">
            ${metrics.potentialSavings.monthly.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">per month</p>
        </div>
      </div>

      {/* Bot Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">Bot Categories</h3>
        <div className="space-y-2">
          {Object.entries(metrics.botBreakdown).map(([category, data]: [string, any]) => (
            <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium">{category}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {data.bots.join(', ')}
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold">{data.requests} requests</span>
                <span className="ml-4 text-sm text-gray-500">
                  {(data.bandwidth / (1024 ** 2)).toFixed(2)} MB
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Realtime Activity Feed */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {realtimeLogs.map((log, i) => (
            <div key={i} className="flex justify-between p-2 hover:bg-gray-50">
              <div>
                <span className={log.is_bot ? 'text-orange-600' : 'text-green-600'}>
                  {log.is_bot ? '🤖' : '👤'} {log.bot_name || 'Human'}
                </span>
                <span className="ml-2 text-sm text-gray-500">{log.path}</span>
              </div>
              <span className="text-sm text-gray-400">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

## 10. Deploy (2 Commands!)

```bash
# Deploy to Vercel
vercel

# That's it! Your backend and frontend are live!
```

## What We Built

- ✅ **Backend in TypeScript/JavaScript** (Next.js API routes)
- ✅ **Frontend in TypeScript/React** (Next.js pages)
- ✅ **Supabase for everything else** (Database, Realtime, Auth, Storage)
- ✅ **One codebase, one deployment**
- ✅ **Real-time updates without WebSockets code**
- ✅ **No Docker, No Redis, No complex setup**

## Cost: Basically Free

- **Supabase Free Tier**: 500MB database, 2GB bandwidth, 50,000 realtime messages
- **Vercel Free Tier**: 100GB bandwidth, serverless functions
- **Total Cost**: $0/month for MVP

## To Start Building

1. Create Supabase account (2 minutes)
2. Create new project
3. Copy the schema SQL to SQL Editor
4. Get your API keys
5. Clone the code above
6. `npm run dev`

That's it! No Docker, no complex setup, just TypeScript everywhere with Supabase handling the infrastructure.
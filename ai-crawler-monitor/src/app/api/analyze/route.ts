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
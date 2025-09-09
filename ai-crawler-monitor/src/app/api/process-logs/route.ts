import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { BotDetector } from '@/lib/bot-detector'
import { LogParser } from '@/lib/log-parser'
import { costCalculator } from '@/lib/cost-calculator'

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
    const botEntries = entries.filter(e => e.is_bot)
    const totalBotBytes = botEntries.reduce((sum, e) => sum + e.bytes_transferred, 0)
    const savingsResult = costCalculator.calculateBandwidthCost(totalBotBytes, 'generic')
    
    const stats = {
      totalEntries: entries.length,
      botRequests: botEntries.length,
      humanRequests: entries.filter(e => !e.is_bot).length,
      totalBytes: entries.reduce((sum, e) => sum + e.bytes_transferred, 0),
      potentialSavings: savingsResult.monthly
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
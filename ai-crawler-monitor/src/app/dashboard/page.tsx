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
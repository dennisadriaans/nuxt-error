import { defineNitroPlugin } from 'nitropack/dist/runtime/plugin'
import type { H3Event, H3Error } from 'h3'
import { getHeaders, getQuery, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'

interface ErrorPayload {
  path: string
  method: string
  statusCode: number
  message: string
  stack?: string
  headers: Record<string, string>
  payload: unknown
  timestamp: string
  environment: string
}

interface ErrorConfig {
  apiToken: string
  endpoint?: string
  includeStack?: boolean
  retryAttempts?: number
  timeout?: number
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error: H3Error, { event }: { event: H3Event }) => {
    const config = useRuntimeConfig()
    const errorConfig: ErrorConfig = config.nuxtError || {}

    try {
      // Validate configuration
      if (!errorConfig.apiToken) {
        console.warn('NuxtError: Missing API token configuration')
        return
      }

      // Gather request data
      const headers = getHeaders(event)
      const body = event.method === 'GET'
        ? getQuery(event)
        : await readBody(event).catch(() => ({}))

      const errorData: ErrorPayload = {
        path: event.path ?? 'unknown',
        method: event.method ?? 'unknown',
        statusCode: error.statusCode || 500,
        message: error.message,
        stack: error.stack,
        headers: headers,
        payload: body,
        timestamp: new Date().toISOString(),
      }

      // Attempt to send error data with retries
      const endpoint = errorConfig.endpoint || 'https://data.nuxterror.com'
      const maxAttempts = errorConfig.retryAttempts || 3
      const timeout = errorConfig.timeout || 5000

      let attempt = 0
      while (attempt < maxAttempts) {
        try {
          await $fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${errorConfig.apiToken}`,
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: errorData,
            timeout,
          })
          break
        }
        catch (fetchError) {
          attempt++
          if (attempt === maxAttempts) {
            console.error('NuxtError: Failed to send error data after', maxAttempts, 'attempts:', fetchError)
          }
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
        }
      }
    }
    catch (e) {
      console.error('NuxtError: Error in error handler:', e)
    }
  })
})

import { defineNuxtModule, createResolver, addServerPlugin, logger } from '@nuxt/kit'
import { defu } from 'defu'

export interface ModuleOptions {
  /**
   * Nuxt Error Module apiToken
   * @type {string}
   */
  apiToken?: string
  /**
   * Enable/disable the module
   * @type {boolean}
   * @default true
   */
  enabled?: boolean
  /**
   * Enable debug logging
   * @type {boolean}
   * @default false
   */
  debug?: boolean
}

// Runtime config type
declare module '@nuxt/schema' {
  interface RuntimeConfig {
    nuxtError: {
      apiToken: string
      enabled: boolean
      debug: boolean
    }
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-error',
    configKey: 'nuxtError',
    compatibility: {
      nuxt: '^3.0.0',
    },
  },
  defaults: {
    enabled: true,
    debug: false,
  },
  setup(options, nuxt) {
    // Module validation
    if (!options.enabled) {
      logger.info('Nuxt Error Module is disabled')
      return
    }

    // Skip in dev mode
    if (nuxt.options.dev) {
      logger.info('Nuxt Error Module is disabled in development mode')
      return
    }

    // Validate API token
    if (!options.apiToken) {
      logger.warn('No API token provided for Nuxt Error Module')
      return
    }

    if (typeof options.apiToken !== 'string') {
      throw new TypeError('API token must be a string')
    }

    const resolver = createResolver(import.meta.url)

    try {
      // Merge module options with runtime config
      nuxt.options.runtimeConfig.nuxtError = defu(
        { enabled: options.enabled },
        {
          apiToken: options.apiToken,
          debug: options.debug,
        },
      )

      // Add server plugin
      addServerPlugin(resolver.resolve('./runtime/nitro-plugin'))

      if (options.debug) {
        logger.info('Nuxt Error Module initialized successfully')
      }
    }
    catch (error) {
      logger.error('Failed to initialize Nuxt Error Module:', error)
      throw error
    }
  },
})

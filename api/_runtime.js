import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { getRelayerConfig, describeConfig } from './_lib/config.js'
import { createStore } from './_lib/store.js'
import { GenLayerAdapter } from './_lib/genlayer.js'
import { BaseAdapter } from './_lib/base.js'
import { RelayerService } from './_lib/service.js'
import { formatError } from './_lib/utils.js'
import { handleRelayerRequest } from './_lib/http.js'

export function createRelayerRuntime() {
  const config = getRelayerConfig()
  const store = createStore(config)
  const genlayer = new GenLayerAdapter(config.genlayer)
  const base = new BaseAdapter(config.base)
  const service = new RelayerService({ config, store, genlayer, base })

  async function handle(request, pathOverride) {
    return handleRelayerRequest({
      service,
      describeConfig: () => describeConfig(config),
    }, request, pathOverride)
  }

  function createServer() {
    return http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
        const body = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
          ? undefined
          : req
        const request = new Request(url, {
          method: req.method,
          headers: req.headers,
          body,
          duplex: body ? 'half' : undefined,
        })
        const response = await handle(request)
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
        if (response.body) {
          for await (const chunk of response.body) {
            res.write(chunk)
          }
        }
        res.end()
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(`${JSON.stringify({ error: formatError(error) })}\n`)
      }
    })
  }

  function start() {
    const server = createServer()
    const interval = setInterval(async () => {
      try {
        await service.syncOnce()
      } catch (error) {
        console.error(`Background sync failed: ${formatError(error)}`)
      }
    }, config.pollIntervalMs)

    server.listen(config.port, config.host, () => {
      console.log(`Callit relayer listening on http://${config.host}:${config.port}`)
      console.log(JSON.stringify(describeConfig(config), null, 2))
    })

    const shutdown = () => {
      clearInterval(interval)
      server.close(() => process.exit(0))
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    return server
  }

  return {
    config,
    service,
    handle,
    createServer,
    start,
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isMain) {
  createRelayerRuntime().start()
}

import { formatError } from './utils.js'

function jsonHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    ...extra,
  }
}

function jsonResponse(status, payload, extraHeaders) {
  return new Response(`${JSON.stringify(payload)}\n`, {
    status,
    headers: jsonHeaders(extraHeaders),
  })
}

function isAuthorizedSync(request) {
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret) return true
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function handleRelayerRequest(runtime, request, pathOverride) {
  try {
    const url = new URL(request.url)
    const pathname = pathOverride || url.pathname

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: jsonHeaders(),
      })
    }

    if (request.method === 'GET' && pathname === '/health') {
      return jsonResponse(200, {
        ok: true,
        config: runtime.describeConfig(),
        health: await runtime.service.getHealth(),
      })
    }

    if (request.method === 'GET' && pathname === '/markets') {
      const address = url.searchParams.get('address') || ''
      const markets = await runtime.service.listMarkets({ address })
      return jsonResponse(200, { markets })
    }

    if (request.method === 'GET' && pathname === '/user-markets') {
      const address = url.searchParams.get('address') || ''
      if (!address) {
        return jsonResponse(400, { error: 'address query parameter is required' })
      }
      const markets = await runtime.service.listMarkets({ address })
      return jsonResponse(200, { address, markets })
    }

    if (request.method === 'POST' && pathname === '/markets') {
      const body = await request.json().catch(() => ({}))
      const market = await runtime.service.submitMarket(body)
      return jsonResponse(200, {
        ...market,
        message: market.relayerMessage,
      })
    }

    if (request.method === 'POST' && pathname === '/sync') {
      if (!isAuthorizedSync(request)) {
        return jsonResponse(401, { error: 'Unauthorized' })
      }
      await runtime.service.syncOnce()
      return jsonResponse(200, {
        ok: true,
        health: await runtime.service.getHealth(),
      })
    }

    return jsonResponse(404, { error: 'Not found' })
  } catch (error) {
    return jsonResponse(500, {
      error: formatError(error),
    })
  }
}

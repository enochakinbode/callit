import { createRelayerRuntime } from './_runtime.js'

const runtime = createRelayerRuntime()

export async function POST(request) {
  return runtime.handle(request, '/sync')
}

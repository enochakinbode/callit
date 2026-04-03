import { createRelayerRuntime } from './_runtime.js'

const runtime = createRelayerRuntime()

export async function GET(request) {
  return runtime.handle(request, '/markets')
}

export async function POST(request) {
  return runtime.handle(request, '/markets')
}

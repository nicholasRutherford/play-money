import { NextResponse } from 'next/server'
import type { SchemaResponse } from '@play-money/api-helpers'
import { auth } from '@play-money/auth'
import { createMarket } from '@play-money/markets/lib/createMarket'
import { getMarkets } from '@play-money/markets/lib/getMarkets'
import schema from './schema'

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<SchemaResponse<typeof schema.get.responses>> {
  try {
    const url = new URL(req.url)
    const searchParams = new URLSearchParams(url.search)
    const params = Object.fromEntries(searchParams)

    const { createdBy, limit, tag } = schema.get.parameters.parse(params) ?? {}

    const markets = await getMarkets({ createdBy, tag }, undefined, { skip: 0, take: limit ?? 50 })

    return NextResponse.json({
      markets,
    })
  } catch (error) {
    console.log(error) // eslint-disable-line no-console -- Log error for debugging
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Error processing request' }, { status: 500 })
  }
}

export async function POST(req: Request): Promise<SchemaResponse<typeof schema.post.responses>> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in to create a market' }, { status: 401 })
    }

    const body = (await req.json()) as unknown
    const basicMarket = schema.post.requestBody.parse(body)
    const newMarket = await createMarket({
      ...basicMarket,
      createdBy: session.user.id,
    })

    return NextResponse.json(newMarket)
  } catch (error: unknown) {
    console.log(error) // eslint-disable-line no-console -- Log error for debugging
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to create market' }, { status: 500 })
  }
}

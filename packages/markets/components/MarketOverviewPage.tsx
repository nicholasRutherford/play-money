'use client'

import { format, isPast } from 'date-fns'
import { CircleCheckBig, ChevronDown, Pencil } from 'lucide-react'
import React from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts'
import useSWR from 'swr'
import { Market, MarketOption, MarketResolution } from '@play-money/database'
import { Alert, AlertDescription, AlertTitle } from '@play-money/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@play-money/ui/avatar'
import { Badge } from '@play-money/ui/badge'
import { Button } from '@play-money/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@play-money/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@play-money/ui/collapsible'
import { ReadMoreEditor } from '@play-money/ui/editor'
import { UserLink } from '@play-money/users/components/UserLink'
import { useUser } from '@play-money/users/context/UserContext'
import { UserProfile } from '@play-money/users/lib/sanitizeUser'
import { useSearchParam } from '../../ui/src/hooks/useSearchParam'
import { EditMarketDialog } from './EditMarketDialog'
import { MarketLikelyOption } from './MarketLikelyOption'
import { MarketOptionRow } from './MarketOptionRow'
import { MarketToolbar } from './MarketToolbar'
import { useSidebar } from './SidebarContext'

export type ExtendedMarket = Market & {
  user: UserProfile
  options: Array<MarketOption & { color: string }>
  marketResolution?: MarketResolution & {
    resolution: MarketOption & { color: string }
    resolvedBy: UserProfile
  }
}

function getTextContrast(hex: string): string {
  const r = parseInt(hex.substring(1, 3), 16)
  const g = parseInt(hex.substring(3, 5), 16)
  const b = parseInt(hex.substring(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5 ? '#000' : '#FFF'
}

export function MarketOverviewPage({
  market,
  renderComments,
  onRevalidate,
}: {
  market: ExtendedMarket
  renderComments: React.ReactNode
  onRevalidate: () => Promise<void>
}) {
  const { user } = useUser()
  const { triggerEffect } = useSidebar()
  const { data: balance } = useSWR(`/v1/markets/${market.id}/balance`, { refreshInterval: 1000 * 60 }) // 60 seconds
  const { data: graph } = useSWR(`/v1/markets/${market.id}/graph`, { refreshInterval: 1000 * 60 * 5 }) // 5 mins
  const [option, setOption] = useSearchParam('option', 'replace')
  const [isEditing, setIsEditing] = useSearchParam('edit')
  const activeOptionId = option || market.options[0]?.id || ''
  const isCreator = user?.id === market.createdBy

  return (
    <Card className="flex-1">
      <MarketToolbar market={market} canEdit={isCreator} onInitiateEdit={() => setIsEditing('true')} />

      <CardHeader className="pt-0">
        <CardTitle className="leading-relaxed">{market.question}</CardTitle>
        <div className="flex flex-row flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground md:flex-nowrap">
          {!market.marketResolution ? <MarketLikelyOption market={market} /> : null}

          {market.closeDate ? (
            <div className="flex-shrink-0">
              {isPast(market.closeDate) ? 'Ended' : 'Ending'} {format(market.closeDate, 'MMM d, yyyy')}
            </div>
          ) : null}
          {market.user ? (
            <div className="flex items-center gap-1 truncate">
              <Avatar className="h-4 w-4">
                <AvatarImage alt={`@${market.user.username}`} src={market.user.avatarUrl ?? ''} />
                <AvatarFallback>{market.user.username.toUpperCase().slice(0, 2)}</AvatarFallback>
              </Avatar>
              <UserLink user={market.user} hideUsername />
            </div>
          ) : null}
          {/* <div>15 Traders</div>
          <div>$650 Volume</div> */}
        </div>
      </CardHeader>
      <CardContent>
        <Card className="h-32 p-4">
          {graph?.data ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart width={300} height={128} data={graph.data}>
                <Tooltip
                  content={({ payload }) => {
                    const data = payload?.[0]?.payload
                    if (data) {
                      return (
                        <Card className="p-1 text-sm">
                          {format(data.startAt, 'MMM d, yyyy')} · {Math.round(data.probability * 100)}%
                        </Card>
                      )
                    }
                    return null
                  }}
                />
                <YAxis type="number" domain={[0, 1]} hide />
                <Line
                  type="step"
                  dot={false}
                  dataKey="probability"
                  stroke={market.options[0]?.color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  animationDuration={750}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </Card>
      </CardContent>

      <CardContent>
        {market.marketResolution ? (
          <>
            <Alert>
              <CircleCheckBig style={{ color: market.marketResolution.resolution.color }} className="h-4 w-4" />
              <AlertTitle className="flex justify-between">
                <span className="text-lg leading-none">{market.marketResolution.resolution.name}</span>
                <Badge
                  style={{
                    backgroundColor: market.marketResolution.resolution.color,
                    color: getTextContrast(market.marketResolution.resolution.color),
                  }}
                >
                  Resolved
                </Badge>
              </AlertTitle>
              <AlertDescription className="text-muted-foreground">
                By <UserLink user={market.marketResolution.resolvedBy} /> on{' '}
                {format(market.marketResolution.updatedAt, 'MMM d, yyyy')}
              </AlertDescription>
              {market.marketResolution.supportingLink ? (
                <AlertDescription>
                  <a
                    href={market.marketResolution.supportingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {market.marketResolution.supportingLink}
                  </a>
                </AlertDescription>
              ) : null}
            </Alert>
            {market.options.length ? (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground" size="sm">
                    View more <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card>
                    {market.options.map((option, i) => (
                      <MarketOptionRow
                        key={option.id}
                        option={option}
                        active={option.id === activeOptionId}
                        probability={balance?.probability[option.currencyCode] || 0}
                        className={i > 0 ? 'border-t' : ''}
                        onSelect={() => {
                          setOption(option.id)
                          triggerEffect()
                        }}
                      />
                    ))}
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </>
        ) : market.options.length ? (
          <Card>
            {market.options.map((option, i) => (
              <MarketOptionRow
                key={option.id}
                option={option}
                active={option.id === activeOptionId}
                probability={balance?.probability[option.currencyCode] || 0}
                className={i > 0 ? 'border-t' : ''}
                onSelect={() => {
                  setOption(option.id)
                  triggerEffect()
                }}
              />
            ))}
          </Card>
        ) : null}
      </CardContent>

      <CardContent>
        <ReadMoreEditor value={market.description} maxLines={6} />
      </CardContent>

      <div className="px-6 text-lg font-semibold">Comments</div>
      {renderComments}

      <EditMarketDialog
        market={market}
        open={isEditing === 'true'}
        onClose={() => setIsEditing(undefined)}
        onSuccess={onRevalidate}
      />
    </Card>
  )
}

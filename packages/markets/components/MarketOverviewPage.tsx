'use client'

import { format, isPast } from 'date-fns'
import _ from 'lodash'
import { CircleCheckBig, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { useMarketBalance } from '@play-money/api-helpers/client/hooks'
import { marketOptionBalancesToProbabilities } from '@play-money/finance/lib/helpers'
import { UserAvatar } from '@play-money/ui/UserAvatar'
import { Alert, AlertDescription, AlertTitle } from '@play-money/ui/alert'
import { Badge } from '@play-money/ui/badge'
import { Button } from '@play-money/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@play-money/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@play-money/ui/collapsible'
import { ReadMoreEditor } from '@play-money/ui/editor'
import { UserLink } from '@play-money/users/components/UserLink'
import { useUser } from '@play-money/users/context/UserContext'
import { useSearchParam } from '../../ui/src/hooks/useSearchParam'
import { ExtendedMarket } from '../types'
import { EditMarketDialog } from './EditMarketDialog'
import { EditMarketOptionDialog } from './EditMarketOptionDialog'
import { LiquidityBoostAlert } from './LiquidityBoostAlert'
import { LiquidityBoostDialog } from './LiquidityBoostDialog'
import { MarketGraph } from './MarketGraph'
import { MarketOptionRow } from './MarketOptionRow'
import { MarketToolbar } from './MarketToolbar'
import { useSidebar } from './SidebarContext'

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
  const { data: balance } = useMarketBalance({ marketId: market.id })
  const [option, setOption] = useSearchParam('option', 'replace')
  const [isEditing, setIsEditing] = useSearchParam('edit')
  const [isEditOption, setIsEditOption] = useSearchParam('editOption')
  const [isBoosting, setIsBoosting] = useSearchParam('boost')
  const activeOptionId = option || market.options[0]?.id || ''
  const isCreator = user?.id === market.createdBy
  const probabilities = marketOptionBalancesToProbabilities(balance?.amm)

  const mostLikelyOption = market.options.reduce((prev, current) =>
    prev.probability > current.probability ? prev : current
  )

  const orderedMarketOptions = _.orderBy(market.options, 'createdAt')

  return (
    <Card className="flex-1">
      <MarketToolbar
        market={market}
        canEdit={isCreator}
        onInitiateEdit={() => setIsEditing('true')}
        onInitiateBoost={() => setIsBoosting('true')}
      />

      <CardHeader className="pt-0 md:pt-0">
        <CardTitle className="leading-relaxed">{market.question}</CardTitle>
        <div className="flex flex-row flex-wrap gap-x-4 gap-y-2 font-mono text-sm text-muted-foreground md:flex-nowrap">
          {!market.marketResolution ? (
            <div style={{ color: mostLikelyOption.color }} className="flex-shrink-0 font-medium">
              {mostLikelyOption.probability}% {_.truncate(mostLikelyOption.name, { length: 30 })}
            </div>
          ) : null}
          {market.closeDate ? (
            <div className="flex-shrink-0">
              {isPast(market.closeDate) ? 'Ended' : 'Ending'} {format(market.closeDate, 'MMM d, yyyy')}
            </div>
          ) : null}
          {market.user ? (
            <div className="flex items-center gap-1 truncate">
              <UserAvatar user={market.user} size="sm" />
              <UserLink user={market.user} hideUsername />
            </div>
          ) : null}
          {/* <div>15 Traders</div>
          <div>$650 Volume</div> */}
        </div>
      </CardHeader>
      <CardContent>
        <MarketGraph market={market} activeOptionId={activeOptionId} />
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
            {orderedMarketOptions.length ? (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground" size="sm">
                    View more <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card>
                    {orderedMarketOptions.map((option, i) => (
                      <MarketOptionRow
                        key={option.id}
                        option={option}
                        active={option.id === activeOptionId}
                        probability={probabilities[option.id] || option.probability}
                        className={i > 0 ? 'border-t' : ''}
                        canEdit={user?.id === market.createdBy}
                        onEdit={() => setIsEditOption(option.id)}
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
        ) : orderedMarketOptions.length ? (
          <Card>
            {orderedMarketOptions.map((option, i) => (
              <MarketOptionRow
                key={option.id}
                option={option}
                active={option.id === activeOptionId}
                probability={probabilities[option.id] || option.probability}
                className={i > 0 ? 'border-t' : ''}
                canEdit={user?.id === market.createdBy}
                onEdit={() => setIsEditOption(option.id)}
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

        {market.tags.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {market.tags.map((tag) => (
              <Link href={`/questions/tagged/${tag}`}>
                <Badge variant="secondary">{tag}</Badge>
              </Link>
            ))}
          </div>
        ) : null}
      </CardContent>

      {!market.resolvedAt ? (
        <CardContent>
          <LiquidityBoostAlert onClick={() => setIsBoosting('true')} />
        </CardContent>
      ) : null}

      <div className="px-6 text-lg font-semibold">Comments</div>
      {renderComments}

      <EditMarketDialog
        market={market}
        open={isEditing === 'true'}
        onClose={() => setIsEditing(undefined)}
        onSuccess={onRevalidate}
      />
      <EditMarketOptionDialog
        market={market}
        optionId={isEditOption!}
        open={isEditOption != null}
        onClose={() => setIsEditOption(undefined)}
        onSuccess={onRevalidate}
      />
      <LiquidityBoostDialog
        market={market}
        open={isBoosting === 'true'}
        onClose={() => setIsBoosting(undefined)}
        onSuccess={onRevalidate}
      />
    </Card>
  )
}

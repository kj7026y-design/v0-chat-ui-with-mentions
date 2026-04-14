"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Character } from "@/lib/store"

interface CharacterCardProps {
  character: Character
  onClick: () => void
}

export function CharacterCard({ character, onClick }: CharacterCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 bg-card border-border group"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="text-5xl flex-shrink-0 p-3 bg-secondary rounded-xl group-hover:scale-110 transition-transform">
            {character.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {character.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {character.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className="text-xs border-primary/50 text-primary"
              >
                {character.category}
              </Badge>
              {character.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-secondary text-secondary-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

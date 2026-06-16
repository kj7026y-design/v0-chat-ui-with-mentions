"use client"

import { useEffect, useState } from "react"
import { CATEGORIES, type Category } from "@/lib/store"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CUSTOM_GENRE_VALUE = "__custom_genre__"

export function GenreSelectWithCustomInput({
  value,
  onChange,
  options = CATEGORIES,
}: {
  value: string
  onChange: (value: string) => void
  options?: readonly (Category | string)[]
}) {
  const [isCustomMode, setIsCustomMode] = useState(false)
  const isKnownGenre = options.includes(value)
  const selectValue = isCustomMode || (value && !isKnownGenre) ? CUSTOM_GENRE_VALUE : value

  useEffect(() => {
    if (value && !isKnownGenre) setIsCustomMode(true)
  }, [isKnownGenre, value])

  return (
    <div className="w-full space-y-2">
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (next === CUSTOM_GENRE_VALUE) {
            setIsCustomMode(true)
            if (isKnownGenre) onChange("")
            return
          }
          setIsCustomMode(false)
          onChange(next)
        }}
      >
        <SelectTrigger className="w-full bg-input">
          <SelectValue placeholder="장르 선택" />
        </SelectTrigger>
        <SelectContent>
          {options.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_GENRE_VALUE}>직접 입력</SelectItem>
        </SelectContent>
      </Select>
      {selectValue === CUSTOM_GENRE_VALUE && (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="장르를 직접 입력하세요"
          className="w-full bg-input"
        />
      )}
    </div>
  )
}

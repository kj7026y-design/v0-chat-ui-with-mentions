"use client"

import { Plus, X, Lock, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"

export interface StartOptionDraft {
  id: string
  title: string
  description: string
}

export interface StoryRulesData {
  defaultStartScenario: string
  allowUserChange: boolean
  allowCustom: boolean
  startOptions: StartOptionDraft[]
  forbiddenDevelopments: string[]
}

interface StoryRulesSectionProps {
  data: StoryRulesData
  onChange: (data: StoryRulesData) => void
}

export function StoryRulesSection({ data, onChange }: StoryRulesSectionProps) {
  const update = (partial: Partial<StoryRulesData>) => onChange({ ...data, ...partial })

  const addOption = () => {
    update({
      startOptions: [
        ...data.startOptions,
        { id: crypto.randomUUID(), title: "", description: "" },
      ],
    })
  }

  const updateOption = (id: string, partial: Partial<StartOptionDraft>) => {
    update({
      startOptions: data.startOptions.map((o) => (o.id === id ? { ...o, ...partial } : o)),
    })
  }

  const removeOption = (id: string) => {
    update({ startOptions: data.startOptions.filter((o) => o.id !== id) })
  }

  const addForbidden = () => {
    update({ forbiddenDevelopments: [...data.forbiddenDevelopments, ""] })
  }

  const updateForbidden = (index: number, value: string) => {
    update({
      forbiddenDevelopments: data.forbiddenDevelopments.map((f, i) => (i === index ? value : f)),
    })
  }

  const removeForbidden = (index: number) => {
    update({
      forbiddenDevelopments: data.forbiddenDevelopments.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      {/* 시작 설정 */}
      <FieldGroup className="space-y-4">
        <Field>
          <FieldLabel htmlFor="defaultStart">기본 시작 상황</FieldLabel>
          <Textarea
            id="defaultStart"
            placeholder="예: 당신은 비 내리는 밤, 처음으로 그를 마주한다."
            value={data.defaultStartScenario}
            onChange={(e) => update({ defaultStartScenario: e.target.value })}
            className="bg-input min-h-[72px]"
          />
        </Field>

        {/* 토글들 */}
        <div className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-3">
          <div>
            <p className="text-sm font-medium">사용자의 시작 상황 변경 허용</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              끄면 기본 시작 상황으로만 진행돼요.
            </p>
          </div>
          <Switch
            checked={data.allowUserChange}
            onCheckedChange={(v) => update({ allowUserChange: v })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-3">
          <div>
            <p className="text-sm font-medium">직접 입력 허용</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              사용자가 시작 상황을 자유롭게 적을 수 있어요.
            </p>
          </div>
          <Switch
            checked={data.allowCustom}
            disabled={!data.allowUserChange}
            onCheckedChange={(v) => update({ allowCustom: v })}
          />
        </div>
      </FieldGroup>

      {/* 작가 지정 시작 옵션 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            작가 지정 시작 옵션
          </p>
          <span className="text-xs text-muted-foreground">{data.startOptions.length}개</span>
        </div>

        {data.startOptions.map((opt) => (
          <div key={opt.id} className="space-y-2 rounded-lg border border-border/50 p-3">
            <div className="flex gap-2">
              <Input
                placeholder="옵션 제목 (예: 오래된 인연)"
                value={opt.title}
                onChange={(e) => updateOption(opt.id, { title: e.target.value })}
                className="bg-input flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeOption(opt.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="이 상황에 대한 설명"
              value={opt.description}
              onChange={(e) => updateOption(opt.id, { description: e.target.value })}
              className="bg-input"
            />
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addOption} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          시작 옵션 추가
        </Button>
      </div>

      {/* 금지 전개 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            금지 전개
          </p>
          <span className="text-xs text-muted-foreground">
            {data.forbiddenDevelopments.length}개
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          이야기에서 절대 일어나면 안 되는 전개를 적어주세요.
        </p>

        {data.forbiddenDevelopments.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="예: 주인공이 죽는 전개, 갑작스러운 시간 점프"
              value={item}
              onChange={(e) => updateForbidden(index, e.target.value)}
              className="bg-input flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeForbidden(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addForbidden} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          금지 전개 추가
        </Button>
      </div>
    </div>
  )
}

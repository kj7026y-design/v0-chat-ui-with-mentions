"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { CATEGORIES, type Category } from "@/lib/store"

const PERSONALITY_TAGS = [
  "냉철함",
  "다정함",
  "츤데레",
  "능글맞음",
  "천진난만",
  "신비로움",
  "열정적",
  "차분함",
  "유머러스",
  "도도함",
  "순수함",
  "카리스마",
]

interface FormData {
  name: string
  category: Category | ""
  personalities: string[]
  relationship: string
  speechStyle: string
  appearance: string
  preferences: string
  secrets: string
  taboos: string
}

export default function CreateCharacterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: "",
    category: "",
    personalities: [],
    relationship: "",
    speechStyle: "",
    appearance: "",
    preferences: "",
    secrets: "",
    taboos: "",
  })

  const togglePersonality = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      personalities: prev.personalities.includes(tag)
        ? prev.personalities.filter((t) => t !== tag)
        : [...prev.personalities, tag],
    }))
  }

  const generateSystemPrompt = () => {
    const parts: string[] = []

    parts.push(
      `너의 이름은 ${formData.name || "[캐릭터 이름]"}이고, ${formData.category || "[세계관]"}에 살고 있어.`
    )

    if (formData.personalities.length > 0) {
      parts.push(
        `너의 성격은 ${formData.personalities.join(", ")}한 특징을 가지고 있어.`
      )
    } else {
      parts.push("너의 성격은 [핵심 성격]한 특징을 가지고 있어.")
    }

    parts.push(
      `사용자와의 관계는 ${formData.relationship || "[관계 설정]"}이야.`
    )

    if (formData.speechStyle) {
      parts.push(`말투 규칙: ${formData.speechStyle}`)
    } else {
      parts.push("말투 규칙: [말투 및 말버릇 설정]")
    }

    if (formData.appearance) {
      parts.push(`외모 및 특징: ${formData.appearance}`)
    }

    if (formData.preferences) {
      parts.push(`취향 및 호불호: ${formData.preferences}`)
    }

    if (formData.secrets) {
      parts.push(`숨겨진 과거: ${formData.secrets}`)
    }

    if (formData.taboos) {
      parts.push(`금기 사항: 절대로 ${formData.taboos}하지 마.`)
    }

    return parts.join("\n\n")
  }

  const handleSubmit = () => {
    // In a real app, this would save the character and redirect
    router.push("/")
  }

  const isFormValid =
    formData.name &&
    formData.category &&
    formData.personalities.length > 0 &&
    formData.relationship &&
    formData.speechStyle

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">새 캐릭터 생성</h1>
        </div>
      </header>

      {/* Main Content - 5:5 Split */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left: Input Form */}
        <div className="w-1/2 border-r border-border">
          <ScrollArea className="h-full">
            <div className="p-8 space-y-8">
              {/* Step 1: Core Identity */}
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    1
                  </div>
                  <h2 className="text-lg font-semibold">
                    필수 정보 (Core Identity)
                  </h2>
                </div>

                <FieldGroup className="space-y-5">
                  {/* Character Name */}
                  <Field>
                    <FieldLabel htmlFor="name">캐릭터 이름</FieldLabel>
                    <Input
                      id="name"
                      placeholder="예: 아리아, 김대리"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="bg-input"
                    />
                  </Field>

                  {/* Category */}
                  <Field>
                    <FieldLabel htmlFor="category">세계관 / 카테고리</FieldLabel>
                    <Select
                      value={formData.category}
                      onValueChange={(value: Category) =>
                        setFormData((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger id="category" className="bg-input">
                        <SelectValue placeholder="세계관을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Personality Tags */}
                  <Field>
                    <FieldLabel>핵심 성격 (복수 선택 가능)</FieldLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PERSONALITY_TAGS.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            formData.personalities.includes(tag)
                              ? "default"
                              : "outline"
                          }
                          className={`cursor-pointer transition-all ${
                            formData.personalities.includes(tag)
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-secondary"
                          }`}
                          onClick={() => togglePersonality(tag)}
                        >
                          #{tag}
                          {formData.personalities.includes(tag) && (
                            <X className="ml-1 h-3 w-3" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </Field>

                  {/* Relationship */}
                  <Field>
                    <FieldLabel htmlFor="relationship">
                      사용자와의 관계
                    </FieldLabel>
                    <Input
                      id="relationship"
                      placeholder="예: 직장 상사, 소꿉친구, 스승"
                      value={formData.relationship}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          relationship: e.target.value,
                        }))
                      }
                      className="bg-input"
                    />
                  </Field>

                  {/* Speech Style */}
                  <Field>
                    <FieldLabel htmlFor="speechStyle">말투 규칙</FieldLabel>
                    <Textarea
                      id="speechStyle"
                      placeholder="캐릭터의 말투나 말버릇을 구체적으로 입력하세요.&#10;예: 문장 끝에 '~이다'를 붙이며 존댓말을 사용함. 가끔 고어체를 섞어 말함."
                      value={formData.speechStyle}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          speechStyle: e.target.value,
                        }))
                      }
                      className="bg-input min-h-[100px]"
                    />
                  </Field>
                </FieldGroup>
              </section>

              {/* Step 2: Deep Persona (Accordion) */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                    2
                  </div>
                  <h2 className="text-lg font-semibold text-muted-foreground">
                    선택 정보 (Deep Persona)
                  </h2>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="deep-persona" className="border-border">
                    <AccordionTrigger className="text-muted-foreground hover:text-foreground">
                      상세 설정 펼치기 (선택)
                    </AccordionTrigger>
                    <AccordionContent>
                      <FieldGroup className="space-y-5 pt-4">
                        {/* Appearance */}
                        <Field>
                          <FieldLabel htmlFor="appearance">
                            외모 및 특징
                          </FieldLabel>
                          <Input
                            id="appearance"
                            placeholder="예: 은발에 푸른 눈, 항상 검은 망토를 걸침"
                            value={formData.appearance}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                appearance: e.target.value,
                              }))
                            }
                            className="bg-input"
                          />
                        </Field>

                        {/* Preferences */}
                        <Field>
                          <FieldLabel htmlFor="preferences">
                            취향 및 호불호
                          </FieldLabel>
                          <Input
                            id="preferences"
                            placeholder="예: 커피를 좋아하고 시끄러운 곳을 싫어함"
                            value={formData.preferences}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                preferences: e.target.value,
                              }))
                            }
                            className="bg-input"
                          />
                        </Field>

                        {/* Secrets */}
                        <Field>
                          <FieldLabel htmlFor="secrets">
                            숨겨진 비밀 / 과거사
                          </FieldLabel>
                          <Textarea
                            id="secrets"
                            placeholder="캐릭터가 숨기고 있는 비밀이나 과거의 사건을 입력하세요."
                            value={formData.secrets}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                secrets: e.target.value,
                              }))
                            }
                            className="bg-input min-h-[80px]"
                          />
                        </Field>

                        {/* Taboos */}
                        <Field>
                          <FieldLabel htmlFor="taboos">금기 사항</FieldLabel>
                          <Input
                            id="taboos"
                            placeholder="예: 과거에 대해 묻는 것, 반말하는 것"
                            value={formData.taboos}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                taboos: e.target.value,
                              }))
                            }
                            className="bg-input"
                          />
                        </Field>
                      </FieldGroup>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>

              {/* Submit Button */}
              <div className="pt-4 pb-8">
                <Button
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  캐릭터 생성 및 대화 시작
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right: System Prompt Preview (Sticky) */}
        <div className="w-1/2 bg-secondary/30">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] p-8">
            <Card className="h-full bg-card border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  시스템 프롬프트 (실시간 조립)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <div className="p-6">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {generateSystemPrompt()
                        .split("\n\n")
                        .map((paragraph, index) => {
                          const isPlaceholder =
                            paragraph.includes("[") && paragraph.includes("]")
                          return (
                            <p
                              key={index}
                              className={`mb-4 ${
                                isPlaceholder
                                  ? "text-muted-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {paragraph}
                            </p>
                          )
                        })}
                    </pre>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

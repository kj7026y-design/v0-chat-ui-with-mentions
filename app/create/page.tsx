"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Sparkles,
  X,
  Eye,
  Dices,
  Rocket,
  Plus,
  MessageSquare,
  Heart,
  BarChart3,
  Smartphone,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { Slider } from "@/components/ui/slider"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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

// Random data pools based on creativity level
const RANDOM_DATA = {
  names: {
    low: ["김철수", "박영희", "이준호", "최민지", "정수빈"],
    mid: ["아리아", "카이젠", "미르", "세라핀", "로완"],
    high: ["제드 엑스", "네뷸라 7", "샤도우 위스퍼", "크림슨 페이트", "에코 프라임"],
  },
  categories: {
    low: ["회사", "학교"] as Category[],
    mid: ["고대 서양", "고대 아시아"] as Category[],
    high: ["판타지"] as Category[],
  },
  personalities: {
    low: [["다정함", "차분함"], ["열정적", "유머러스"], ["순수함", "다정함"]],
    mid: [["냉철함", "카리스마"], ["신비로움", "차분함"], ["도도함", "츤데레"]],
    high: [["신비로움", "냉철함", "카리스마"], ["능글맞음", "도도함", "츤데레"], ["천진난만", "신비로움"]],
  },
  relationships: {
    low: ["직장 동료", "같은 반 친구", "이웃 주민", "동아리 선배"],
    mid: ["오랜 라이벌", "수호자", "스승", "계약된 파트너"],
    high: ["차원을 넘어온 수호령", "기억을 공유하는 존재", "운명에 얽힌 숙적", "영혼의 계약자"],
  },
  speechStyles: {
    low: [
      "{char}는 존댓말을 사용하며 예의 바르게 말한다. {user}를 '님'으로 부른다.",
      "{char}는 반말을 쓰며 친근하게 대한다. 가끔 {user}에게 장난을 친다.",
    ],
    mid: [
      "{char}는 고풍스러운 말투를 사용한다. '~하오', '~이로다' 등의 어미를 쓴다.",
      "{char}는 차갑고 간결하게 말한다. {user}에게 감정을 잘 드러내지 않는다.",
    ],
    high: [
      "{char}는 수수께끼 같은 말투로 대화한다. 직접적인 대답 대신 은유를 사용한다.",
      "{char}는 여러 인격을 가진 듯 말투가 수시로 변한다. {user}를 혼란스럽게 만든다.",
    ],
  },
  backstories: {
    low: "평범한 가정에서 자랐으며, 안정적인 삶을 살아왔다.",
    mid: "어린 시절 큰 사건을 겪었고, 그로 인해 강인한 성격이 형성되었다.",
    high: "다른 차원에서 넘어왔으며, 이 세계의 기억과 원래 세계의 기억이 뒤섞여 있다.",
  },
}

interface SlashCommand {
  id: string
  name: string
  action: string
  icon: React.ReactNode
  isCustom?: boolean
}

const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  { id: "1", name: "/속마음", action: "캐릭터의 진짜 속마음을 독백으로 보여준다", icon: <Heart className="h-4 w-4" /> },
  { id: "2", name: "/상태바", action: "현재 감정, 호감도, 상황을 상태창으로 표시한다", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "3", name: "/카톡", action: "카카오톡 채팅 형식으로 대화를 진행한다", icon: <Smartphone className="h-4 w-4" /> },
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
  const speechStyleRef = useRef<HTMLTextAreaElement>(null)
  const [creativityLevel, setCreativityLevel] = useState([3])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>(DEFAULT_SLASH_COMMANDS)
  const [newCommandName, setNewCommandName] = useState("")
  const [newCommandAction, setNewCommandAction] = useState("")
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

  const getCreativityTier = (level: number): "low" | "mid" | "high" => {
    if (level <= 2) return "low"
    if (level <= 4) return "mid"
    return "high"
  }

  const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  // Random generate all required fields at once
  const handleRandomGenerate = () => {
    const tier = getCreativityTier(creativityLevel[0])

    setFormData((prev) => ({
      ...prev,
      name: pickRandom(RANDOM_DATA.names[tier]),
      category: pickRandom(RANDOM_DATA.categories[tier]),
      personalities: pickRandom(RANDOM_DATA.personalities[tier]),
      relationship: pickRandom(RANDOM_DATA.relationships[tier]),
      speechStyle: pickRandom(RANDOM_DATA.speechStyles[tier]),
      secrets: RANDOM_DATA.backstories[tier],
    }))
  }

  // Individual random generators
  const randomizeName = () => {
    const tier = getCreativityTier(creativityLevel[0])
    setFormData((prev) => ({ ...prev, name: pickRandom(RANDOM_DATA.names[tier]) }))
  }

  const togglePersonality = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      personalities: prev.personalities.includes(tag)
        ? prev.personalities.filter((t) => t !== tag)
        : [...prev.personalities, tag],
    }))
  }

  // Insert variable at cursor position
  const insertVariable = (variable: "{user}" | "{char}") => {
    const textarea = speechStyleRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formData.speechStyle
    const newText = text.substring(0, start) + variable + text.substring(end)

    setFormData((prev) => ({ ...prev, speechStyle: newText }))

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + variable.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Slash command handlers
  const addCustomCommand = () => {
    if (!newCommandName || !newCommandAction) return
    const commandName = newCommandName.startsWith("/") ? newCommandName : `/${newCommandName}`
    setSlashCommands((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: commandName,
        action: newCommandAction,
        icon: <MessageSquare className="h-4 w-4" />,
        isCustom: true,
      },
    ])
    setNewCommandName("")
    setNewCommandAction("")
  }

  const removeCommand = (id: string) => {
    setSlashCommands((prev) => prev.filter((cmd) => cmd.id !== id))
  }

  // Render text with variable replacement
  const renderWithVariables = (text: string) => {
    if (!text) return null

    const charName = formData.name || "[캐릭터 이름]"
    const parts = text.split(/(\{user\}|\{char\})/g)

    return parts.map((part, index) => {
      if (part === "{user}") {
        return (
          <strong key={index} className="text-primary">
            사용자
          </strong>
        )
      }
      if (part === "{char}") {
        return (
          <strong key={index} className="text-primary">
            {charName}
          </strong>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const generateSystemPrompt = () => {
    const parts: { text: string; isPlaceholder: boolean }[] = []

    parts.push({
      text: `너의 이름은 ${formData.name || "[캐릭터 이름]"}이고, ${formData.category || "[세계관]"}에 살고 있어.`,
      isPlaceholder: !formData.name || !formData.category,
    })

    if (formData.personalities.length > 0) {
      parts.push({
        text: `너의 성격은 ${formData.personalities.join(", ")}한 특징을 가지고 있어.`,
        isPlaceholder: false,
      })
    } else {
      parts.push({
        text: "너의 성격은 [핵심 성격]한 특징을 가지고 있어.",
        isPlaceholder: true,
      })
    }

    parts.push({
      text: `사용자와의 관계는 ${formData.relationship || "[관계 설정]"}이야.`,
      isPlaceholder: !formData.relationship,
    })

    parts.push({
      text: formData.speechStyle
        ? `말투 규칙: ${formData.speechStyle}`
        : "말투 규칙: [말투 및 말버릇 설정]",
      isPlaceholder: !formData.speechStyle,
    })

    if (formData.appearance) {
      parts.push({ text: `외모 및 특징: ${formData.appearance}`, isPlaceholder: false })
    }
    if (formData.preferences) {
      parts.push({ text: `취향 및 호불호: ${formData.preferences}`, isPlaceholder: false })
    }
    if (formData.secrets) {
      parts.push({ text: `숨겨진 과거: ${formData.secrets}`, isPlaceholder: false })
    }
    if (formData.taboos) {
      parts.push({ text: `금기 사항: 절대로 ${formData.taboos}하지 마.`, isPlaceholder: false })
    }

    // Add slash commands to prompt
    if (slashCommands.length > 0) {
      parts.push({
        text: `\n[슬래시 명령어]\n${slashCommands.map((cmd) => `${cmd.name}: ${cmd.action}`).join("\n")}`,
        isPlaceholder: false,
      })
    }

    return parts
  }

  const handleSubmit = () => {
    router.push("/")
  }

  const isFormValid =
    formData.name &&
    formData.category &&
    formData.personalities.length > 0 &&
    formData.relationship &&
    formData.speechStyle

  const creativityLabels = ["평범함", "", "", "중립", "", "독특함"]

  // Preview Content Component
  const PreviewContent = () => (
    <ScrollArea className="flex-1">
      <div className="p-6">
        <div className="space-y-4 text-sm leading-relaxed">
          {generateSystemPrompt().map((part, index) => (
            <p
              key={index}
              className={part.isPlaceholder ? "text-muted-foreground" : "text-foreground whitespace-pre-wrap"}
            >
              {part.text.includes("{user}") || part.text.includes("{char}")
                ? renderWithVariables(part.text)
                : part.text}
            </p>
          ))}
        </div>
      </div>
    </ScrollArea>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4 md:px-6">
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

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Left: Input Form */}
        <div className="w-full md:w-1/2">
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-40 md:pb-8">
              {/* Random Generator Section */}
              <section className="space-y-4">
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-4 md:p-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">창의력 조절 (Creativity Level)</span>
                        <span className="text-xs text-muted-foreground">
                          {creativityLevel[0]} / 5
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">평범함</span>
                        <Slider
                          value={creativityLevel}
                          onValueChange={setCreativityLevel}
                          min={1}
                          max={5}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">독특함</span>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleRandomGenerate}
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      이 설정으로 캐릭터 랜덤 생성
                    </Button>
                  </CardContent>
                </Card>
              </section>

              {/* Step 1: Core Identity */}
              <section className="space-y-5 md:space-y-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    1
                  </div>
                  <h2 className="text-lg font-semibold">필수 정보 (Core Identity)</h2>
                </div>

                <FieldGroup className="space-y-4 md:space-y-5">
                  {/* Character Name with Random Button */}
                  <Field>
                    <FieldLabel htmlFor="name">캐릭터 이름</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        id="name"
                        placeholder="예: 아리아, 김대리"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="bg-input flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={randomizeName}
                        className="shrink-0"
                        title="이름 랜덤 생성"
                      >
                        <Dices className="h-4 w-4" />
                      </Button>
                    </div>
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
                            formData.personalities.includes(tag) ? "default" : "outline"
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
                    <FieldLabel htmlFor="relationship">사용자와의 관계</FieldLabel>
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

                  {/* Speech Style with Variable Buttons */}
                  <Field>
                    <FieldLabel htmlFor="speechStyle">말투 및 규칙</FieldLabel>
                    <div className="flex gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                        onClick={() => insertVariable("{user}")}
                      >
                        {"{user}"} 추가
                      </Badge>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                        onClick={() => insertVariable("{char}")}
                      >
                        {"{char}"} 추가
                      </Badge>
                    </div>
                    <Textarea
                      id="speechStyle"
                      ref={speechStyleRef}
                      placeholder={`캐릭터의 말투나 말버릇을 구체적으로 입력하세요.\n예: {char}는 문장 끝에 '~이다'를 붙이며 {user}에게 존댓말을 사용함.`}
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                    2
                  </div>
                  <h2 className="text-lg font-semibold text-muted-foreground">
                    선택 정보 (Deep Persona)
                  </h2>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="deep-persona" className="border-border/50">
                    <AccordionTrigger className="text-muted-foreground hover:text-foreground">
                      상세 설정 펼치기
                    </AccordionTrigger>
                    <AccordionContent>
                      <FieldGroup className="space-y-4 md:space-y-5 pt-4">
                        <Field>
                          <FieldLabel htmlFor="appearance">외모 및 특징</FieldLabel>
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

                        <Field>
                          <FieldLabel htmlFor="preferences">취향 및 호불호</FieldLabel>
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

                        <Field>
                          <FieldLabel htmlFor="secrets">숨겨진 비밀 / 과거사</FieldLabel>
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

              {/* Step 3: Slash Commands (Accordion) */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                    3
                  </div>
                  <h2 className="text-lg font-semibold text-muted-foreground">
                    명령어 정의 (Slash Commands)
                  </h2>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="slash-commands" className="border-border/50">
                    <AccordionTrigger className="text-muted-foreground hover:text-foreground">
                      슬래시 명령어 설정
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        {/* Existing Commands */}
                        <div className="space-y-2">
                          {slashCommands.map((cmd) => (
                            <div
                              key={cmd.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                            >
                              <div className="text-primary">{cmd.icon}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{cmd.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {cmd.action}
                                </p>
                              </div>
                              {cmd.isCustom && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeCommand(cmd.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add Custom Command */}
                        <div className="space-y-3 pt-2 border-t border-border/50">
                          <p className="text-sm font-medium">커스텀 명령어 추가</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="명령어 (예: /힌트)"
                              value={newCommandName}
                              onChange={(e) => setNewCommandName(e.target.value)}
                              className="bg-input flex-1"
                            />
                          </div>
                          <Input
                            placeholder="동작 설명 (예: 다음 행동에 대한 힌트를 준다)"
                            value={newCommandAction}
                            onChange={(e) => setNewCommandAction(e.target.value)}
                            className="bg-input"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addCustomCommand}
                            disabled={!newCommandName || !newCommandAction}
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            명령어 추가
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>

              {/* Desktop Submit Button */}
              <div className="hidden md:block pt-4 pb-8">
                <Button
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                >
                  <Rocket className="mr-2 h-5 w-5" />
                  캐릭터 생성 및 대화 시작
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right: System Prompt Preview (Desktop only) */}
        <div className="hidden md:block w-1/2 bg-secondary/10">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] p-8">
            <Card className="h-full bg-card/50 border-border/50 flex flex-col">
              <CardHeader className="border-b border-border/50 shrink-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  시스템 프롬프트 (실시간 조립)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                <PreviewContent />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Fixed Area */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background/95 backdrop-blur p-4 space-y-3 z-40">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsPreviewOpen(true)}
        >
          <Eye className="mr-2 h-4 w-4" />
          프롬프트 미리보기
        </Button>

        <Button
          size="lg"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={!isFormValid}
        >
          <Rocket className="mr-2 h-5 w-5" />
          캐릭터 생성 및 대화 시작
        </Button>
      </div>

      {/* Mobile Preview Sheet */}
      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <SheetHeader className="border-b border-border/50 p-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              시스템 프롬프트 (실시간 조립)
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-[calc(80vh-60px)]">
            <PreviewContent />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

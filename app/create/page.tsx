"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, X, Upload, ImageIcon, Eye } from "lucide-react"
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

interface UploadedImage {
  id: string
  file: File
  preview: string
}

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
  images: UploadedImage[]
}

export default function CreateCharacterPage() {
  const router = useRouter()
  const speechStyleRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
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
    images: [],
  })

  const togglePersonality = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      personalities: prev.personalities.includes(tag)
        ? prev.personalities.filter((t) => t !== tag)
        : [...prev.personalities, tag],
    }))
  }

  // Image upload handlers
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const newImages: UploadedImage[] = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }))

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }))
  }, [])

  const removeImage = (id: string) => {
    setFormData((prev) => {
      const imageToRemove = prev.images.find((img) => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return {
        ...prev,
        images: prev.images.filter((img) => img.id !== id),
      }
    })
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
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

    // Restore focus and cursor position after state update
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + variable.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
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
      parts.push({
        text: `외모 및 특징: ${formData.appearance}`,
        isPlaceholder: false,
      })
    }

    if (formData.preferences) {
      parts.push({
        text: `취향 및 호불호: ${formData.preferences}`,
        isPlaceholder: false,
      })
    }

    if (formData.secrets) {
      parts.push({
        text: `숨겨진 과거: ${formData.secrets}`,
        isPlaceholder: false,
      })
    }

    if (formData.taboos) {
      parts.push({
        text: `금기 사항: 절대로 ${formData.taboos}하지 마.`,
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

  // Preview Content Component (reused in both desktop and mobile)
  const PreviewContent = () => (
    <>
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="space-y-4 text-sm leading-relaxed">
            {generateSystemPrompt().map((part, index) => (
              <p
                key={index}
                className={
                  part.isPlaceholder
                    ? "text-muted-foreground"
                    : "text-foreground"
                }
              >
                {part.text.includes("{user}") || part.text.includes("{char}")
                  ? renderWithVariables(part.text)
                  : part.text}
              </p>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Image Preview Section */}
      <div className="shrink-0 border-t border-border p-4 bg-secondary/20">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <ImageIcon className="h-4 w-4" />
          <span>참고 이미지: {formData.images.length}장</span>
        </div>
        {formData.images.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {formData.images.map((img) => (
              <img
                key={img.id}
                src={img.preview}
                alt="Preview"
                className="h-12 w-12 object-cover rounded shrink-0"
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60">
            업로드된 이미지가 없습니다
          </p>
        )}
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

      {/* Main Content - Responsive Layout */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left: Input Form - Full width on mobile, 50% on desktop */}
        <div className="w-full md:w-1/2 md:border-r md:border-border">
          <ScrollArea className="h-full">
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-32 md:pb-8">
              {/* Step 1: Core Identity */}
              <section className="space-y-5 md:space-y-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    1
                  </div>
                  <h2 className="text-lg font-semibold">
                    필수 정보 (Core Identity)
                  </h2>
                </div>

                <FieldGroup className="space-y-4 md:space-y-5">
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

                  {/* Image Upload */}
                  <Field>
                    <FieldLabel>캐릭터 이미지 (여러 장 등록 가능)</FieldLabel>
                    <div
                      className={`mt-2 border-2 border-dashed rounded-lg p-6 md:p-8 text-center cursor-pointer transition-colors ${
                        isDragging
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground"
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                      />
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        이미지를 드래그하거나 클릭하여 업로드
                      </p>
                    </div>

                    {/* Image Thumbnails */}
                    {formData.images.length > 0 && (
                      <div className="mt-4 grid grid-cols-4 md:grid-cols-5 gap-2">
                        {formData.images.map((img) => (
                          <div key={img.id} className="relative group aspect-square">
                            <img
                              src={img.preview}
                              alt="Uploaded"
                              className="w-full h-full object-cover rounded-md"
                            />
                            <button
                              onClick={() => removeImage(img.id)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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

                  {/* Speech Style with Variable Buttons */}
                  <Field>
                    <FieldLabel htmlFor="speechStyle">말투 규칙</FieldLabel>
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
                      <FieldGroup className="space-y-4 md:space-y-5 pt-4">
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

              {/* Desktop Submit Button */}
              <div className="hidden md:block pt-4 pb-8">
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

        {/* Right: System Prompt Preview (Desktop only) */}
        <div className="hidden md:block w-1/2 bg-secondary/30">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] p-8">
            <Card className="h-full bg-card border-border flex flex-col">
              <CardHeader className="border-b border-border shrink-0">
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
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background border-t border-border p-4 space-y-3 z-40">
        {/* Preview Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsPreviewOpen(true)}
        >
          <Eye className="mr-2 h-4 w-4" />
          프롬프트 미리보기
        </Button>

        {/* Submit Button */}
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

      {/* Mobile Preview Sheet */}
      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <SheetHeader className="border-b border-border p-4">
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

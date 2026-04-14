"use client"

import { useState, useRef } from "react"
import { useAppStore, type Story } from "@/lib/store"
import { StoryCard } from "@/components/story-card"
import { StoryDrawer } from "@/components/story-drawer"
import { Button } from "@/components/ui/button"
import { Play, ChevronLeft, ChevronRight, User, Compass, PenTool } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BottomNavBar } from "@/components/chat/bottom-nav-bar"

type Tab = "discover" | "studio"

export default function HomePage() {
  const { stories, setSelectedStory, openStoryDrawer } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>("discover")
  const carouselRef = useRef<HTMLDivElement>(null)

  const featuredStory = stories.find((s) => s.featured)
  const regularStories = stories.filter((s) => !s.featured)

  const handleStoryClick = (story: Story) => {
    setSelectedStory(story)
    openStoryDrawer()
  }

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 320
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background via-background/80 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                StoryChat
              </h1>

              {/* Tabs */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("discover")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === "discover"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Compass className="w-4 h-4" />
                  탐색
                </button>
                <Link
                  href="/create"
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === "studio"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <PenTool className="w-4 h-4" />
                  내 작업실
                </Link>
              </div>
            </div>

            {/* Profile */}
            <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
              <User className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Mobile Tabs */}
          <div className="flex sm:hidden items-center gap-1 mt-4">
            <button
              onClick={() => setActiveTab("discover")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center",
                activeTab === "discover"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Compass className="w-4 h-4" />
              탐색
            </button>
            <Link
              href="/create"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              <PenTool className="w-4 h-4" />
              내 작업실
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      {featuredStory && (
        <section className="relative pt-28 sm:pt-24">
          <div className="relative h-[60vh] sm:h-[70vh] min-h-[400px] w-full overflow-hidden">
            {/* Background Image */}
            <img
              src={featuredStory.coverImage}
              alt={featuredStory.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12 max-w-7xl mx-auto">
              <div className="max-w-xl space-y-4">
                {/* Tags */}
                <div className="flex gap-2">
                  {featuredStory.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-medium text-foreground/80 bg-foreground/10 backdrop-blur-sm px-3 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight text-balance">
                  {featuredStory.title}
                </h2>

                {/* Synopsis */}
                <p className="text-lg sm:text-xl text-foreground/80 leading-relaxed text-pretty">
                  {featuredStory.synopsis}
                </p>

                {/* CTA Button */}
                <div className="pt-2 pb-4">
                  <Button
                    onClick={() => handleStoryClick(featuredStory)}
                    size="lg"
                    className="bg-foreground text-background hover:bg-foreground/90 h-12 px-6 text-base font-semibold"
                  >
                    <Play className="w-5 h-5 mr-2 fill-current" />
                    바로 시작하기
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Story Carousel Section */}
      <section className="relative z-10 pt-8 pb-16 sm:pb-16 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground">
              이번 주 추천 스토리 팩
            </h3>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scrollCarousel("left")}
                className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={() => scrollCarousel("right")}
                className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>

          {/* Carousel */}
          <div
            ref={carouselRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {regularStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onClick={() => handleStoryClick(story)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Story Drawer */}
      <StoryDrawer />

      {/* Bottom Navigation - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
        <BottomNavBar />
      </div>
    </main>
  )
}

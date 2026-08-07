"use client";

import {
  ArrowLeft,
  ChevronRight,
  Layers,
  User,
  BookOpen,
  Smile,
} from "lucide-react";

interface AdvancedCreateHomeProps {
  onBack: () => void;
  onSelectWork: () => void;
  onSelectCharacter: () => void;
  onSelectWorld: () => void;
  onSelectPersona: () => void;
  characterCount?: number;
  worldCount?: number;
}

export default function AdvancedCreateHome({
  onBack,
  onSelectWork,
  onSelectCharacter,
  onSelectWorld,
  onSelectPersona,
  characterCount,
  worldCount,
}: AdvancedCreateHomeProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-5 pt-4 pb-8 dark:bg-neutral-950">
      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="뒤로 가기"
          className="-ml-1 p-1 text-neutral-900 dark:text-neutral-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          만들기
        </h1>
      </div>

      {/* 타이틀 */}
      <h2 className="mb-1.5 text-lg font-medium text-neutral-900 dark:text-neutral-100">
        무엇을 만들까요?
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        필요한 항목만 따로 만들거나, 완성본으로 묶어 바로 채팅을 시작할 수
        있어요.
      </p>

      {/* 작품 만들기 (추천) */}
      <button
        type="button"
        onClick={onSelectWork}
        className="mb-6 rounded-2xl border-2 border-blue-500 p-5 text-left transition-colors active:bg-blue-50 dark:border-blue-400 dark:active:bg-blue-950/40"
      >
        <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          추천 · 빠른 시작
        </span>

        <div className="mt-3 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950">
            <Layers
              size={22}
              className="text-emerald-700 dark:text-emerald-300"
            />
          </div>
          <div className="flex-1">
            <p className="mb-1 text-base font-medium text-neutral-900 dark:text-neutral-100">
              작품 만들기
            </p>
            <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              캐릭터와 세계관을 연결해서 바로 채팅할 수 있는 완성본을 만들어요.
            </p>
            {(characterCount !== undefined || worldCount !== undefined) && (
              <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                보유 캐릭터 {characterCount ?? 0}개 · 세계관 {worldCount ?? 0}개
                — 만드는 중에 새로 추가할 수 있어요
              </p>
            )}
          </div>
          <ChevronRight size={16} className="mt-1 shrink-0 text-neutral-400" />
        </div>
      </button>

      {/* 구성 요소만 따로 만들기 */}
      <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
        구성 요소만 따로 만들기
      </p>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <ComponentCard
          icon={User}
          iconBg="bg-lime-50 dark:bg-lime-950"
          iconColor="text-lime-700 dark:text-lime-300"
          title="캐릭터 만들기"
          description="캐릭터만 따로 만들어요."
          onClick={onSelectCharacter}
        />
        <ComponentCard
          icon={BookOpen}
          iconBg="bg-amber-50 dark:bg-amber-950"
          iconColor="text-amber-700 dark:text-amber-300"
          title="세계관 만들기"
          description="배경과 규칙만 만들어요."
          onClick={onSelectWorld}
        />
      </div>

      <button
        type="button"
        onClick={onSelectPersona}
        className="rounded-2xl border border-neutral-200 p-4 text-left transition-colors active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-900"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950">
            <Smile size={20} className="text-violet-700 dark:text-violet-300" />
          </div>
          <div className="flex-1">
            <p className="mb-0.5 text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
              자아 만들기
            </p>
            <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              채팅에서 쓸 나의 역할을 만들어요 (캐릭터와 달리 &apos;나&apos;
              자신이에요).
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}

function ComponentCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  onClick,
}: {
  icon: typeof User;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start rounded-2xl border border-neutral-200 p-4 text-left transition-colors active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-900"
    >
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon size={20} className={iconColor} />
      </div>
      <p className="mb-0.5 text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
        {title}
      </p>
      <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        {description}
      </p>
    </button>
  );
}

"use client"

import { Edit3, MessageCircle, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  getWorkComments,
  saveWorkComments,
  type WorkComment,
} from "@/lib/work-comments-storage"

interface WorkCommentsProps {
  workId: string
}

const MAX_COMMENT_LENGTH = 300

export function WorkComments({ workId }: WorkCommentsProps) {
  const [comments, setComments] = useState<WorkComment[]>([])
  const [draft, setDraft] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState("")
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState("")

  useEffect(() => {
    const sync = () => setComments(getWorkComments())
    sync()
    window.addEventListener("storage", sync)
    window.addEventListener("storychat-work-comments-updated", sync)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener("storychat-work-comments-updated", sync)
    }
  }, [])

  const workComments = useMemo(
    () => comments.filter((comment) => comment.workId === workId),
    [comments, workId],
  )
  const topLevelComments = useMemo(
    () => workComments.filter((comment) => !comment.parentId),
    [workComments],
  )
  const repliesByParent = useMemo(() => {
    const map = new Map<string, WorkComment[]>()
    workComments
      .filter((comment) => comment.parentId)
      .forEach((comment) => {
        if (!comment.parentId) return
        map.set(comment.parentId, [...(map.get(comment.parentId) ?? []), comment])
      })
    return map
  }, [workComments])

  const submitComment = () => {
    const content = draft.trim()
    if (!content) return
    const nextComment: WorkComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      workId,
      authorName: "나",
      content: content.slice(0, MAX_COMMENT_LENGTH),
      createdAt: new Date().toLocaleString("ko-KR"),
    }
    const nextComments = [nextComment, ...comments]
    saveWorkComments(nextComments)
    setComments(nextComments)
    setDraft("")
  }

  const submitReply = (parentId: string) => {
    const content = replyDraft.trim()
    if (!content) return
    const nextReply: WorkComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      workId,
      parentId,
      authorName: "나",
      content: content.slice(0, MAX_COMMENT_LENGTH),
      createdAt: new Date().toLocaleString("ko-KR"),
    }
    const nextComments = [...comments, nextReply]
    saveWorkComments(nextComments)
    setComments(nextComments)
    setReplyDraft("")
    setReplyingToId(null)
  }

  const startEdit = (comment: WorkComment) => {
    setEditingId(comment.id)
    setEditingDraft(comment.content)
    setReplyingToId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingDraft("")
  }

  const saveEdit = (commentId: string) => {
    const content = editingDraft.trim()
    if (!content) return
    const updatedAt = new Date().toLocaleString("ko-KR")
    const nextComments = comments.map((comment) =>
      comment.id === commentId
        ? { ...comment, content: content.slice(0, MAX_COMMENT_LENGTH), updatedAt }
        : comment,
    )
    saveWorkComments(nextComments)
    setComments(nextComments)
    cancelEdit()
  }

  const deleteComment = (commentId: string) => {
    const nextComments = comments.filter((comment) => comment.id !== commentId && comment.parentId !== commentId)
    saveWorkComments(nextComments)
    setComments(nextComments)
    if (editingId === commentId) cancelEdit()
    if (replyingToId === commentId) {
      setReplyingToId(null)
      setReplyDraft("")
    }
  }

  return (
    <section className="space-y-3 rounded-[22px] border border-border bg-card/80 p-4">
      <div>
        <h2 className="text-base font-bold text-foreground">댓글</h2>
        <p className="mt-1 text-xs text-muted-foreground">로컬에 저장되는 댓글입니다.</p>
      </div>
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
          placeholder="작품에 대한 댓글을 남겨보세요."
          className="min-h-[82px] bg-input"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{draft.length}/{MAX_COMMENT_LENGTH}</span>
          <Button type="button" size="sm" onClick={submitComment} disabled={!draft.trim()}>
            등록
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {topLevelComments.length === 0 ? (
          <p className="rounded-2xl border border-border bg-background/50 px-3 py-4 text-center text-sm text-muted-foreground">
            아직 댓글이 없습니다.
          </p>
        ) : (
          topLevelComments.map((comment) => (
            <article key={comment.id} className="rounded-2xl border border-border bg-background/50 p-3">
              <CommentBody
                comment={comment}
                isEditing={editingId === comment.id}
                editingDraft={editingDraft}
                onEditingDraftChange={setEditingDraft}
                onEdit={() => startEdit(comment)}
                onCancelEdit={cancelEdit}
                onSaveEdit={() => saveEdit(comment.id)}
                onDelete={() => deleteComment(comment.id)}
                onReply={() => {
                  setReplyingToId((current) => current === comment.id ? null : comment.id)
                  setReplyDraft("")
                  cancelEdit()
                }}
              />

              {replyingToId === comment.id && (
                <div className="mt-3 rounded-2xl border border-border bg-card p-3">
                  <Textarea
                    value={replyDraft}
                    onChange={(event) => setReplyDraft(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
                    placeholder="답글을 입력하세요."
                    className="min-h-[68px] bg-input"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{replyDraft.length}/{MAX_COMMENT_LENGTH}</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingToId(null)
                          setReplyDraft("")
                        }}
                      >
                        취소
                      </Button>
                      <Button type="button" size="sm" onClick={() => submitReply(comment.id)} disabled={!replyDraft.trim()}>
                        답글 등록
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 space-y-2 border-l border-border pl-3">
                {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                  <div key={reply.id} className="rounded-2xl border border-border bg-card/80 p-3">
                    <CommentBody
                      comment={reply}
                      isEditing={editingId === reply.id}
                      editingDraft={editingDraft}
                      onEditingDraftChange={setEditingDraft}
                      onEdit={() => startEdit(reply)}
                      onCancelEdit={cancelEdit}
                      onSaveEdit={() => saveEdit(reply.id)}
                      onDelete={() => deleteComment(reply.id)}
                      hideReply
                    />
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function CommentBody({
  comment,
  isEditing,
  editingDraft,
  onEditingDraftChange,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onReply,
  hideReply = false,
}: {
  comment: WorkComment
  isEditing: boolean
  editingDraft: string
  onEditingDraftChange: (value: string) => void
  onEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: () => void
  onReply?: () => void
  hideReply?: boolean
}) {
  const canManage = comment.authorName === "나"

  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-foreground">{comment.authorName}</p>
          {comment.parentId && <span className="text-[10px] text-muted-foreground">답글</span>}
        </div>
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editingDraft}
              onChange={(event) => onEditingDraftChange(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
              className="min-h-[72px] bg-input"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{editingDraft.length}/{MAX_COMMENT_LENGTH}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={onCancelEdit}>
                  취소
                </Button>
                <Button type="button" size="sm" onClick={onSaveEdit} disabled={!editingDraft.trim()}>
                  저장
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{comment.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span>{comment.createdAt}</span>
              {comment.updatedAt && <span>수정됨</span>}
            </div>
            {!hideReply && (
              <button
                type="button"
                onClick={onReply}
                className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <MessageCircle className="h-3 w-3" />
                답글
              </button>
            )}
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canManage && !isEditing && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="댓글 수정"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        )}
        {isEditing ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="수정 취소"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : canManage ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full p-1.5 text-red-600 hover:bg-red-500/10 dark:text-red-300 dark:hover:text-red-100"
            aria-label="댓글 삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

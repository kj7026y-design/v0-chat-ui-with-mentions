import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { InstagramCommandContent } from "../components/chat/command-content/instagram-command-content"
import { buildSnsCommandContent } from "../lib/chat-commands/instagram"

const posts = {
  dailyPost: {
    image: "창가에 놓인 커피와 접힌 신문 사진",
    caption: "조용히 하루를 시작한다.",
    likes: 142,
    comments: [
      { nickname: "민지", elapsedTime: "8분", content: "오늘은 일찍 시작했네", isReply: false },
      { nickname: "east yeon", elapsedTime: "2시간", content: "커피 맛있어 보여", isReply: false },
      { nickname: "준호 (j._.h)", elapsedTime: "24초", content: "신문 아직도 보는구나", isReply: false },
    ],
  },
  userPost: {
    image: "나란히 놓인 머그잔 두 개 사진",
    caption: "한 자리는 비워 두었다.",
    likes: 135,
    comments: [
      { nickname: "https://instagram.com/d0y00n/", elapsedTime: "30분", content: "누구 자리야", isReply: false },
      { nickname: "chloe.park", elapsedTime: "10초", content: "뭔가 시작됐구만", isReply: false },
      { nickname: "min_seo_i", elapsedTime: "5초", content: "누군지는 모르겠지만 대단한데", isReply: false },
      { nickname: "kang.th", elapsedTime: "1초", content: "@chloe.park_ 안 무서워, 오히려 좋아할 걸.", isReply: true },
      { nickname: "🍀최하린🍀", elapsedTime: "5일", content: "사진 분위기 좋다", isReply: false },
      { nickname: "---", elapsedTime: "1분", content: "곧 갈게.", isReply: false },
    ],
  },
}

test("SNS command repairs malformed AI nicknames instead of failing the whole response", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    result: JSON.stringify(posts),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })

  try {
    const content = await buildSnsCommandContent("강태현")

    assert.match(content, /nickname="minji"/u)
    assert.match(content, /nickname="east\.yeon"/u)
    assert.match(content, /nickname="j\._\.h"/u)
    assert.match(content, /nickname="d0y00n"/u)
    assert.match(content, /nickname="choiharin"/u)
    assert.match(content, /nickname="user\.[a-z0-9]{6}"/u)
    const chloeCommentIndex = content.indexOf('nickname="chloe.park"')
    const replyIndex = content.indexOf('nickname="kang.th"')
    const minSeoCommentIndex = content.indexOf('nickname="min_seo_i"')
    assert.ok(chloeCommentIndex < replyIndex)
    assert.ok(replyIndex < minSeoCommentIndex)
    assert.match(content, /nickname="kang\.th"[^>]*reply="true" reply-to="chloe\.park"/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Instagram renderer places a mentioned reply directly below its target comment", () => {
  const content = [
    "<ig>",
    "<ig-post>",
    '<ig-comment nickname="chloe.park" time="10초" reply="false">target-comment</ig-comment>',
    '<ig-comment nickname="min_seo_i" time="5초" reply="false">next-comment</ig-comment>',
    '<ig-comment nickname="kang.th" time="1초" reply="true">@chloe.park_ reply-comment</ig-comment>',
    "</ig-post>",
    "</ig>",
  ].join("\n")
  const html = renderToStaticMarkup(createElement(InstagramCommandContent, {
    content,
    textColor: "#111111",
    mutedTextColor: "#777777",
  }))

  assert.ok(html.indexOf("target-comment") < html.indexOf("reply-comment"))
  assert.ok(html.indexOf("reply-comment") < html.indexOf("next-comment"))
})

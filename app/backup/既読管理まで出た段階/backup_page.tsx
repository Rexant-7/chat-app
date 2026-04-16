"use client";

import { Istok_Web } from "next/font/google";
import { use, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  content: string;
  userId: string;
  roomId: string;
  createdAt: string;
  isRead: boolean;
  user: {
    name: string;
  };
};

export default function Home() {
  const [content, setContent] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendUserId, setSendUserId] = useState("user1"); // ←送信者切替用

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const myUserId = "user1"; //表示用

  //メッセージ
  const fetchMessages = async () => {
    const res = await fetch("/api/messages?viewerId=${myUserId}");
    const data = await res.json();
    console.log(data); // 既読確認用

    // 時系列で並べる
    const sorted = data.sort(
      (a: Message, b: Message) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    setMessages(sorted);
  };

  const sendMessage = async () => {
    if (!content.trim()) return;

    await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        userId: sendUserId,
        roomId: "room1",
      }),
    });

    setContent("");
    fetchMessages();
  };

  // 日付表示フォーマット
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString("ja-JP");
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // リアルタイム更新
  useEffect(() => {
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>チャット</h1>

      {/* ユーザー切り替え */}
      <select
        value={sendUserId}
        onChange={(e) => setSendUserId(e.target.value)}
        style={{ marginBottom: "10px" }}
      >
        <option value="user1">自分として送る</option>
        <option value="user2">相手として送る</option>
      </select>

      {/* メッセージ */}
      <div
        style={{
          border: "1px solid #ccc",
          height: "400px",
          overflowY: "scroll",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        {messages.map((msg) => {
          const myUserId = "user1"; // ←固定
          const isMe = msg.userId === myUserId;

          return (
            <div key={msg.id} style={{ marginBottom: "10px" }}>
              {/* 名前 */}
              <div
                style={{
                  fontSize: "12px",
                  textAlign: isMe ? "right" : "left",
                }}
              >
                {msg.user.name}
              </div>

              {/* 吹き出し */}
              <div
                style={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    background: isMe ? "#4ade80" : "#e5e7eb",
                    padding: "10px",
                    borderRadius: "10px",
                    maxWidth: "60%",
                  }}
                >
                  {msg.content}
                </div>
              </div>
              {/*既読表示*/}
              {isMe && (
                <div
                  style={{
                    fontSize: "10px",
                    textAlign: "right",
                    opacity: 0.6,
                  }}
                >
                  {msg.isRead ? "既読" : "未読"}
                </div>
              )}
              {/*送信日時表示*/}
              <div
                style={{
                  fontSize: "10px",
                  textAlign: isMe ? "right" : "left",
                  opacity: 0.6,
                }}
              >
                {formatTime(msg.createdAt)}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力 */}
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="メッセージ入力"
          style={{ flex: 1, padding: "8px" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button onClick={sendMessage}>送信</button>
      </div>
    </div>
  );
}

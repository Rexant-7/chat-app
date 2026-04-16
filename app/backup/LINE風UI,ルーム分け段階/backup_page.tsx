"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  isRead: boolean;
  user: {
    name: string;
  };
};

export default function Home() {
  const [content, setContent] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState("room1");
  // ログインユーザー（本体）
  const [myUserId, setMyUserId] = useState("user1");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ======================
  // ログイン保持
  // ======================
  useEffect(() => {
    const saved = localStorage.getItem("myUserId");
    if (saved) setMyUserId(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("myUserId", myUserId);
  }, [myUserId]);

  // ======================
  // メッセージ取得
  // ======================
  const fetchMessages = async () => {
    const res = await fetch(
      `/api/messages?viewerId=${myUserId}&roomId=${currentRoomId}`,
    );
    const data = await res.json();

    const sorted = data.sort(
      (a: Message, b: Message) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    setMessages(sorted);
  };

  // ======================
  // 送信
  // ======================
  const sendMessage = async () => {
    if (!content.trim()) return;

    await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        userId: myUserId, // ここが重要（ログインユーザーで固定）
        roomId: currentRoomId,
      }),
    });

    setContent("");
    fetchMessages();
  };

  // 時間
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ======================
  // 初期 & リアルタイム
  // ======================
  useEffect(() => {
    fetchMessages();

    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [currentRoomId, myUserId]);

  // useEffect(() => {
  //   const interval = setInterval(fetchMessages, 2000);
  //   return () => clearInterval(interval);
  // }, [myUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ======================
  // UI
  // ======================
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* ===== ルーム ===== */}
      <div className="p-3 bg-white shadow">
        <h2 className="text-sm text-gray-500 mb-2">ルーム</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentRoomId("room1")}
            className={`px-3 py-1 rounded-full text-sm ${
              currentRoomId === "room1"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            ルーム1
          </button>

          <button
            onClick={() => setCurrentRoomId("room2")}
            className={`px-3 py-1 rounded-full text-sm ${
              currentRoomId === "room2"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            ルーム2
          </button>
        </div>
      </div>

      {/* ===== ヘッダー ===== */}
      <div className="p-3 bg-white border-b flex justify-between items-center">
        <h1 className="font-bold">チャット ({currentRoomId})</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setMyUserId("user1")}
            className={`px-3 py-1 rounded ${
              myUserId === "user1" ? "bg-green-400 text-white" : "bg-gray-200"
            }`}
          >
            user1
          </button>

          <button
            onClick={() => setMyUserId("user2")}
            className={`px-3 py-1 rounded ${
              myUserId === "user2" ? "bg-green-400 text-white" : "bg-gray-200"
            }`}
          >
            user2
          </button>
        </div>
      </div>

      {/* ===== メッセージ ===== */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.userId === myUserId;

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[60%]">
                {/* 名前 */}
                <div
                  className={`text-xs mb-1 ${
                    isMe ? "text-right" : "text-left"
                  } text-gray-500`}
                >
                  {msg.user.name}
                </div>

                {/* 吹き出し */}
                <div
                  className={`px-4 py-2 rounded-2xl shadow ${
                    isMe
                      ? "bg-green-400 text-white rounded-br-none"
                      : "bg-white rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>

                {/* 時間 & 既読 */}
                <div
                  className={`text-[10px] mt-1 ${
                    isMe ? "text-right" : "text-left"
                  } text-gray-400`}
                >
                  {formatTime(msg.createdAt)}
                  {isMe && (msg.isRead ? " 既読" : " 未読")}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ===== 入力 ===== */}
      <div className="p-3 bg-white flex gap-2 border-t">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="       メッセージを入力してください。"
          className="flex-1 border rounded-full px-4 py-2 outline-none"
        />
        <button
          onClick={sendMessage}
          className="bg-green-400 text-white px-4 rounded-full"
        >
          送信
        </button>
      </div>
    </div>
  );
}

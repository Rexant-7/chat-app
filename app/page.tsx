"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { io } from "socket.io-client";

const socket = io();

//Roomの型
type Room = {
  id: string;
  name: string;
  messages: Message[];
  unreadCount: number;
  users: {
    userId: string;
    user: {
      name: string;
      image: string;
    };
  }[];
};
//Messageの型
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
  const { data: session, status } = useSession();
  const [content, setContent] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState("room1");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const myUserId = session?.user?.id;

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ======================
  // 既読管理
  // ======================
  const markAsRead = async () => {
    if (!myUserId) return;

    await fetch("/api/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId: currentRoomId,
        userId: myUserId,
      }),
    });
  };

  // ======================
  // ユーザー取得
  // ======================
  // const fetchUsers = async () => {
  //   const res = await fetch("/api/users");
  //   const data = await res.json();

  //   setUsers(data);
  // };

  // ======================
  // 全ユーザー取得
  // ======================
  const fetchAllUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setAllUsers(data);
  };

  // ======================
  // ルーム取得
  // ======================
  const fetchRooms = async () => {
    if (!myUserId) return;
    const res = await fetch(`/api/rooms?userId=${myUserId}`);
    const data: Room[] = await res.json();

    setRooms(
      data
        .map((room) => ({
          ...room,
          unreadCount: 0,
        }))
        .sort((a, b) => {
          const aTime = a.messages.at(-1)?.createdAt || 0;
          const bTime = b.messages.at(-1)?.createdAt || 0;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        }),
    );
    if (data.length > 0 && !currentRoomId) {
      setCurrentRoomId(data[0].id);
    }
  };

  // ======================
  // 友達一覧判定
  // ======================
  const fetchFriends = async () => {
    if (!myUserId) return;

    const res = await fetch(`/api/friends/list?userId=${myUserId}`);
    const data = await res.json();

    // 友達一覧（表示用）
    setUsers(data.map((f: any) => f.friend));

    // 👇 これ追加（判定用）
    setFriendIds(data.map((f: any) => f.friendId));
  };

  // ======================
  // 友達追加
  // ======================
  const addFriend = async (friendId: string) => {
    if (!myUserId) return;

    await fetch("/api/friends", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: myUserId,
        friendId,
      }),
    });
    setFriendIds((prev) => [...prev, friendId]);
    fetchFriends();
    alert("追加した！");
  };

  // ======================
  // DM作成
  // ======================
  const startDM = async (targetUserId: string) => {
    const res = await fetch("/api/rooms/create-or-get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        myUserId,
        targetUserId,
      }),
    });

    const room = await res.json();

    setCurrentRoomId(room.id);
    fetchRooms();
  };

  // ======================
  // メッセージ取得
  // ======================
  const fetchMessages = async () => {
    if (!myUserId) return;
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
    if (!myUserId) return;
    if (!content.trim()) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        userId: myUserId,
        roomId: currentRoomId,
      }),
    });

    const savedMsg = await res.json();
    socket.emit("send_message", savedMsg);
    setContent("");
    fetchMessages();
  };

  // ======================
  // ルーム削除
  // ======================
  const deleteRoom = async (roomId: string) => {
    const ok = confirm("このトークを削除しますか？");
    if (!ok) return;

    await fetch("/api/rooms", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomId }),
    });

    fetchRooms(); // 再取得

    // 削除したルームを見てた場合
    if (currentRoomId === roomId) {
      setCurrentRoomId("");
      setMessages([]);
    }
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
  // useEffect(() => {
  //   if (!myUserId) return;
  //   fetchRooms();
  //   fetchUsers();
  // }, [myUserId]);
  const openUserModal = () => {
    setShowUserModal(true);
    fetchAllUsers();
  };
  useEffect(() => {
    if (!myUserId) return;
    fetchRooms();
    fetchMessages();
    fetchFriends();
  }, [currentRoomId, myUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  useEffect(() => {
    if (currentRoomId && myUserId) {
      markAsRead();

      setRooms((prev) =>
        prev.map((r) =>
          r.id === currentRoomId ? { ...r, unreadCount: 0 } : r,
        ),
      );
    }
  }, [currentRoomId, myUserId]);

  useEffect(() => {
    const handler = (msg: Message & { roomId: string }) => {
      // チャット画面更新
      if (msg.roomId === currentRoomId) {
        setMessages((prev) => [...prev, msg]);
      }
      // トーク一覧更新
      setRooms((prevRooms) => {
        const updated = prevRooms.map((room) => {
          if (room.id !== msg.roomId) return room;

          const isMine = msg.userId === myUserId;

          return {
            ...room,
            messages: [...room.messages.slice(-20), msg],
            unreadCount: isMine ? room.unreadCount : room.unreadCount + 1,
          };
        });
        // 最新トークを上に
        return updated.sort((a, b) => {
          const aTime = a.messages.at(-1)?.createdAt || 0;
          const bTime = b.messages.at(-1)?.createdAt || 0;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
      });
    };

    socket.on("receive_message", handler);

    return () => {
      socket.off("receive_message", handler);
    };
  }, [currentRoomId, , myUserId]);

  useEffect(() => {
    if (!currentRoomId) return;

    socket.emit("join_room", currentRoomId);
  }, [currentRoomId]);
  // ======================
  // UI
  // ======================
  {
    /* =====ロード画面===== */
  }
  if (status === "loading") return null;
  {
    /* ===== ログイン画面 ===== */
  }
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <button
          onClick={() => signIn("google")}
          className="bg-blue-500 text-white px-6 py-3 rounded"
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  let lastDate = "";
  return (
    <div className="flex h-screen bg-gray-100">
      {/* ===== ユーザー一覧 ===== */}
      <div className="hidden md:block w-1/4 bg-white border-r overflow-y-auto">
        <h2 className="p-4 font-bold border-b">ユーザー</h2>
        <button onClick={openUserModal} className="text-xl font-bold">
          ＋
        </button>
        {users
          .filter((u) => u.id !== myUserId)
          .map((user) => {
            const isFriend = friendIds.includes(user.id);

            return (
              <div
                key={user.id}
                className="flex justify-between items-center p-3 border-b"
              >
                <span>{user.name}</span>

                {isFriend ? (
                  <span className="text-sm text-gray-400">追加済み</span>
                ) : (
                  <button
                    onClick={() => addFriend(user.id)}
                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    追加
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {/* ===== トーク一覧 ===== */}
      <div
        className={`${currentRoomId ? "hidden md:block" : "block"} w-full md:w-1/4 bg-white border-r overflow-y-auto`}
      >
        <div className="p-4 font-bold border-b flex justify-between items-center">
          <span>トーク</span>

          {/* スマホだけ表示 */}
          <button
            onClick={() => setShowUserModal(true)}
            className="md:hidden text-xl font-bold"
          >
            ＋
          </button>
        </div>
        {showUserModal && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowUserModal(false)}
          >
            <div
              className="bg-white w-[90%] max-h-[70%] rounded-lg overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="p-4 border-b flex justify-between">
                <span className="font-bold">ユーザー追加</span>
                <button onClick={() => setShowUserModal(false)}>✕</button>
              </div>

              {/* ユーザー一覧 */}
              {allUsers
                .filter((u) => u.id !== myUserId)
                .map((user) => {
                  const isFriend = friendIds.includes(user.id);

                  return (
                    <div
                      key={user.id}
                      className="flex justify-between p-4 border-b"
                    >
                      <span>{user.name}</span>

                      {isFriend ? (
                        <span className="text-gray-400 text-sm">追加済み</span>
                      ) : (
                        <button
                          onClick={() => addFriend(user.id)}
                          className="bg-blue-500 text-white px-3 py-1 rounded"
                        >
                          追加
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        {rooms.length === 0 && (
          <div className="p-6 text-center text-gray-400">
            トークがありません
            <br />
            ユーザーを選んで開始しよう
          </div>
        )}

        {rooms.map((room) => {
          const lastMessage = room.messages?.[room.messages.length - 1];
          const otherUser = room.users.find((u) => u.userId !== myUserId);
          const unreadCount = room.unreadCount;

          return (
            <div
              key={room.id}
              onClick={() => {
                setCurrentRoomId(room.id);
              }}
              className={`p-4 cursor-pointer border-b hover:bg-gray-100 ${
                currentRoomId === room.id
                  ? "bg-green-100 border-l-4 border-green-500"
                  : "hover:bg-gray-100 transition"
              }`}
            >
              <div className="flex items-center justify-between">
                {/* 左：アイコン＋名前 */}
                <div className="flex items-center gap-2">
                  <Image
                    src={otherUser?.user.image || "/default.png"}
                    alt="icon"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-medium">
                    {otherUser?.user.name || "不明ユーザー"}
                  </span>
                </div>

                {/* 右：時刻＋削除 */}
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 w-12 text-right">
                    {lastMessage ? formatTime(lastMessage.createdAt) : ""}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRoom(room.id);
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
              </div>

              <div
                className={`text-sm truncate ${
                  unreadCount > 0 ? "text-black font-semibold" : "text-gray-500"
                }`}
              >
                {lastMessage?.content || "メッセージなし"}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== チャット ===== */}
      <div className={`${!currentRoomId ? "hidden md:flex" : "flex"} flex-1`}>
        <div className="flex flex-col flex-1">
          {/* ヘッダー */}
          <div className="p-4 bg-white border-b flex items-center">
            <button
              onClick={() => setCurrentRoomId("")}
              className="mr-2 text-sm text-gray-500 md:hidden"
            >
              ←
            </button>
            <h1 className="font-bold text-lg">
              {rooms
                .find((r) => r.id === currentRoomId)
                ?.users.find((u) => u.userId !== myUserId)?.user.name ||
                "チャット"}
            </h1>{" "}
          </div>
          {!currentRoomId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              トークを選択してください
            </div>
          ) : (
            <>
              {/* メッセージ */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.userId === myUserId;

                  const date = new Date(msg.createdAt).toDateString();
                  const showDate = date !== lastDate;
                  lastDate = date;

                  const myMessages = messages.filter(
                    (m) => m.userId === myUserId,
                  );
                  const lastMyMessage = myMessages[myMessages.length - 1];

                  return (
                    <div key={msg.id}>
                      {/* 日付（ここ重要） */}
                      {showDate && (
                        <div className="text-center text-xs text-gray-400 my-2">
                          {date}
                        </div>
                      )}

                      {/* メッセージ */}
                      <div
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div className="max-w-[70%]">
                          <div
                            className={`text-xs mb-1 ${
                              isMe ? "text-right" : "text-left"
                            } text-gray-500`}
                          >
                            {msg.user.name}
                          </div>

                          <div
                            className={`px-4 py-2 rounded-2xl shadow text-sm leading-relaxed whitespace-pre-wrap break-words
              ${
                isMe
                  ? "bg-green-400 text-white rounded-br-none"
                  : "bg-white rounded-bl-none"
              }`}
                          >
                            {msg.content}
                          </div>

                          <div
                            className={`text-[10px] mt-1 ${
                              isMe ? "text-right" : "text-left"
                            } text-gray-400`}
                          >
                            {formatTime(msg.createdAt)}
                            {isMe && msg.id === lastMyMessage?.id && (
                              <span className="ml-1 text-grey-400">
                                {msg.isRead ? "既読" : "未読"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </>
          )}

          {/* 入力 */}
          <div className="p-3 bg-white flex gap-2 border-t sticky bottom-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
              placeholder="メッセージを入力"
              className="flex-1 border rounded-2xl px-4 py-2 outline-none resize-none"
              rows={1}
            />
            <button
              onClick={sendMessage}
              className="bg-green-400 text-white px-4 rounded-full"
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

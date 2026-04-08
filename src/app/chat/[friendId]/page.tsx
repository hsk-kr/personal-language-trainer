import { getFriendById, friends } from "@/lib/friends";
import { VoiceChat } from "@/components/VoiceChat";
import Link from "next/link";
import { notFound } from "next/navigation";

interface ChatPageProps {
  params: Promise<{ friendId: string }>;
}

export function generateStaticParams() {
  return friends.map((f) => ({ friendId: f.id }));
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { friendId } = await params;
  const friend = getFriendById(friendId);

  if (!friend) {
    notFound();
  }

  return (
    <main className="flex h-screen flex-col bg-neutral-950">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-white/5 bg-neutral-900/80 px-4 py-3 backdrop-blur-sm">
        <Link
          href="/"
          className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{friend.emoji}</span>
          <div>
            <h1 className="text-sm font-semibold text-white">{friend.name}</h1>
            <p className="text-xs text-neutral-400">{friend.tagline}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-neutral-500">Online</span>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <VoiceChat friend={friend} />
      </div>
    </main>
  );
}

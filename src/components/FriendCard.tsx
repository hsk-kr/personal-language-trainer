"use client";

import { Friend } from "@/types";
import Link from "next/link";

interface FriendCardProps {
  readonly friend: Friend;
}

export function FriendCard({ friend }: FriendCardProps) {
  return (
    <Link href={`/chat/${friend.id}`}>
      <div
        className={`group relative overflow-hidden rounded-2xl border border-white/10 ${friend.bgColor} p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:shadow-2xl cursor-pointer`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${friend.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10`}
        />
        <div className="relative">
          <div className="mb-4 text-5xl">{friend.emoji}</div>
          <h3 className="mb-1 text-xl font-bold text-white">{friend.name}</h3>
          <p
            className={`mb-3 text-sm font-medium bg-gradient-to-r ${friend.gradient} bg-clip-text text-transparent`}
          >
            {friend.tagline}
          </p>
          <p className="text-sm leading-relaxed text-neutral-400">
            {friend.description}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500 transition-colors group-hover:text-neutral-300">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Online — tap to chat
        </div>
      </div>
    </Link>
  );
}

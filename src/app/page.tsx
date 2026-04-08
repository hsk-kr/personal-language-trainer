import { friends } from "@/lib/friends";
import { FriendCard } from "@/components/FriendCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold text-white">
            Hey, who do you wanna talk to?
          </h1>
          <p className="text-neutral-400">
            Pick a friend. They&apos;re all online and ready to chat.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {friends.map((friend) => (
            <FriendCard key={friend.id} friend={friend} />
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-neutral-600">
          Powered by Groq. Your conversations are not stored on any server.
        </p>
      </div>
    </main>
  );
}

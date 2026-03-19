import SnakeGame from "@/components/SnakeGame";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(168,85,247,0.1),transparent_40%)]" />
      <div className="relative z-10">
        <SnakeGame />
      </div>
    </main>
  );
}

import SnakeGame from "@/components/SnakeGame";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#020617] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(168,85,247,0.1),transparent_40%)]" />
      <div className="relative z-10 w-full flex justify-center">
        <SnakeGame />
      </div>
      <div className="absolute bottom-4 left-0 right-0 z-[100] text-center pointer-events-none">
        <p className="text-white/40 text-sm font-bold tracking-widest drop-shadow-md">
           Author: BaoDiep - 2026 &nbsp;·&nbsp; v2.0.1
        </p>
      </div>
    </main>
  );
}

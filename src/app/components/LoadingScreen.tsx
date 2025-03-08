// components/LoadingScreen.tsx
export default function LoadingScreen() {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <h1 className="text-6xl font-bold text-white mb-16">Loading</h1>
        <div className="animate-pulse">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 3L4 14H12L11 21L20 10H12L13 3Z" fill="#FFD700" />
          </svg>
        </div>
      </div>
    );
  }
  
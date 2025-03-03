import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default function GamePage() {
    const session = auth();
    const userId = (session as any).userId;
    

  
  
  
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-yellow-400 mb-8">Banana Puzzle Game</h1>
      <p className="text-gray-300">Game content will go here</p>
    </div>
  );
}

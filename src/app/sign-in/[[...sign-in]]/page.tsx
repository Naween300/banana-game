import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-yellow-400">Banana Game</h1>
          <p className="mt-2 text-gray-300">Sign in to continue your puzzle adventure</p>
        </div>
        <SignIn appearance={{
          elements: {
            formButtonPrimary: 'bg-yellow-500 hover:bg-yellow-600 text-black',
            card: 'bg-transparent shadow-none',
            headerTitle: 'text-yellow-400',
            headerSubtitle: 'text-gray-300',
          }
        }} />
      </div>
    </div>
  );
}

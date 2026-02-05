export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-5xl font-bold mb-6">Welcome to Your App</h1>
      <p className="text-xl mb-8">This is the public homepage.</p>
      <a 
        href="/internal" 
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Go to Internal Area →
      </a>
    </div>
  );
}
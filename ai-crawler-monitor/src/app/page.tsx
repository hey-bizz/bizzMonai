import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans flex items-center justify-center min-h-screen p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">AI Crawler Monitor</h1>
        <p className="text-gray-600 mb-8">
          Monitor and analyze AI bot traffic on your websites
        </p>
        <Link
          href="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
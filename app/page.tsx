export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
        Gaithersburg Plumbing Help
      </h1>

      <p className="text-lg text-gray-600 mb-8 text-center max-w-xl">
        Answer a few quick questions and get matched with trusted local plumbers
        — transparent pricing, no surprises.
      </p>

      <a
        href="/diagnostic"
        className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
      >
        Start Plumbing Diagnostic
      </a>
    </main>
  );
}

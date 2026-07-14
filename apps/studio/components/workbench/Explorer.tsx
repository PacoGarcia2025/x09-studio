export default function Explorer() {
  return (
    <div className="space-y-6">

      <h2 className="text-3xl font-bold text-white">
        Explorer
      </h2>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <div className="space-y-2 font-mono text-sm">

          <div>📁 src</div>

          <div className="ml-6">📁 app</div>
          <div className="ml-12">page.tsx</div>
          <div className="ml-12">layout.tsx</div>

          <div className="ml-6">📁 components</div>
          <div className="ml-12">Button.tsx</div>
          <div className="ml-12">Card.tsx</div>

          <div className="ml-6">package.json</div>

        </div>

      </div>

    </div>
  );
}
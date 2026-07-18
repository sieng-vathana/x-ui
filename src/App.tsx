import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex items-center gap-8">
        <a
          href="https://vite.dev"
          target="_blank"
          rel="noreferrer"
          className="transition-transform hover:scale-110"
        >
          <img src={viteLogo} className="h-20 w-20" alt="Vite logo" />
        </a>
        <a
          href="https://react.dev"
          target="_blank"
          rel="noreferrer"
          className="transition-transform hover:scale-110"
        >
          <img
            src={reactLogo}
            className="h-20 w-20 animate-[spin_20s_linear_infinite]"
            alt="React logo"
          />
        </a>
      </div>

      <h1 className="mt-10 text-4xl font-semibold tracking-tight sm:text-5xl">
        Vyntra UI
      </h1>
      <p className="mt-3 max-w-md text-center text-zinc-600 dark:text-zinc-400">
        React + TypeScript + Tailwind CSS starter. Edit{' '}
        <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
          src/App.tsx
        </code>{' '}
        and save to test HMR.
      </p>

      <button
        type="button"
        onClick={() => setCount((value) => value + 1)}
        className="mt-8 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
      >
        Count is {count}
      </button>

      <p className="mt-10 text-sm text-zinc-500 dark:text-zinc-500">
        Click the logos to learn more about Vite and React.
      </p>
    </div>
  )
}

export default App

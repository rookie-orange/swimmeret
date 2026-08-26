import { useState } from 'react'
import { Button } from '@/components/ui/button'

function App() {
  const [started, setStarted] = useState(false)

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <div
        data-tauri-drag-region
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-50 h-10 select-none"
      />
      <section className="flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-background px-4 py-6 sm:gap-7 sm:px-6 sm:py-8 md:gap-8 md:py-10">
        <h1 className="text-5xl leading-none font-medium tracking-normal text-foreground sm:text-6xl md:text-7xl">
          swimmeret
        </h1>
        <Button variant="default" size="lg" onClick={() => setStarted(true)}>
          {started ? '准备好了' : '开始使用'}
        </Button>
      </section>
    </main>
  )
}

export default App

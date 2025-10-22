'use client'

import { useState } from 'react'
import Chat from '@/components/Chat'
import ProjectFilter from '@/components/ProjectFilter'

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  return (
    <main className="flex h-screen">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4">
        <h1 className="text-2xl font-bold mb-6 text-primary">shainAI</h1>
        <ProjectFilter
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
        />
      </aside>
      <div className="flex-1 flex flex-col">
        <Chat project={selectedProject} />
      </div>
    </main>
  )
}

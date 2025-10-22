'use client'

interface ProjectFilterProps {
  selectedProject: string | null
  onSelectProject: (project: string | null) => void
}

export default function ProjectFilter({ selectedProject, onSelectProject }: ProjectFilterProps) {
  const projects = [
    'pomodoroflow',
    'shainai',
    'prompt2story',
  ]

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 mb-3">PROJECTS</h3>
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onSelectProject(null)}
            className={`w-full text-left px-3 py-2 rounded ${
              selectedProject === null
                ? 'bg-primary text-white'
                : 'hover:bg-gray-800'
            }`}
          >
            All Projects
          </button>
        </li>
        {projects.map((project) => (
          <li key={project}>
            <button
              onClick={() => onSelectProject(project)}
              className={`w-full text-left px-3 py-2 rounded ${
                selectedProject === project
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-800'
              }`}
            >
              {project}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

import VisualCard from './VisualCard'

type PostStatus = 'sin_revisar' | 'por_revisar' | 'colgado' | 'no_me_gusta'

interface Post {
  id: string
  type: string
  content: string
  status: PostStatus
  date: string
}

interface Props {
  post: Post
  onStatusChange: (id: string, newStatus: PostStatus) => void
}

const STATUS_STYLES: Record<PostStatus, string> = {
  sin_revisar: '',
  por_revisar: 'border-l-4 border-yellow-400',
  colgado: 'border-l-4 border-green-500',
  no_me_gusta: 'border-l-4 border-red-500 opacity-60',
}

const STATUS_LABELS: Record<PostStatus, string> = {
  sin_revisar: '',
  por_revisar: '🕐 Por revisar',
  colgado: '✓ Colgado',
  no_me_gusta: '✕ No me gusta',
}

const ACTIONS: { status: PostStatus; label: string; activeClass: string; hoverClass: string }[] = [
  {
    status: 'por_revisar',
    label: 'Por revisar',
    activeClass: 'bg-yellow-400 text-white',
    hoverClass: 'hover:bg-yellow-100 hover:text-yellow-700',
  },
  {
    status: 'colgado',
    label: '✓ Colgado',
    activeClass: 'bg-green-500 text-white',
    hoverClass: 'hover:bg-green-100 hover:text-green-700',
  },
  {
    status: 'no_me_gusta',
    label: '✕ No me gusta',
    activeClass: 'bg-red-500 text-white',
    hoverClass: 'hover:bg-red-100 hover:text-red-700',
  },
]

export default function PostCard({ post, onStatusChange }: Props) {
  function handleAction(status: PostStatus) {
    // Toggle: if already active, reset to sin_revisar
    const next: PostStatus = post.status === status ? 'sin_revisar' : status
    onStatusChange(post.id, next)
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-finomik-gray-light overflow-hidden ${STATUS_STYLES[post.status]}`}>
      {/* Visual card */}
      <div className="px-6 py-5">
        <VisualCard type={post.type} content={post.content} />
      </div>

      {/* Status action buttons */}
      <div className="px-6 pb-4 flex gap-2">
        {ACTIONS.map(action => (
          <button
            key={action.status}
            onClick={() => handleAction(action.status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
              post.status === action.status
                ? action.activeClass + ' border-transparent'
                : 'bg-white text-finomik-gray border-finomik-gray-light ' + action.hoverClass
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

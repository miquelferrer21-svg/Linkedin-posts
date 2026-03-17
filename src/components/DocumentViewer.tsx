import ReactMarkdown from 'react-markdown'

interface Props {
  content: string
}

export default function DocumentViewer({ content }: Props) {
  return (
    <div className="prose prose-sm max-w-none text-gray-800
      prose-headings:text-finomik-blue prose-headings:font-extrabold
      prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
      prose-strong:text-finomik-blue
      prose-hr:border-finomik-gray-light
      prose-li:marker:text-finomik-blue-light
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

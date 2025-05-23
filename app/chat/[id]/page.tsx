// Simple static chat page for export compatibility

export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Chat Page</h1>
      <p>Chat ID: {params.id}</p>
      <p className="mt-4">
        <a href={`/chat-by-id?id=${params.id}`} className="text-blue-500 underline">
          Go to functional chat page
        </a>
      </p>
    </div>
  );
}

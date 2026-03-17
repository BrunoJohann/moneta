import { ChatInterface } from '@/components/chat/chat-interface';

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
        <p className="text-muted-foreground">Converse com a Moneta sobre suas finanças</p>
      </div>
      <ChatInterface />
    </div>
  );
}

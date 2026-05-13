import { motion } from 'framer-motion';
import { ChatMessage } from '@/types';
import ReactMarkdown from 'react-markdown';

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  
  const attachment = message.attachment;
  const isLegacyFileMessage = message.content.startsWith('[Dosya:');

  // Strip technical prefix for display
  let cleanContent = message.content;
  if (isLegacyFileMessage) {
    const endBracket = cleanContent.indexOf(']');
    if (endBracket !== -1) {
      cleanContent = cleanContent.slice(endBracket + 1).trim();
    }
  }

  const renderContent = () => {
    // 1. Modern Attachment (Source of Truth)
    if (attachment) {
      const attachmentType = attachment.type || 'application/octet-stream';
      const extension =
        attachment.name?.split('.').pop()?.toUpperCase() ||
        attachmentType.split('/').pop()?.toUpperCase() ||
        'DOSYA';

      const isImage =
        attachmentType.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(attachment.name || '');

      const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${attachment.bucket}/${attachment.path}`;

      const attachmentNode = isImage ? (
        <div className="flex flex-col gap-2">
          <div className="rounded-xl overflow-hidden border border-border bg-muted shadow-inner">
            <img
              src={publicUrl}
              alt={attachment.name || 'Görsel'}
              className="max-w-full sm:max-w-[240px] h-auto object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
          <span className="text-[10px] truncate opacity-60 px-1">{attachment.name || 'İsimsiz Görsel'}</span>
        </div>
      ) : (
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${
          isUser 
            ? 'bg-primary/20 border-primary/30 text-primary-foreground hover:bg-primary/30' 
            : 'bg-card border-border text-foreground hover:border-muted shadow-sm'
        }`}>
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-neutral-200/20 flex items-center justify-center text-xl">
            📎
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate max-w-[180px]">{attachment.name || 'İsimsiz Dosya'}</span>
            <span className="text-[10px] opacity-60 uppercase tracking-wider">
              {((attachment.size || 0) / 1024).toFixed(1)} KB • {extension}
            </span>
          </div>
        </div>
      );

      return (
        <div className="flex flex-col gap-2">
          {attachmentNode}
          {cleanContent && (
            <p className="text-sm whitespace-pre-wrap mt-1">{cleanContent}</p>
          )}
        </div>
      );
    }

    // 2. Legacy Fallback (String parsing)
    if (isLegacyFileMessage) {
      const fileName = message.content
        .replace('[Dosya:', '')
        .split(']')[0]
        .trim();
      
      return (
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors ${
          isUser 
            ? 'bg-primary/30 border-primary/40 text-primary-foreground hover:bg-primary/40' 
            : 'bg-card border-border text-foreground hover:border-muted shadow-sm'
        }`}>
          <span className="text-xl">📎</span>
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate max-w-[180px]">{fileName}</span>
            <span className={`text-[10px] uppercase opacity-60`}>Eski Kayıt</span>
          </div>
        </div>
      );
    }

    if (isUser) {
      return <p className="text-sm whitespace-pre-wrap">{cleanContent}</p>;
    }

    return (
      <div className="text-sm prose prose-sm prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            code: ({ children }) => (
              <code className="bg-neutral-200 px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted text-foreground rounded-bl-none'
        }`}
      >
        {renderContent()}
        <p className={`text-[10px] mt-1 text-right font-medium opacity-70 ${isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
          {new Date(message.createdAt).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, SuggestedTransaction } from '@/types';
import ChatBubble from './ChatBubble';
import TransactionSuggestion from './TransactionSuggestion';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string, options?: { file?: File }) => void;
  onAcceptTransaction: (transaction: SuggestedTransaction) => void;
}

export default function ChatInterface({
  messages,
  isLoading,
  onSendMessage,
  onAcceptTransaction,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const renderMessages = messages.map((msg, index) => {
    const rawId = typeof msg.id === 'string' ? msg.id.trim() : '';
    const timestamp =
      msg.createdAt instanceof Date
        ? msg.createdAt.getTime()
        : msg.createdAt
        ? new Date(msg.createdAt).getTime()
        : 0;

    return {
      ...msg,
      __renderKey: rawId || `msg-${index}-${timestamp || index}`,
    };
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if ((input.trim() || selectedFile) && !isLoading) {
      const trimmedInput = input.trim();
      
      let defaultQuery = '';
      if (selectedFile && !trimmedInput) {
        const isFindeks = selectedFile.name.toLowerCase().includes('findeks') && selectedFile.type.includes('pdf');
        defaultQuery = isFindeks ? 'Findeks raporumu analiz eder misin?' : 'Yüklediğim dosyayı analiz eder misin?';
      }
      
      const messageText = trimmedInput || defaultQuery;
      
      onSendMessage(messageText, { file: selectedFile || undefined });
      setInput('');
      setSelectedFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size > 0) {
      setSelectedFile(file);
    } else if (file) {
      alert('Seçilen dosya boş veya geçersiz.');
    }
    e.target.value = '';
    setIsAttachmentMenuOpen(false);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleVoiceStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.addEventListener('dataavailable', (e) => {
        chunks.push(e.data);
      });

      mediaRecorderRef.current.addEventListener('stop', async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(blob);
        stream.getTracks().forEach((track) => track.stop());
      });

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  const handleVoiceStop = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', blob);

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const { text } = await response.json();
        setInput((prev) => prev + (prev ? ' ' : '') + text);
      }
    } catch (error) {
      console.error('Speech-to-text failed:', error);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-card rounded-lg shadow-md border border-border">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div
              key="chat-empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-muted-foreground"
            >
              <div className="text-4xl mb-2">💬</div>
              <p className="font-medium">Merhaba! Finansal sorunlarında sana yardımcı olmak için buradayım.</p>
              <p className="text-sm mt-2">Hesaplarından, borçlarından, taksitlerinden bana bahset...</p>
            </motion.div>
          )}

          {renderMessages.map((msg, idx) => (
            <div key={msg.__renderKey}>
              <ChatBubble message={msg} />
              {msg.suggestedTransaction && idx === renderMessages.length - 1 && (
                <TransactionSuggestion
                  transaction={msg.suggestedTransaction}
                  onAccept={onAcceptTransaction}
                />
              )}
            </div>
          ))}

          {isLoading && (
            <motion.div
              key="chat-loading-indicator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2 items-center p-3 bg-muted rounded-lg w-fit"
            >
              <span className="text-sm text-muted-foreground">Yazıyor</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                    className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border bg-muted/30 p-3">
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs text-primary w-fit max-w-[200px] mx-auto sm:mx-0">
            <span className="truncate">📎 {selectedFile.name}</span>
            <button
              onClick={handleRemoveFile}
              className="text-blue-400 hover:text-red-500 font-bold ml-1 transition-colors"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* Hidden Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.csv,.xlsx,.xls,.txt,.doc,.docx"
            onChange={handleFileChange}
          />
          <input
            type="file"
            ref={imageInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          {/* Attachment Menu */}
          <div className="relative">
            <button
              onClick={() => setIsAttachmentMenuOpen((prev) => !prev)}
              className={`p-2 rounded-full transition-colors ${
                isAttachmentMenuOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
              title="Ekler"
            >
              <span className="text-xl leading-none">＋</span>
            </button>

            <AnimatePresence>
              {isAttachmentMenuOpen && (
                <>
                  <motion.div
                    key="attachment-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setIsAttachmentMenuOpen(false)}
                  />
                  <motion.div
                    key="attachment-menu"
                    initial={{ opacity: 0, scale: 0.9, y: 10, x: 0 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-14 left-0 w-48 bg-card shadow-xl rounded-2xl border border-border overflow-hidden z-50 py-1"
                  >
                    {[
                      { label: 'Dosya yükle', icon: '📎', onClick: () => fileInputRef.current?.click() },
                      { label: 'Görsel gönder', icon: '🖼', onClick: () => imageInputRef.current?.click() },
                      { label: 'Ses kaydı', icon: '🎤', onClick: () => { setIsAttachmentMenuOpen(false); handleVoiceStart(); } },
                    ].map((item) => (
                      <button
                        key={item.label}
                        className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted flex items-center gap-3 transition-colors"
                        onClick={item.onClick}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Input Field */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (input.trim() || selectedFile)) {
                  handleSendMessage();
                }
              }}
              placeholder="Mesaj yaz..."
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all disabled:opacity-50 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Action Button: Voice or Send */}
          <div className="flex-shrink-0">
            {input.trim() || selectedFile ? (
              <button
                onClick={handleSendMessage}
                disabled={isLoading}
                className="p-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            ) : (
              <button
                onMouseDown={handleVoiceStart}
                onMouseUp={handleVoiceStop}
                onTouchStart={handleVoiceStart}
                onTouchEnd={handleVoiceStop}
                className={`p-2.5 rounded-full transition-all shadow-md active:scale-95 ${
                  isRecording
                    ? 'bg-destructive text-destructive-foreground animate-pulse ring-4 ring-destructive/20'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                  <path d="M6 10.5a.75.75 0 01.75.75 5.25 5.25 0 1010.5 0 .75.75 0 011.5 0 6.75 6.75 0 11-13.5 0A.75.75 0 016 10.5z" />
                  <path d="M12 18.75a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

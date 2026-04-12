import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, SuggestedTransaction } from '@/types';
import ChatBubble from './ChatBubble';
import TransactionSuggestion from './TransactionSuggestion';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
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
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-neutral-500"
            >
              <div className="text-4xl mb-2">💬</div>
              <p className="font-medium">Merhaba! Finansal sorunlarında sana yardımcı olmak için buradayım.</p>
              <p className="text-sm mt-2">Hesaplarından, borçlarından, taksitlerinden bana bahset...</p>
            </motion.div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id}>
              <ChatBubble message={msg} />
              {msg.suggestedTransaction && idx === messages.length - 1 && (
                <TransactionSuggestion
                  transaction={msg.suggestedTransaction}
                  onAccept={onAcceptTransaction}
                />
              )}
            </div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2 items-center p-3 bg-neutral-100 rounded-lg w-fit"
            >
              <span className="text-sm text-neutral-600">Yazıyor</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                    className="w-2 h-2 bg-neutral-400 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-neutral-200 p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Mesaj yaz..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            Gönder
          </button>
        </div>

        <button
          onMouseDown={handleVoiceStart}
          onMouseUp={handleVoiceStop}
          onTouchStart={handleVoiceStart}
          onTouchEnd={handleVoiceStop}
          className={`w-full py-2 rounded-lg font-medium transition-colors ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
          }`}
        >
          {isRecording ? '🎤 Kaydediliyor... Bırak' : '🎤 Ses Mesajı'}
        </button>
      </div>
    </div>
  );
}

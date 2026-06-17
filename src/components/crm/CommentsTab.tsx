'use client';

import React, { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function CommentsTab({ eventId }: { eventId: string }) {
  const storageKey = `crm-comments-${eventId}`;
  const [comments, setComments] = useState<{ author: string; message: string; timestamp: string }[]>([]);

  // Load comments from localStorage after mount to avoid hydration mismatch
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setComments(JSON.parse(stored));
      }
    } catch {}
  }, [storageKey]);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      author: 'Пользователь',
      message: newComment.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = [...comments, comment];
    setComments(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
    setNewComment('');
  };

  if (comments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Нет комментариев</p>
          <p className="text-sm mt-1">Добавьте заметки или комментарии к мероприятию</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Написать комментарий..."
            className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
          />
          <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()} className="bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-80 overflow-y-auto crm-scroll">
        {comments.map((c, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl border bg-white">
            <div className="w-8 h-8 rounded-full bg-[#FFE0E5] flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-[#E4002B]">{c.author.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{c.author}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(c.timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{c.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Написать комментарий..."
          className="flex-1"
          onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
        />
        <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()} className="bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export { CommentsTab };
export default CommentsTab;

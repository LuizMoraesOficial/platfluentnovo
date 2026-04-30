import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquare, Plus, Search, Heart, Reply, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

const ROLE_COLORS = { admin: '#E59313', teacher: '#3b82f6', student: '#22c55e' };
const ROLE_LABELS = { admin: 'Admin', teacher: 'Prof.', student: 'Aluno' };
const CATEGORIES = ['Gramática', 'Vocabulário', 'Pronunciação', 'Business English', 'Recursos', 'Geral'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return 'agora';
}

export function ForumSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [newComment, setNewComment] = useState('');

  const { data: apiPosts = [], isLoading, error } = useQuery({
    queryKey: ['/api/forum/posts'],
    staleTime: 120_000,
  });

  const likesQuery = useQuery({
    queryKey: ['/api/forum/posts/likes', apiPosts.map(p => p.id).join(',')],
    queryFn: async () => {
      if (!apiPosts.length) return {};
      const results = await Promise.all(
        apiPosts.map(p => apiRequest(`/forum/posts/${p.id}/likes`).catch(() => ({ postId: p.id, likesCount: p.likes_count, isLiked: false })))
      );
      return Object.fromEntries(results.map(r => [r.postId, r]));
    },
    enabled: apiPosts.length > 0 && !!user,
    staleTime: 30_000,
  });

  const commentsQuery = useQuery({
    queryKey: ['/api/forum/posts/comments', expandedPost],
    queryFn: () => apiRequest(`/forum/posts/${expandedPost}/comments`),
    enabled: !!expandedPost,
    staleTime: 60_000,
  });

  const posts = apiPosts.map(p => {
    const ld = likesQuery.data?.[p.id];
    return {
      id: p.id,
      title: p.title,
      content: p.content,
      author: p.author?.full_name ?? 'Usuário',
      authorRole: p.author?.role ?? 'student',
      category: p.is_question ? 'Dúvida' : (p.category || 'Geral'),
      createdAt: p.created_at,
      likes: ld?.likesCount ?? p.likes_count ?? 0,
      isLiked: ld?.isLiked ?? false,
    };
  }).filter(p =>
    (searchTerm === '' || p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.content.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedCategory === 'all' || p.category === selectedCategory)
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const likeMutation = useMutation({
    mutationFn: (id) => apiRequest(`/forum/posts/${id}/like`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/forum/posts/likes'] }),
    onError: (e) => toast({ title: 'Erro ao curtir', description: e.message, variant: 'destructive' }),
  });

  const unlikeMutation = useMutation({
    mutationFn: (id) => apiRequest(`/forum/posts/${id}/unlike`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/forum/posts/likes'] }),
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const createPostMutation = useMutation({
    mutationFn: (data) => apiRequest('/forum/posts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forum/posts'] });
      setIsCreatePostOpen(false);
      toast({ title: 'Post publicado!' });
    },
    onError: (e) => toast({ title: 'Erro ao publicar', description: e.message, variant: 'destructive' }),
  });

  const createCommentMutation = useMutation({
    mutationFn: ({ postId, content }) => apiRequest(`/forum/posts/${postId}/comments`, {
      method: 'POST', body: JSON.stringify({ title: '', content }),
    }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/forum/posts/comments', vars.postId] });
      setNewComment('');
      toast({ title: 'Comentário publicado!' });
    },
    onError: (e) => toast({ title: 'Erro ao comentar', description: e.message, variant: 'destructive' }),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="db-panel-title" style={{ fontSize: 18 }}>Fórum da Comunidade</div>
          <div className="db-panel-sub">{apiPosts.length} post{apiPosts.length !== 1 ? 's' : ''} publicado{apiPosts.length !== 1 ? 's' : ''}</div>
        </div>
        <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
          <DialogTrigger asChild>
            <button className="db-cta" style={{ gap: 6 }}>
              <Plus style={{ width: 13, height: 13 }} />
              Novo Post
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-xl" style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.09)' }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#eeeef0' }}>Criar Novo Post</DialogTitle>
              <DialogDescription style={{ color: '#42424a' }}>
                Compartilhe suas dúvidas, dicas ou experiências com a comunidade.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createPostMutation.mutate({
                title: fd.get('title'),
                content: fd.get('content'),
                is_question: fd.get('category') === 'Dúvida',
              });
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>TÍTULO</label>
                  <Input name="title" placeholder="Ex: Dúvida sobre Present Perfect" required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>CATEGORIA</label>
                  <Select name="category" required>
                    <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>CONTEÚDO</label>
                  <Textarea name="content" placeholder="Descreva sua dúvida, dica ou experiência..." className="min-h-[120px]" required />
                </div>
              </div>
              <DialogFooter>
                <button className="db-cta" type="submit" disabled={createPostMutation.isPending} data-testid="button-submit-post" style={{ gap: 6 }}>
                  {createPostMutation.isPending ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : null}
                  Publicar
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="db-panel" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#42424a' }} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar posts..."
              style={{
                width: '100%', padding: '7px 10px 7px 32px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#eeeef0', fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger style={{ width: 180, fontSize: 12 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 style={{ width: 18, height: 18, color: '#E59313' }} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="db-panel">
          <div className="db-panel-inner" style={{ textAlign: 'center', padding: '32px 0' }}>
            <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#42424a' }}>Erro ao carregar posts</span>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="db-panel">
          <div className="db-panel-inner" style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <MessageSquare style={{ width: 28, height: 28, color: '#252529' }} />
            <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#42424a' }}>
              {searchTerm || selectedCategory !== 'all' ? 'Nenhum post encontrado' : 'Seja o primeiro a postar!'}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="container-forum-posts">
          {posts.map((post, i) => {
            const roleColor = ROLE_COLORS[post.authorRole] || '#86868e';
            const isExpanded = expandedPost === post.id;
            return (
              <div key={post.id} className={`db-panel da${(i % 4) + 1}`} data-testid={`card-post-${post.id}`}>
                <div className="db-panel-inner">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: roleColor + '14', border: `1px solid ${roleColor}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: roleColor,
                    }}>
                      {post.author.charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#eeeef0' }}>{post.author}</span>
                        <span className="db-pill" style={{ background: roleColor + '10', borderColor: roleColor + '28', color: roleColor, fontSize: 9 }}>
                          {ROLE_LABELS[post.authorRole] || 'Usuário'}
                        </span>
                        <span className="db-pill neutral" style={{ fontSize: 9 }}>{post.category}</span>
                        <span style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', marginLeft: 'auto' }}>
                          <Clock style={{ width: 9, height: 9, display: 'inline', marginRight: 3 }} />
                          {timeAgo(post.createdAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#eeeef0', marginBottom: 6, lineHeight: 1.3 }}>{post.title}</h3>

                      {/* Content preview */}
                      <p style={{ fontSize: 12.5, color: '#86868e', lineHeight: 1.6, marginBottom: 12,
                        overflow: isExpanded ? 'visible' : 'hidden',
                        display: isExpanded ? 'block' : '-webkit-box',
                        WebkitLineClamp: isExpanded ? 'unset' : 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {post.content}
                      </p>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => post.isLiked ? unlikeMutation.mutate(post.id) : likeMutation.mutate(post.id)}
                          disabled={likeMutation.isPending || unlikeMutation.isPending}
                          data-testid={`button-like-${post.id}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                            background: post.isLiked ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${post.isLiked ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`,
                            color: post.isLiked ? '#ef4444' : '#86868e',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <Heart style={{ width: 12, height: 12, fill: post.isLiked ? 'currentColor' : 'none' }} />
                          {post.likes}
                        </button>

                        <button
                          onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                          data-testid={`button-comments-${post.id}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                            background: isExpanded ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isExpanded ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
                            color: isExpanded ? '#3b82f6' : '#86868e',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <MessageSquare style={{ width: 12, height: 12 }} />
                          Comentários
                        </button>
                      </div>

                      {/* Comments expanded */}
                      {isExpanded && (
                        <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                          {commentsQuery.isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                              <Loader2 style={{ width: 14, height: 14, color: '#E59313' }} className="animate-spin" />
                            </div>
                          ) : commentsQuery.data?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                              {commentsQuery.data.map(c => (
                                <div key={c.id} style={{
                                  padding: '8px 12px', borderRadius: 8,
                                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#eeeef0' }}>{c.author?.full_name ?? 'Usuário'}</span>
                                    <span style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace' }}>{timeAgo(c.created_at)}</span>
                                  </div>
                                  <p style={{ fontSize: 12, color: '#86868e', lineHeight: 1.5 }}>{c.content}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: 11, color: '#42424a', fontFamily: 'DM Mono, monospace', marginBottom: 12 }}>
                              Nenhum comentário ainda
                            </p>
                          )}

                          {user && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Textarea
                                placeholder="Escreva um comentário..."
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                rows={2}
                                data-testid={`textarea-comment-${post.id}`}
                                style={{ flex: 1, fontSize: 12 }}
                              />
                              <button
                                onClick={() => {
                                  if (!newComment.trim()) return;
                                  createCommentMutation.mutate({ postId: post.id, content: newComment.trim() });
                                }}
                                disabled={createCommentMutation.isPending || !newComment.trim()}
                                data-testid={`button-submit-comment-${post.id}`}
                                className="db-cta"
                                style={{ alignSelf: 'flex-end', gap: 5 }}
                              >
                                {createCommentMutation.isPending
                                  ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                                  : <Reply style={{ width: 12, height: 12 }} />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

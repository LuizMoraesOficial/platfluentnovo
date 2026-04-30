import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Award, Target, AlertCircle, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  canGiveFeedbackToRole,
  getAvailableFeedbackTypes,
  getValidationMessage,
  getFeedbackTypeLabel,
  getFeedbackTypeIcon,
} from '@/lib/feedbackValidation';
import {
  TeacherFeedbackFields,
  StudentFeedbackFields,
  ClassFeedbackFields,
  GeneralFeedbackFields,
} from './ConditionalFeedbackFields';

export function FeedbackSystem({ userRole = 'student', userName = 'Usuário' }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State declarations MUST come before any hooks that depend on them
  const [isGiveFeedbackOpen, setIsGiveFeedbackOpen] = useState(false);
  const [selectedFeedbackType, setSelectedFeedbackType] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [comment, setComment] = useState('');
  const [overallRating, setOverallRating] = useState(0);

  // Fetch feedbacks using React Query
  const { data: feedbacks = [], isLoading: feedbacksLoading, error: feedbacksError } = useQuery({
    queryKey: ['/feedbacks'],
    queryFn: () => apiRequest('/feedbacks'),
  });

  // Fetch recipients for feedback (enabled when feedback type is selected)
  const { data: recipients = [], isLoading: recipientsLoading, refetch: refetchRecipients } = useQuery({
    queryKey: ['/profiles/recipients', selectedFeedbackType],
    queryFn: () => apiRequest(`/profiles/recipients?role=${selectedFeedbackType}`),
    enabled: !!selectedFeedbackType && selectedFeedbackType !== 'general' && selectedFeedbackType !== 'class',
  });

  // Mutations for feedback operations
  const createFeedbackMutation = useMutation({
    mutationFn: (feedbackData) => apiRequest('/feedbacks', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/feedbacks'] });
      setIsGiveFeedbackOpen(false);
      toast({
        title: "Feedback enviado",
        description: "Seu feedback foi enviado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFeedbackMutation = useMutation({ mutationFn: ({ id, data  }) => apiRequest(`/feedbacks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/feedbacks'] });
      toast({
        title: "Feedback atualizado",
        description: "Feedback atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: (id) => apiRequest(`/feedbacks/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/feedbacks'] });
      toast({
        title: "Feedback removido",
        description: "Feedback removido com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const respondToFeedbackMutation = useMutation({ mutationFn: ({ id, response  }) => apiRequest(`/feedbacks/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/feedbacks'] });
      toast({
        title: "Resposta enviada",
        description: "Sua resposta foi enviada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao responder feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Structured feedback states
  const [teacherFeedback, setTeacherFeedback] = useState({
    didatica: 3,
    metodologia: 3,
    clareza: 3,
    paciencia: 3,
    pontualidade: 3,
  });
  
  const [studentFeedback, setStudentFeedback] = useState({
    progresso: 3,
    participacao: 3,
    pontualidade: 3,
    dedicacao: 3,
    evolucao: 3,
  });
  
  const [classFeedback, setClassFeedback] = useState({
    conteudo: 3,
    material_didatico: 3,
    dificuldade: 3,
    duracao: 3,
    utilidade: 3,
  });
  
  const [generalFeedback, setGeneralFeedback] = useState({
    plataforma: 3,
    infraestrutura: 3,
    sugestoes: '',
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!isGiveFeedbackOpen) {
      setSelectedFeedbackType('');
      setSelectedRecipient('');
      setSubject('');
      setComment('');
      setOverallRating(0);
      setTeacherFeedback({ didatica: 3, metodologia: 3, clareza: 3, paciencia: 3, pontualidade: 3 });
      setStudentFeedback({ progresso: 3, participacao: 3, pontualidade: 3, dedicacao: 3, evolucao: 3 });
      setClassFeedback({ conteudo: 3, material_didatico: 3, dificuldade: 3, duracao: 3, utilidade: 3 });
      setGeneralFeedback({ plataforma: 3, infraestrutura: 3, sugestoes: '' });
    }
  }, [isGiveFeedbackOpen]);

  const handleSubmitFeedback = () => {
    // Validation for general and class feedback doesn't require recipient
    const needsRecipient = selectedFeedbackType !== 'general' && selectedFeedbackType !== 'class';
    
    if (!selectedFeedbackType || (needsRecipient && !selectedRecipient) || !subject || !comment || overallRating === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    let structured_data = {};
    
    switch (selectedFeedbackType) {
      case 'teacher':
        structured_data = { teacher: teacherFeedback };
        break;
      case 'student':
        structured_data = { student: studentFeedback };
        break;
      case 'class':
        structured_data = { class: classFeedback };
        break;
      case 'general':
        structured_data = { general: generalFeedback };
        break;
    }

    const feedbackData = {
      feedback_type: selectedFeedbackType,
      rating: overallRating,
      comment: comment,
      to_user_id: needsRecipient ? selectedRecipient : null,
      class_id: selectedFeedbackType === 'class' ? selectedRecipient || null : null,
      structured_data
    };

    createFeedbackMutation.mutate(feedbackData);
  };

  const getAvailableTypesForUser = () => {
    return getAvailableFeedbackTypes(userRole);
  };

  const getRecipientsForType = (type) => {
    if (type === 'general') {
      return [{ id: 'general', full_name: 'Be Fluent School', role: 'school', email: '' }];
    }
    if (type === 'class') {
      // For classes, we might want to add class selection or make it general
      return [{ id: 'class-general', full_name: 'Avaliar Aulas em Geral', role: 'class', email: '' }];
    }
    return recipients;
  };

  const canSubmit = () => {
    const needsRecipient = selectedFeedbackType !== 'general' && selectedFeedbackType !== 'class';
    return selectedFeedbackType && (!needsRecipient || selectedRecipient) && subject && comment && overallRating > 0;
  };

  const handleHelpfulClick = (feedbackId) => {
    // For now, we'll just show the toast - implement helpful votes later if needed
    toast({
      title: "Obrigado!",
      description: "Seu voto foi computado.",
    });
  };

  const renderStars = (rating, interactive = false, onRatingChange) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={() => interactive && onRatingChange?.(star)}
          />
        ))}
      </div>
    );
  };

  const getTypeIcon = (type) => {
    return getFeedbackTypeIcon(type);
  };

  const getTypeLabel = (type) => {
    return getFeedbackTypeLabel(type);
  };

  // Process feedbacks based on current user (would need actual user ID in real implementation)
  const myFeedbacks = feedbacks.filter((f) => f.fromUser?.full_name === userName);
  const receivedFeedbacks = feedbacks.filter((f) => f.toUser?.full_name === userName);
  const averageRating = feedbacks.length > 0 
    ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length 
    : 0;

  // Show loading state
  if (feedbacksLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Sistema de Feedback
          </h2>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (feedbacksError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar feedbacks: {feedbacksError instanceof Error ? feedbacksError.message : 'Erro desconhecido'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Sistema de Feedback
        </h2>
        <Dialog open={isGiveFeedbackOpen} onOpenChange={setIsGiveFeedbackOpen}>
          <DialogTrigger asChild>
            <Button className="transition-all hover:scale-105">
              <Star className="mr-2 h-4 w-4" />
              Dar Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Dar Feedback</DialogTitle>
              <DialogDescription>
                Compartilhe sua experiência e ajude a melhorar nosso ensino.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Feedback Type Selection */}
                <div className="grid gap-2">
                  <Label htmlFor="type">Tipo de Feedback *</Label>
                  <Select value={selectedFeedbackType} onValueChange={(value) => {
                    setSelectedFeedbackType(value);
                    setSelectedRecipient(''); // Reset recipient when type changes
                  }}>
                    <SelectTrigger data-testid="select-feedback-type">
                      <SelectValue placeholder="Selecione o tipo de feedback" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTypesForUser().map((type) => (
                        <SelectItem key={type} value={type}>
                          {getFeedbackTypeIcon(type)} {getFeedbackTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedFeedbackType && !canGiveFeedbackToRole(userRole, selectedFeedbackType) && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {getValidationMessage(userRole, selectedFeedbackType)}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Recipient Selection */}
                {selectedFeedbackType && (
                  <div className="grid gap-2">
                    <Label htmlFor="recipient">Destinatário *</Label>
                    <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                      <SelectTrigger data-testid="select-recipient">
                        <SelectValue placeholder={recipientsLoading ? "Carregando..." : "Selecione o destinatário"} />
                      </SelectTrigger>
                      <SelectContent>
                        {recipientsLoading ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Carregando destinatários...
                            </div>
                          </SelectItem>
                        ) : (
                          getRecipientsForType(selectedFeedbackType).map((recipient) => (
                            <SelectItem key={recipient.id} value={recipient.id} data-testid={`option-recipient-${recipient.id}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {recipient.role === 'teacher' ? '👨‍🏫' : 
                                   recipient.role === 'student' ? '👨‍🎓' : 
                                   recipient.role === 'class' ? '📚' : '🏫'}
                                </span>
                                {recipient.full_name}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Subject */}
                {selectedRecipient && (
                  <div className="grid gap-2">
                    <Label htmlFor="subject">Assunto *</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Excelente metodologia de ensino"
                      data-testid="input-subject"
                    />
                  </div>
                )}

                {/* Overall Rating */}
                {subject && (
                  <div className="grid gap-2">
                    <Label>Avaliação Geral *</Label>
                    <div className="flex items-center gap-2">
                      {renderStars(overallRating, true, setOverallRating)}
                      <span className="text-sm text-muted-foreground ml-2">
                        {overallRating > 0 ? `${overallRating} estrela${overallRating > 1 ? 's' : ''}` : 'Selecione uma avaliação'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Conditional Structured Feedback Fields */}
              {selectedFeedbackType && overallRating > 0 && (
                <div className="space-y-4">
                  {selectedFeedbackType === 'teacher' && (
                    <TeacherFeedbackFields
                      values={teacherFeedback}
                      onChange={(field, value) => 
                        setTeacherFeedback(prev => ({ ...prev, [field]: value }))
                      }
                    />
                  )}
                  
                  {selectedFeedbackType === 'student' && (
                    <StudentFeedbackFields
                      values={studentFeedback}
                      onChange={(field, value) => 
                        setStudentFeedback(prev => ({ ...prev, [field]: value }))
                      }
                    />
                  )}
                  
                  {selectedFeedbackType === 'class' && (
                    <ClassFeedbackFields
                      values={classFeedback}
                      onChange={(field, value) => 
                        setClassFeedback(prev => ({ ...prev, [field]: value }))
                      }
                    />
                  )}
                  
                  {selectedFeedbackType === 'general' && (
                    <GeneralFeedbackFields
                      values={generalFeedback}
                      onChange={(field, value) => 
                        setGeneralFeedback(prev => ({ ...prev, [field]: value }))
                      }
                    />
                  )}
                </div>
              )}

              {/* Comment Section */}
              {selectedFeedbackType && overallRating > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="comment">Comentário Adicional *</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Descreva sua experiência, sugestões ou comentários adicionais..."
                    className="min-h-24"
                    data-testid="textarea-comment"
                  />
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsGiveFeedbackOpen(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitFeedback}
                disabled={!canSubmit() || createFeedbackMutation.isPending}
                className="transition-all hover:scale-105"
                data-testid="button-submit"
              >
                {createFeedbackMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Feedback
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{averageRating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{feedbacks.length}</p>
                <p className="text-sm text-muted-foreground">Total Feedbacks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded">
                <ThumbsUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round((feedbacks.filter(f => f.rating >= 4).length / feedbacks.length) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Satisfação</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Feedbacks Dados */}
        <Card>
          <CardHeader>
            <CardTitle>Meus Feedbacks</CardTitle>
            <CardDescription>Feedbacks que você deu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myFeedbacks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Você ainda não deu nenhum feedback</p>
                </div>
              ) : (
                myFeedbacks.slice(0, 3).map((feedback) => (
                  <div key={feedback.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(feedback.type)}</span>
                        <span className="font-medium">{feedback.to}</span>
                        <Badge variant="outline">{getTypeLabel(feedback.type)}</Badge>
                      </div>
                      {renderStars(feedback.rating)}
                    </div>
                    {feedback.lessonTitle && (
                      <p className="text-sm text-blue-600 mb-2">{feedback.lessonTitle}</p>
                    )}
                    <p className="text-sm text-muted-foreground mb-2">{feedback.comment}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(feedback.date || feedback.created_at || Date.now()).toLocaleDateString('pt-BR')}</span>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        <span>{feedback.helpful}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feedbacks Recebidos */}
        <Card>
          <CardHeader>
            <CardTitle>Feedbacks Recebidos</CardTitle>
            <CardDescription>O que outros disseram sobre você</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {receivedFeedbacks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Você ainda não recebeu feedbacks</p>
                </div>
              ) : (
                receivedFeedbacks.slice(0, 3).map((feedback) => (
                  <div key={feedback.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(feedback.type)}</span>
                        <span className="font-medium">{feedback.from}</span>
                        <Badge variant="outline">{getTypeLabel(feedback.type)}</Badge>
                      </div>
                      {renderStars(feedback.rating)}
                    </div>
                    {feedback.lessonTitle && (
                      <p className="text-sm text-blue-600 mb-2">{feedback.lessonTitle}</p>
                    )}
                    <p className="text-sm text-muted-foreground mb-2">{feedback.comment}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(feedback.date || feedback.created_at || Date.now()).toLocaleDateString('pt-BR')}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleHelpfulClick(feedback.id)}
                          className="h-6 text-xs"
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {feedback.helpful}
                        </Button>
                        {!feedback.responded && userRole === 'teacher' && (
                          <Button size="sm" variant="outline" className="h-6 text-xs">
                            Responder
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
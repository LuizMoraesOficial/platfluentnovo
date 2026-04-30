import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Trophy, Target, Play, Lock, CheckCircle, Star, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLessonProgress, useSaveLessonProgress } from '@/hooks/useProgress';
import { useAuth } from '@/hooks/useAuth';

const MODULES = [
  {
    id: 'm1', title: 'Beginner - Fundamentos', level: 'Beginner', estimatedTime: 320,
    lessons: [
      { id: 'm1-l1', title: 'Alphabet & Basic Sounds', type: 'video', duration: 25, difficulty: 'easy', xp: 50 },
      { id: 'm1-l2', title: 'Numbers & Colors', type: 'exercise', duration: 20, difficulty: 'easy', xp: 40 },
      { id: 'm1-l3', title: 'Personal Introductions', type: 'speaking', duration: 30, difficulty: 'medium', xp: 60 },
      { id: 'm1-l4', title: 'Family & Relationships', type: 'exercise', duration: 25, difficulty: 'easy', xp: 45 },
    ],
  },
  {
    id: 'm2', title: 'Elementary - Estruturas Básicas', level: 'Elementary', estimatedTime: 400,
    lessons: [
      { id: 'm2-l1', title: 'Verb To Be', type: 'video', duration: 30, difficulty: 'easy', xp: 55 },
      { id: 'm2-l2', title: 'Articles (A, An, The)', type: 'reading', duration: 25, difficulty: 'medium', xp: 50 },
      { id: 'm2-l3', title: 'Present Simple', type: 'exercise', duration: 35, difficulty: 'medium', xp: 65 },
    ],
  },
  {
    id: 'm3', title: 'Pre-Intermediate - Expandindo', level: 'Pre-Intermediate', estimatedTime: 480,
    lessons: [
      { id: 'm3-l1', title: 'Past Simple', type: 'video', duration: 30, difficulty: 'medium', xp: 60 },
      { id: 'm3-l2', title: 'Present Continuous', type: 'exercise', duration: 25, difficulty: 'medium', xp: 55 },
    ],
  },
  {
    id: 'm4', title: 'Intermediate - Fluência em Desenvolvimento', level: 'Intermediate', estimatedTime: 560,
    lessons: [
      { id: 'm4-l1', title: 'Present Perfect', type: 'video', duration: 35, difficulty: 'hard', xp: 70 },
      { id: 'm4-l2', title: 'Conditional Sentences', type: 'exercise', duration: 40, difficulty: 'hard', xp: 80 },
    ],
  },
  {
    id: 'm5', title: 'Upper-Intermediate - Refinamento', level: 'Upper-Intermediate', estimatedTime: 640,
    lessons: [
      { id: 'm5-l1', title: 'Passive Voice', type: 'exercise', duration: 30, difficulty: 'hard', xp: 75 },
      { id: 'm5-l2', title: 'Reported Speech', type: 'reading', duration: 35, difficulty: 'hard', xp: 80 },
    ],
  },
  {
    id: 'm6', title: 'Advanced - Proficiência', level: 'Advanced', estimatedTime: 720,
    lessons: [
      { id: 'm6-l1', title: 'Advanced Grammar Nuances', type: 'reading', duration: 45, difficulty: 'hard', xp: 100 },
      { id: 'm6-l2', title: 'Business English', type: 'speaking', duration: 40, difficulty: 'hard', xp: 100 },
    ],
  },
];

export function LearningPath() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const studentId = profile?.id;

  const { data: progressRows = [], isLoading } = useLessonProgress(studentId);
  const saveMutation = useSaveLessonProgress();
  const [selectedModule, setSelectedModule] = useState(MODULES[0]);

  const getStatus = (lessonId) => progressRows.find(r => r.lesson_id === lessonId)?.status ?? 'available';
  const getScore = (lessonId) => progressRows.find(r => r.lesson_id === lessonId)?.score;

  const moduleProgress = (mod) => {
    const completed = mod.lessons.filter(l => getStatus(l.id) === 'completed').length;
    return { completed, total: mod.lessons.length, pct: mod.lessons.length ? Math.round((completed / mod.lessons.length) * 100) : 0 };
  };

  const totalXP = MODULES.flatMap(m => m.lessons).reduce((sum, l) => {
    const row = progressRows.find(r => r.lesson_id === l.id);
    return sum + (row?.xp_earned ?? 0);
  }, 0);

  const completedTotal = progressRows.filter(r => r.status === 'completed').length;
  const totalLessons = MODULES.flatMap(m => m.lessons).length;

  const handleAction = async (lesson, action) => {
    try {
      const isComplete = action === 'complete';
      await saveMutation.mutateAsync({
        lesson_id: lesson.id,
        module_id: selectedModule.id,
        status: isComplete ? 'completed' : 'in_progress',
        score: isComplete ? 85 : null,
        xp_earned: isComplete ? lesson.xp : 0,
      });
      toast({ title: isComplete ? `Parabéns! +${lesson.xp} XP 🎉` : 'Lição iniciada!', description: isComplete ? `Lição "${lesson.title}" concluída.` : 'Boa sorte com seus estudos!' });
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const typeIcon = { video: '🎥', exercise: '✏️', reading: '📖', speaking: '🗣️', test: '📝' };
  const typeLabel = { video: 'Vídeo', exercise: 'Exercício', reading: 'Leitura', speaking: 'Conversação', test: 'Teste' };
  const diffColor = { easy: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' };
  const diffLabel = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
  const formatTime = (m) => m < 60 ? `${m}min` : `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}min` : ''}`;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Minha Jornada de Aprendizado
        </h2>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          <Trophy className="h-4 w-4 mr-1" />
          {totalXP} XP
        </Badge>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Progresso Geral</h3>
              <p className="text-sm text-muted-foreground">{completedTotal} de {totalLessons} lições concluídas</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{totalLessons ? Math.round((completedTotal / totalLessons) * 100) : 0}%</p>
              <p className="text-sm text-muted-foreground">Concluído</p>
            </div>
          </div>
          <Progress value={totalLessons ? (completedTotal / totalLessons) * 100 : 0} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Módulos do Curso</CardTitle>
              <CardDescription>Sua trilha de aprendizado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MODULES.map((mod) => {
                const { completed, total, pct } = moduleProgress(mod);
                return (
                  <div
                    key={mod.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${selectedModule.id === mod.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : ''}`}
                    onClick={() => setSelectedModule(mod)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm flex items-center gap-1">
                          {completed === total && total > 0 ? <CheckCircle className="h-3 w-3 text-green-600" /> : <BookOpen className="h-3 w-3 text-muted-foreground" />}
                          {mod.title}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">{mod.level}</Badge>
                      <span className="text-xs text-muted-foreground">{completed}/{total} lições</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{pct}%</span>
                      <span>{formatTime(mod.estimatedTime)}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {selectedModule.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso do Módulo</span>
                  <span className="text-sm">{moduleProgress(selectedModule).pct}%</span>
                </div>
                <Progress value={moduleProgress(selectedModule).pct} className="h-2" />
              </div>
              <div className="space-y-3">
                {selectedModule.lessons.map((lesson) => {
                  const status = getStatus(lesson.id);
                  const score = getScore(lesson.id);
                  return (
                    <div key={lesson.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xl">{typeIcon[lesson.type] ?? '📚'}</span>
                            {status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {status === 'in_progress' && <Play className="h-4 w-4 text-blue-600" />}
                            {status === 'available' && <Target className="h-4 w-4 text-yellow-600" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{lesson.title}</h4>
                            <div className="flex items-center gap-2 text-xs mt-1">
                              <Badge variant="outline" className={diffColor[lesson.difficulty]}>{diffLabel[lesson.difficulty]}</Badge>
                              <Badge variant="outline">{typeLabel[lesson.type]}</Badge>
                              <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.duration}min</span>
                              <span className="text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3" />{lesson.xp} XP</span>
                            </div>
                            {score != null && (
                              <Badge variant="secondary" className="mt-1">
                                <Star className="h-3 w-3 mr-1" />{score}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {status === 'available' && (
                            <Button size="sm" onClick={() => handleAction(lesson, 'start')} disabled={saveMutation.isPending}>
                              <Play className="h-3 w-3 mr-1" />Iniciar
                            </Button>
                          )}
                          {status === 'in_progress' && (
                            <Button size="sm" variant="outline" onClick={() => handleAction(lesson, 'complete')} disabled={saveMutation.isPending}>
                              Concluir
                            </Button>
                          )}
                          {status === 'completed' && (
                            <Button size="sm" variant="ghost">
                              <CheckCircle className="h-3 w-3 mr-1" />Revisar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

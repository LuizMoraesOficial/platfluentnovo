import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Users, BookOpen, MessageSquare, Settings } from 'lucide-react';

export function TeacherFeedbackFields({ values, onChange }) {
  const renderStars = (rating) => {
    return (
      <div className="flex gap-1 ml-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const fields = [
    { key: 'didatica', label: 'Didática', description: 'Capacidade de ensinar e explicar conceitos' },
    { key: 'metodologia', label: 'Metodologia', description: 'Eficácia dos métodos de ensino utilizados' },
    { key: 'clareza', label: 'Clareza', description: 'Clareza nas explicações e comunicação' },
    { key: 'paciencia', label: 'Paciência', description: 'Paciência para esclarecer dúvidas' },
    { key: 'pontualidade', label: 'Pontualidade', description: 'Pontualidade e cumprimento de horários' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Avaliação Detalhada do Professor
        </CardTitle>
        <CardDescription>
          Avalie diferentes aspectos do desempenho do professor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.map(({ key, label, description }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">{label}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">{values[key]}</span>
                {renderStars(values[key])}
              </div>
            </div>
            <Slider
              value={[values[key]]}
              onValueChange={(value) => onChange(key, value[0])}
              max={5}
              min={1}
              step={1}
              className="w-full"
              data-testid={`slider-teacher-${key}`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function StudentFeedbackFields({ values, onChange }) {
  const renderStars = (rating) => {
    return (
      <div className="flex gap-1 ml-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const fields = [
    { key: 'progresso', label: 'Progresso', description: 'Evolução no aprendizado do idioma' },
    { key: 'participacao', label: 'Participação', description: 'Engajamento e participação nas aulas' },
    { key: 'pontualidade', label: 'Pontualidade', description: 'Pontualidade e assiduidade' },
    { key: 'dedicacao', label: 'Dedicação', description: 'Dedicação aos estudos e tarefas' },
    { key: 'evolucao', label: 'Evolução', description: 'Melhoria geral nas habilidades' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Avaliação Detalhada do Aluno
        </CardTitle>
        <CardDescription>
          Avalie diferentes aspectos do desempenho do aluno
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.map(({ key, label, description }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">{label}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">{values[key]}</span>
                {renderStars(values[key])}
              </div>
            </div>
            <Slider
              value={[values[key]]}
              onValueChange={(value) => onChange(key, value[0])}
              max={5}
              min={1}
              step={1}
              className="w-full"
              data-testid={`slider-student-${key}`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ClassFeedbackFields({ values, onChange }) {
  const renderStars = (rating) => {
    return (
      <div className="flex gap-1 ml-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const fields = [
    { key: 'conteudo', label: 'Conteúdo', description: 'Qualidade e relevância do conteúdo' },
    { key: 'material_didatico', label: 'Material Didático', description: 'Qualidade dos materiais utilizados' },
    { key: 'dificuldade', label: 'Nível de Dificuldade', description: 'Adequação do nível de dificuldade' },
    { key: 'duracao', label: 'Duração', description: 'Adequação da duração da aula' },
    { key: 'utilidade', label: 'Utilidade', description: 'Utilidade prática do aprendizado' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Avaliação Detalhada da Aula
        </CardTitle>
        <CardDescription>
          Avalie diferentes aspectos da aula
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.map(({ key, label, description }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">{label}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">{values[key]}</span>
                {renderStars(values[key])}
              </div>
            </div>
            <Slider
              value={[values[key]]}
              onValueChange={(value) => onChange(key, value[0])}
              max={5}
              min={1}
              step={1}
              className="w-full"
              data-testid={`slider-class-${key}`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function GeneralFeedbackFields({ values, onChange }) {
  const renderStars = (rating) => {
    return (
      <div className="flex gap-1 ml-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const ratingFields = [
    { key: 'plataforma', label: 'Plataforma', description: 'Qualidade e usabilidade da plataforma' },
    { key: 'infraestrutura', label: 'Infraestrutura', description: 'Qualidade da infraestrutura técnica' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Avaliação Geral da Escola
        </CardTitle>
        <CardDescription>
          Avalie aspectos gerais da escola e da plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ratingFields.map(({ key, label, description }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">{label}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">{values[key]}</span>
                {renderStars(values[key])}
              </div>
            </div>
            <Slider
              value={[values[key]]}
              onValueChange={(value) => onChange(key, value[0])}
              max={5}
              min={1}
              step={1}
              className="w-full"
              data-testid={`slider-general-${key}`}
            />
          </div>
        ))}
        
        <div className="space-y-3">
          <Label className="font-medium">Sugestões de Melhoria</Label>
          <Textarea
            value={values.sugestoes}
            onChange={(e) => onChange('sugestoes', e.target.value)}
            placeholder="Compartilhe suas sugestões para melhorarmos nossos serviços..."
            className="min-h-[100px]"
            data-testid="textarea-general-sugestoes"
          />
        </div>
      </CardContent>
    </Card>
  );
}
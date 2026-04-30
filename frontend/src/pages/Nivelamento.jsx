import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mic, StopCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const LOCAL_QUESTIONS = [
  {
    id: "listening1",
    type: "multiple-choice",
    title: "Listening",
    description: "Compreenda a intenção do aluno e escolha a melhor alternativa.",
    prompt: "A student says: 'I need to feel more confident when speaking in meetings.' What does the student want?",
    options: [
      "Improve speaking confidence at work.",
      "Learn advanced grammar rules.",
      "Translate written messages more accurately.",
    ],
  },
  {
    id: "listening2",
    type: "multiple-choice",
    title: "Listening",
    description: "Identifique a recomendação implícita no diálogo.",
    prompt: "Teacher: 'If you want faster progress, we should practice speaking every day.' What is the teacher recommending?",
    options: [
      "Practice speaking daily.",
      "Study grammar only.",
      "Focus on written tests.",
    ],
  },
  {
    id: "reading1",
    type: "text",
    title: "Reading",
    description: "Leia o trecho e responda em inglês com precisão.",
    passage:
      "A student explains: 'My goal is to present ideas clearly in English during meetings and to participate in discussions without waiting for translations.'",
    prompt: "What is the student's main objective in English?",
  },
  {
    id: "reading2",
    type: "text",
    title: "Reading",
    description: "Parafraseie em inglês o objetivo principal do aluno.",
    prompt: "Write one sentence in English summarizing the student's goal from the passage.",
  },
  {
    id: "writing",
    type: "text",
    title: "Writing",
    description: "Escreva uma resposta clara e estruturada em inglês.",
    prompt: "Write a short email to a teacher explaining your current English challenge and why improving this skill matters to you.",
  },
  {
    id: "speaking",
    type: "audio",
    title: "Speaking",
    description: "Grave sua resposta em voz para avaliar fluência, pronúncia e expressão.",
    prompt: "Tell me briefly about a recent achievement and one English skill you want to improve next.",
  },
];

const PLAN_DETAILS = [
  { name: "VIP", threshold: 85, description: "O plano VIP é ideal para alunos que já têm fluência e desejam performance premium." },
  { name: "DIAMOND", threshold: 70, description: "O plano Diamond traz acompanhamento intensivo para crescimento rápido e seguro." },
  { name: "GOLD", threshold: 55, description: "O plano Gold garante consistência nas quatro habilidades do inglês." },
  { name: "SILVER", threshold: 40, description: "O plano Silver é perfeito para quem quer evolução regular com apoio de professores." },
  { name: "BRONZE", threshold: 0, description: "O plano Bronze é ideal para quem está começando e precisa de uma base estruturada." },
];

const createInitialAnswers = (questions) => {
  return questions.reduce(
    (acc, question) => ({ ...acc, [question.id]: "" }),
    { speakingText: "" }
  );
};

export default function Nivelamento() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState(LOCAL_QUESTIONS);
  // step: -1 = pre-form, 0 = intro, 1 = questionnaire, 2 = results
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState(createInitialAnswers(LOCAL_QUESTIONS));
  const [speakingBlob, setSpeakingBlob] = useState(null);
  const [speakingUrl, setSpeakingUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [audioTranscript, setAudioTranscript] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recorderTimerRef = useRef(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Pre-test form
  const [preForm, setPreForm] = useState({ nome: '', email: '', whatsapp: '' });
  const [preFormError, setPreFormError] = useState('');
  const [preFormLoading, setPreFormLoading] = useState(false);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch("/api/assessment/questions");
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        if (payload.questions) {
          setQuestions(payload.questions);
          setAnswers((current) => ({ ...createInitialAnswers(payload.questions), ...current }));
        }
        if (payload.aiEnabled !== undefined) {
          setAiEnabled(payload.aiEnabled);
        }
      } catch (error) {
        console.error("Unable to load assessment questions:", error);
      }
    }

    loadQuestions();
    return () => {
      if (recorderTimerRef.current) {
        window.clearInterval(recorderTimerRef.current);
      }
    };
  }, []);

  const progress = useMemo(() => {
    const answeredCount = questions.reduce((count, question) => {
      if (question.type === "audio") {
        return count + (speakingBlob ? 1 : 0);
      }
      return count + (answers[question.id]?.trim() ? 1 : 0);
    }, 0);
    return Math.round((answeredCount / questions.length) * 100);
  }, [questions, answers, speakingBlob]);

  const handleAnswerChange = (field, value) => {
    setAnswers((current) => ({ ...current, [field]: value }));
  };

  const handlePreFormSubmit = async (e) => {
    e.preventDefault();
    if (!preForm.nome.trim() || !preForm.email.trim() || !preForm.whatsapp.trim()) {
      setPreFormError('Por favor preencha todos os campos.');
      return;
    }
    setPreFormError('');
    setPreFormLoading(true);
    try {
      await fetch('/api/marketing/okkto-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preForm.nome,
          email: preForm.email,
          whatsapp: preForm.whatsapp,
          source: 'teste-nivelamento',
        }),
      });
    } catch (_) {}
    setPreFormLoading(false);
    setStep(0);
  };

  const resetTest = () => {
    setStep(0);
    setAnswers(createInitialAnswers(questions));
    setSpeakingBlob(null);
    setSpeakingUrl("");
    setResults(null);
    setAudioTranscript("");
    setServerError("");
  };

  const startRecording = async () => {
    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError(
        "O seu navegador não suporta gravação de áudio. Por favor use Chrome ou Edge mais recente."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg','audio/mp4',''].find(
        m => m === '' || MediaRecorder.isTypeSupported(m)
      ) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recordedChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        setSpeakingBlob(blob);
        setSpeakingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setRecordingSeconds(0);
        if (recorderTimerRef.current) {
          window.clearInterval(recorderTimerRef.current);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recorderTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((value) => value + 1);
      }, 1000);
    } catch (error) {
      console.error("Recording failed:", error);
      setRecordingError("Não foi possível iniciar a gravação de voz. Verifique as permissões do microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSubmit = async () => {
    setServerError("");
    const missingQuestion = questions.find((question) => {
      if (question.type === "audio") {
        return !speakingBlob;
      }
      return !answers[question.id]?.trim();
    });

    if (missingQuestion) {
      setServerError("Por favor responda todas as questões antes de finalizar o teste.");
      return;
    }

    setLoading(true);
    try {
      const rawAudio = speakingBlob ? await blobToBase64(speakingBlob) : undefined;
      const response = await fetch("/api/assessment/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listeningAnswer1: answers.listening1,
          listeningAnswer2: answers.listening2,
          readingAnswer1: answers.reading1,
          readingAnswer2: answers.reading2,
          writingAnswer: answers.writing,
          speakingAudioBase64: rawAudio,
          speakingText: answers.speakingText,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        setServerError(errorPayload?.message || "Erro ao enviar o teste. Tente novamente.");
        setLoading(false);
        return;
      }

      const resultPayload = await response.json();
      setResults(resultPayload);
      setAudioTranscript(resultPayload.speakingTranscript || "Transcrição não disponível");
      setStep(2);
    } catch (error) {
      console.error("Assessment submit failed:", error);
      setServerError("Erro de conexão ao enviar sua avaliação. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  const renderIntro = () => (
    <Card className="max-w-4xl mx-auto border-white/10 bg-[#0b0b0f]/95">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-amber-400" />
          <CardTitle>Teste de Nivelamento CEFR</CardTitle>
        </div>
        <CardDescription>
          Uma avaliação profissional com perguntas de listening, reading, writing e speaking, inspirada em modelos de nivelamento reais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
          <p className="mb-3 font-semibold text-white">Visão geral</p>
          <ul className="space-y-2 list-disc pl-5 text-slate-300">
            <li>4 habilidades avaliadas: Listening, Reading, Writing e Speaking.</li>
            <li>Perguntas baseadas em situações reais e descritores do Quadro CEFR.</li>
            <li>Feedback detalhado e recomendação de plano adaptado ao seu nível.</li>
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#09090d] p-5">
            <p className="text-sm uppercase tracking-[0.32em] text-amber-300">Tempo estimado</p>
            <p className="mt-2 text-3xl font-semibold text-white">6 a 8 minutos</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#09090d] p-5">
            <p className="text-sm uppercase tracking-[0.32em] text-amber-300">Resultado</p>
            <p className="mt-2 text-3xl font-semibold text-white">Nível CEFR + análise por habilidade</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">IA disponível</p>
          <p className="text-sm text-slate-200">{aiEnabled ? "Sim, com suporte a transcrição e feedback contextual." : "Modo offline: resultados estimados com base em descritores."}</p>
        </div>
        <Button onClick={() => setStep(1)} className="w-full sm:w-auto" size="lg">
          Começar o teste <ArrowRight className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderQuestion = (question) => {
    if (question.type === "multiple-choice") {
      return (
        <Card key={question.id} className="border-white/10 bg-[#0a0a0f]/95">
          <CardHeader>
            <CardTitle>{question.title}</CardTitle>
            <CardDescription>{question.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-300">{question.prompt}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleAnswerChange(question.id, option)}
                  className={`rounded-3xl border px-4 py-3 text-left text-sm transition-colors duration-200 ${answers[question.id] === option ? "border-amber-400 bg-amber-500/10 text-white" : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (question.type === "audio") {
      return (
        <Card key={question.id} className="border-white/10 bg-[#0a0a0f]/95">
          <CardHeader>
            <CardTitle>{question.title}</CardTitle>
            <CardDescription>{question.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-slate-300">{question.prompt}</p>
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Gravação de voz</p>
                    <p className="text-sm text-slate-400">Tempo: {recordingSeconds}s</p>
                  </div>
                  {isRecording ? (
                    <Button variant="destructive" onClick={stopRecording}>
                      Parar <StopCircle className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={startRecording}>
                      Gravar <Mic className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {recordingError && <p className="text-sm text-destructive-foreground">{recordingError}</p>}
                {speakingUrl && (
                  <audio controls src={speakingUrl} className="w-full rounded-3xl bg-[#050506]" />
                )}
              </div>
              <Textarea
                value={answers.speakingText}
                onChange={(event) => handleAnswerChange("speakingText", event.target.value)}
                placeholder="Opcional: escreva um apoio ao áudio ou revise sua transcrição..."
                className="min-h-[160px] bg-[#07070b] text-white"
              />
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={question.id} className="border-white/10 bg-[#0a0a0f]/95">
        <CardHeader>
          <CardTitle>{question.title}</CardTitle>
          <CardDescription>{question.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.passage && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-slate-200">
              <p className="text-sm leading-7">{question.passage}</p>
            </div>
          )}
          <p className="text-sm text-slate-300">{question.prompt}</p>
          <Textarea
            value={answers[question.id]}
            onChange={(event) => handleAnswerChange(question.id, event.target.value)}
            placeholder="Escreva sua resposta em inglês..."
            className="min-h-[160px] bg-[#07070b] text-white"
          />
        </CardContent>
      </Card>
    );
  };

  const renderQuestionnaire = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-[#09090d]/95 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Teste de Nivelamento CEFR</h2>
          <p className="mt-2 text-sm text-slate-300">Responda todas as perguntas para receber um feedback completo e alinhado ao Quadro Europeu.</p>
        </div>
        <div className="rounded-3xl bg-white/5 px-4 py-3 text-sm text-slate-200">
          Progresso: <span className="font-semibold text-white">{progress}%</span>
        </div>
      </div>

      {questions.map((question) => renderQuestion(question))}

      {serverError && <p className="rounded-3xl border border-destructive/10 bg-destructive/10 p-4 text-sm text-destructive-foreground">{serverError}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => navigate('/') }>
          Voltar à plataforma
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Enviando..." : "Finalizar e ver resultado"}
        </Button>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!results) {
      return null;
    }

    const plan = PLAN_DETAILS.find((item) => results.recommendedPlan === item.name) || PLAN_DETAILS.at(-1);

    return (
      <div className="space-y-6">
        <Card className="border-white/10 bg-[#0b0b0f]/95">
          <CardHeader>
            <CardTitle>Resultado do Nivelamento</CardTitle>
            <CardDescription>Feedback detalhado, nível CEFR e plano recomendado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-amber-300">Nível estimado</p>
                <p className="mt-3 text-4xl font-semibold text-white">{results.cefrLevel}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-amber-300">Plano recomendado</p>
                <p className="mt-3 text-4xl font-semibold text-white">{results.recommendedPlan}</p>
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-200">{results.feedbackSummary}</p>
          </CardContent>
          <CardFooter className="py-5">
            <p className="text-sm text-slate-300">{plan?.description}</p>
          </CardFooter>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {Object.entries(results.scores || {}).map(([key, value]) => (
            <Card key={key} className="border-white/10 bg-[#09090f]/95">
              <CardHeader>
                <CardTitle className="text-lg">{key.charAt(0).toUpperCase() + key.slice(1)}</CardTitle>
                <CardDescription>{key === "speaking" ? "Produção oral" : key === "writing" ? "Produção escrita" : key === "reading" ? "Compreensão de texto" : "Compreensão auditiva"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-semibold text-white">{value}</span>
                  <span className="text-sm text-slate-400">/100</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-white/10 bg-[#09090f]/95">
          <CardHeader>
            <CardTitle>Análise detalhada</CardTitle>
            <CardDescription>Forças e oportunidades de desenvolvimento no seu perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {results.feedbackDetails?.map((detail) => (
                <div key={detail.skill} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.24em] text-amber-300">{detail.skill}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{detail.text}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-emerald-500/10 bg-emerald-500/5 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Pontos fortes</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {results.strengths?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-amber-500/10 bg-amber-500/5 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-amber-300">Oportunidades</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {results.recommendations?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#09090f]/95">
          <CardHeader>
            <CardTitle>Transcrição de fala</CardTitle>
            <CardDescription>Texto gerado a partir do áudio gravado.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-slate-200">{audioTranscript || "Não foi possível transcrever o áudio."}</p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => navigate('/') }>
            Voltar à plataforma
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={resetTest}>
              Refazer teste
            </Button>
            <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Voltar ao topo
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPreForm = () => (
    <Card className="max-w-lg mx-auto border-white/10 bg-[#0b0b0f]/95">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-amber-400" />
          <CardTitle>Antes de começar</CardTitle>
        </div>
        <CardDescription>
          Preencha seus dados para receber o resultado personalizado do teste.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePreFormSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/50">Nome completo</label>
            <input
              type="text" required placeholder="Seu nome completo"
              value={preForm.nome}
              onChange={e => setPreForm(f => ({ ...f, nome: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/30 focus:border-amber-400/50 focus:outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/50">E-mail</label>
            <input
              type="email" required placeholder="seu@email.com"
              value={preForm.email}
              onChange={e => setPreForm(f => ({ ...f, email: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/30 focus:border-amber-400/50 focus:outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/50">WhatsApp</label>
            <input
              type="tel" required placeholder="(99) 99999-9999"
              value={preForm.whatsapp}
              onChange={e => setPreForm(f => ({ ...f, whatsapp: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/30 focus:border-amber-400/50 focus:outline-none transition-all"
            />
          </div>
          {preFormError && <p className="text-sm text-red-400">{preFormError}</p>}
          <Button type="submit" className="w-full mt-2" size="lg" disabled={preFormLoading}>
            {preFormLoading ? 'Aguarde...' : 'Iniciar Teste de Nivelamento'} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <main className="min-h-screen bg-[#050506] px-5 pb-24 pt-24 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        {step === -1 && renderPreForm()}
        {step === 0 && renderIntro()}
        {step === 1 && renderQuestionnaire()}
        {step === 2 && renderResults()}
      </div>
    </main>
  );
}

async function blobToBase64(blob) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result?.toString().split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

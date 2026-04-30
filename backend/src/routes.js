import express from "express";
import { storage } from "./storage.js";
import { requireAuth, requireRole, optionalAuth } from "./auth.js";
import bcrypt from "bcrypt";
import { google } from "googleapis";
import crypto from "crypto";

import {
  insertUserSchema, 
  insertProfileSchema,
  insertTeacherAvailabilitySchema,
  updateTeacherAvailabilitySchema,
  insertClassSchema,
  updateClassSchema,
  insertClassRescheduleSchema,
  updateClassRescheduleSchema,
  insertForumPostSchema,
  updateForumPostSchema,
  insertFeedbackSchema,
  updateFeedbackSchema
} from "../shared/schema.js";
import { z } from "zod";
import rateLimit from 'express-rate-limit';

// NOTE: uses in-memory store — safe for single-process only.
// For clustered/multi-instance deployment, switch to rate-limit-redis or rate-limit-postgres.
const authRateLimit = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many authentication requests. Please try again later.' });
  },
});

const assessmentSchema = z.object({
  listeningAnswer1: z.string().min(1),
  listeningAnswer2: z.string().min(1),
  readingAnswer1: z.string().min(1),
  readingAnswer2: z.string().min(1),
  writingAnswer: z.string().min(1),
  speakingAudioBase64: z.string().optional(),
  speakingText: z.string().optional(),
});

const okktoLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(1),
  ocupacao: z.string().optional(),
  nivel: z.string().optional(),
  periodo: z.string().optional(),
  plano: z.string().optional(),
  outrovalor: z.string().optional(),
});

const assessmentQuestions = [
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
    passage: "A student explains: 'My goal is to present ideas clearly in English during meetings and to participate in discussions without waiting for translations.'",
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

const planThresholds = [
  { name: "VIP", minimum: 85 },
  { name: "DIAMOND", minimum: 70 },
  { name: "GOLD", minimum: 55 },
  { name: "SILVER", minimum: 40 },
  { name: "BRONZE", minimum: 0 },
];

function getRecommendedPlan(score) {
  const normalizedScore = Number(score);
  if (!Number.isFinite(normalizedScore)) return 'BRONZE';
  return planThresholds.find((threshold) => normalizedScore >= threshold.minimum)?.name || 'BRONZE';
}

function normalize(text) {
  return (text || "").toString().trim().toLowerCase();
}

function countWords(text) {
  return normalize(text).split(/\s+/).filter(Boolean).length;
}

function scoreListening(answer1, answer2) {
  const first = normalize(answer1);
  const second = normalize(answer2);
  let score = 0;

  if (first.includes("confidence") || first.includes("confiança") || first.includes("speak")) {
    score += 50;
  } else {
    score += 20;
  }

  if (second.includes("practice speaking") || second.includes("daily")) {
    score += 50;
  } else {
    score += 20;
  }

  return Math.min(score, 100);
}

function scoreReading(answer1, answer2) {
  const combined = normalize(`${answer1} ${answer2}`);
  let score = 20;
  const words = countWords(combined);

  if (words >= 25) score += 35;
  else if (words >= 18) score += 25;
  else if (words >= 12) score += 15;
  else score += 10;

  const keywords = ["speak", "confidence", "meetings", "improve", "practice", "participate", "discussion", "ideas", "clear"];
  const matches = keywords.filter((keyword) => combined.includes(keyword)).length;
  score += Math.min(matches * 7, 40);

  return Math.min(score, 100);
}

function scoreWriting(answer) {
  const text = normalize(answer);
  let score = 15;
  const words = countWords(text);

  score += Math.min(words * 3, 50);
  score += text.includes("because") || text.includes("although") ? 10 : 0;
  score += text.includes("would") || text.includes("want") || text.includes("need") ? 10 : 0;
  score += text.includes("and") || text.includes("but") || text.includes("so") ? 5 : 0;

  const connectors = ["however", "although", "therefore", "while", "despite"];
  if (connectors.some((word) => text.includes(word))) {
    score += 10;
  }

  return Math.min(score, 100);
}

function scoreSpeaking(transcript) {
  const text = normalize(transcript);
  if (!text) {
    return 30;
  }

  let score = 20;
  const words = countWords(text);
  score += Math.min(words * 4, 50);
  score += text.includes("because") || text.includes("although") ? 10 : 0;
  score += text.includes("and") || text.includes("but") || text.includes("so") ? 10 : 0;

  if (/\b(uh|um|like|you know)\b/.test(text)) {
    score -= 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

function getCefrLevel(average) {
  if (average >= 88) return "C1";
  if (average >= 75) return "B2";
  if (average >= 60) return "B1";
  if (average >= 45) return "A2";
  return "A1";
}

function getCefrDescriptor(level) {
  const descriptors = {
    A1: "Você entende e usa frases simples para necessidades básicas.",
    A2: "Você comunica ideias simples e consegue participar de situações cotidianas com suporte.",
    B1: "Você entende textos familiares e consegue narrar experiências pessoais com alguma fluência.",
    B2: "Você compreende textos complexos e interage com clareza em contextos profissionais e sociais.",
    C1: "Você usa o inglês de forma eficiente, com boa expressão e controle de nuances avançadas.",
  };
  return descriptors[level] || "Seu nível indica domínio básico do inglês.";
}

function buildPlacementFeedback(scores, level) {
  const average = Math.round((scores.listening + scores.reading + scores.writing + scores.speaking) / 4);
  const summary = `Este teste estima um nível ${level} no Quadro CEFR, com média geral de ${average} pontos. A avaliação combina compreensão oral, leitura, escrita e produção falada para oferecer uma indicação realista do seu perfil.`;

  const details = [
    {
      skill: "Listening",
      text:
        scores.listening >= 80
          ? "Você demonstrou boa compreensão da intenção e recomendações em falas curtas. Continue praticando a identificação de contextos e nuances orais."
          : "Você precisa fortalecer a compreensão de instruções e falas naturais; pratique diálogos curtos e foco em ideia principal.",
    },
    {
      skill: "Reading",
      text:
        scores.reading >= 80
          ? "Sua leitura mostra que você entende a mensagem principal e consegue parafrasear com precisão." 
          : "A leitura precisa de mais prática em inferência e elaboração de respostas claras em inglês.",
    },
    {
      skill: "Writing",
      text:
        scores.writing >= 80
          ? "Sua escrita está bem organizada e usa estruturas funcionais. Agora, refine a precisão e o vocabulário acadêmico/profissional." 
          : "Foque em desenvolver frases completas, uso de conectores e clareza de propósito na escrita em inglês.",
    },
    {
      skill: "Speaking",
      text:
        scores.speaking >= 80
          ? "Sua fala mostra fluência e uso de sentenças conectadas, o que é positivo para níveis altos do CEFR." 
          : "Trabalhe a fluência natural e reduza pausas com 'uh' e 'um', além de usar estruturas completas em inglês falado.",
    },
  ];

  const strengths = [];
  const recommendations = [];

  if (scores.listening >= 80) strengths.push("Boa compreensão oral em contextos cotidianos.");
  else recommendations.push("Pratique ouvir diálogos curtos e identificar a ideia principal.");

  if (scores.reading >= 80) strengths.push("Boa interpretação de texto e compreensão de mensagens indiretas.");
  else recommendations.push("Leia textos curtos e resuma a ideia principal em inglês.");

  if (scores.writing >= 80) strengths.push("Bom uso de estruturas escritas claras e coerentes.");
  else recommendations.push("Escreva respostas curtas com introdução, desenvolvimento e conclusão.");

  if (scores.speaking >= 80) strengths.push("Fluência oral consistente com frases conectadas.");
  else recommendations.push("Grave respostas curtas e pratique conectar ideias com 'and', 'but' e 'because'.");

  if (strengths.length === 0) strengths.push("Seu perfil mostra áreas claras para ganhar confiança com prática estruturada.");
  if (recommendations.length === 0) recommendations.push("Mantenha o seu ritmo atual e priorize inglês ativo em contextos reais.");

  return {
    feedbackSummary: `${summary} ${getCefrDescriptor(level)}`,
    feedbackDetails: details,
    strengths,
    recommendations,
  };
}

function parseJsonSafe(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function getOkktoConfig() {
  const apiUrl = process.env.OKKTO_API_URL?.trim();
  const apiKey = process.env.OKKTO_API_KEY?.trim();
  if (!apiUrl || !apiKey) {
    return null;
  }
  return { apiUrl, apiKey };
}

async function createOkktoLead(leadData) {
  const config = getOkktoConfig();
  if (!config) {
    console.info('Okkto CRM is not configured, skipping lead creation');
    return null;
  }

  const payload = {
    name: leadData.name,
    email: leadData.email,
    phone: leadData.whatsapp,
    occupation: leadData.ocupacao,
    current_level: leadData.nivel,
    preferred_time: leadData.periodo,
    plan_interest: leadData.plano,
    available_budget: leadData.outrovalor,
    source: 'Be Fluent Homepage Diagnostic',
    tags: ['diagnóstico', 'nivelamento'],
  };

  const apiKeyHeader = process.env.OKKTO_API_KEY_HEADER?.trim() || 'Authorization';
  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKeyHeader.toLowerCase() === 'authorization') {
    headers.Authorization = `Bearer ${config.apiKey}`;
  } else {
    headers[apiKeyHeader] = config.apiKey;
  }

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Okkto lead creation failed:', response.status, text);
    throw new Error('Okkto lead creation failed');
  }

  return response.json();
}

async function transcribeAudioWithOpenAI(base64Audio) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const audioBuffer = Buffer.from(base64Audio, "base64");
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: "audio/webm" });
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      console.error("OpenAI transcription failed", await response.text());
      return null;
    }

    const result = await response.json();
    return result.text || null;
  } catch (error) {
    console.error("OpenAI transcription error:", error);
    return null;
  }
}

async function evaluateWithOpenAI(data) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const systemPrompt = `You are an English placement assistant. Evaluate four skills: listening, reading, writing, and speaking. Return only valid JSON with keys listeningScore, readingScore, writingScore, speakingScore, and speakingTranscript. Use values from 0 to 100 and make scores match the submitted answers.`;
    const userPrompt = `Listening answer: ${data.listeningAnswer}\nReading answer: ${data.readingAnswer}\nWriting answer: ${data.writingAnswer}\nSpeaking transcript: ${data.speakingTranscript || "(no transcript)"}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.25,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI evaluation failed", await response.text());
      return null;
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    return parseJsonSafe(content || "");
  } catch (error) {
    console.error("OpenAI evaluation error:", error);
    return null;
  }
}

// Import marketing automation service 
import { marketingAutomation as marketingAutomationService } from './marketing-automation-service.js';

// Import Asaas service
import { createAsaasService } from './services/asaas.js';

// Student-specific validation schemas
const createStudentSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  cpf: z.string().min(11, "CPF deve ter pelo menos 11 caracteres"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  birth_date: z.string().transform(str => new Date(str)),
  address: z.string().min(1, "Endereço é obrigatório"),
  student_level: z.string().optional(),
  monthly_fee: z.number().positive("Valor da mensalidade deve ser positivo"),
  payment_due_date: z.number().min(1).max(31),
  is_active: z.boolean().optional().default(true)
});

const updateStudentSchema = createStudentSchema.partial();

// Google Meet integration
async function generateGoogleMeetLink(classData) {
  try {
    // Validate input data to prevent runtime errors
    if (!classData.scheduled_at || !(classData.scheduled_at instanceof Date)) {
      console.warn('Invalid scheduled_at date provided to generateGoogleMeetLink, using fallback');
      return generateFallbackMeetLink();
    }

    if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.info('Google credentials not available, using fallback Meet link');
      return generateFallbackMeetLink();
    }

    // TODO real Google Calendar API integration with OAuth2
    // For now, using fallback but with proper structure for future implementation

    /* FUTURE IMPLEMENTATION:
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:5000/auth/google/callback'
    );

    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: 'Be Fluent School - Power Talk Session',
      description: 'Individual English conversation session with Be Fluent School',
      start: {
        dateTime: classData.scheduled_at.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(classData.scheduled_at.getTime() + (classData.duration_minutes || 60) * 60000).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${classData.student_id}-${classData.teacher_id}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      attendees: []
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1
    });

    return response.data.conferenceData?.entryPoints?.[0]?.uri || generateFallbackMeetLink();
    */

    return generateFallbackMeetLink();

  } catch (error) {
    console.error('Error in generateGoogleMeetLink:', error);
    return generateFallbackMeetLink();
  }
}

// Generate consistent fallback Meet link
function generateFallbackMeetLink() {
  // Use more predictable format for fallback links
  const meetingId = Math.random().toString(36).substring(2, 12);
  return `https://meet.google.com/${meetingId}`;
}

// Duration validation schema
const durationQuerySchema = z.object({
  duration: z.coerce.number().min(15).max(180).multipleOf(15).optional().default(60)
});

// Auth schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'student', 'teacher']).default('student')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

const requestPasswordResetSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6)
});

export async function registerRoutes(app) {
  // Authentication routes
  app.post("/api/auth/register", authRateLimit, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Create user
      const user = await storage.createUser({
        username: data.username,
        password: hashedPassword
      });

      // Create profile
      const profile = await storage.createProfile({
        user_id: user.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role
      });

      res.status(201).json({ 
        message: "User created successfully",
        user: { id: user.id, username: user.username },
        profile: { id: profile.id, full_name: profile.full_name, email: profile.email, role: profile.role }
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", authRateLimit, async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string().min(1),
        password: z.string().min(1)
      });

      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const profile = await storage.getProfileByUserId(user.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ message: "Session creation failed" });
        }

        req.session.userId = user.id;
        req.session.profileId = profile.id;

        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ message: "Session save failed" });
          }

          res.json({
            message: "Login successful",
            user: { id: user.id, username: user.username },
            profile: { 
              id: profile.id, 
              full_name: profile.full_name, 
              email: profile.email, 
              role: profile.role,
              student_level: profile.student_level,
              is_active: profile.is_active,
              must_change_password: user.must_change_password === true,
            }
          });
        });
      });
    } catch (error) {
      console.error("Login error details:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }

      if (error.code) {
        console.error("Database error code:", error.code);
      }

      res.status(500).json({ 
        message: "Internal server error",
        ...(process.env.NODE_ENV !== 'production' ? { error: error.message } : {})
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // SECURITY password change route
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const data = changePasswordSchema.parse(req.body);
      const userId = req.user.id;

      // Get user and verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedNewPassword = await bcrypt.hash(data.newPassword, 12);
      await storage.updateUser(userId, { 
        password: hashedNewPassword,
        must_change_password: false,
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // SECURITY reset request (generates secure token)
  app.post("/api/auth/request-password-reset", authRateLimit, async (req, res) => {
    try {
      const data = requestPasswordResetSchema.parse(req.body);

      // Find user by username (which could be email)
      const user = await storage.getUserByUsername(data.email);
      if (!user) {
        // Don't reveal if user exists for security
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await storage.setPasswordResetToken(user.id, resetToken, resetExpires);

      // TODO: send secure email with reset link
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Password reset token generated for ${data.email}`);
      }

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Password reset request error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // SECURITY reset with token
  app.post("/api/auth/reset-password", authRateLimit, async (req, res) => {
    try {
      const data = resetPasswordSchema.parse(req.body);

      // Find user by valid reset token
      const user = await storage.getUserByResetToken(data.token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(data.newPassword, 12);
      await storage.updateUser(user.id, { 
        password: hashedPassword,
        must_change_password: false,
        password_reset_token: null,
        password_reset_expires: null
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CRM Oktto — create lead
  app.post("/api/marketing/okkto-lead", async (req, res) => {
    try {
      const { name, email, whatsapp, source, ...extra } = req.body;

      const FUNNEL_ID = '69373f229c7fb6c8d351bd7c';
      const STAGE_ID  = '69373f239c7fb6c8d351bdcf';
      const TEAM_ID   = '69373ce29c7fb6c8d3500837';
      const API_KEY   = process.env.OKTTO_API_KEY;

      if (!API_KEY) {
        console.warn('OKTTO_API_KEY not set — lead not forwarded');
        return res.json({ ok: true, forwarded: false });
      }

      const payload = {
        name: name || 'Lead',
        email,
        phone: whatsapp,
        funnel_id: FUNNEL_ID,
        stage_id: STAGE_ID,
        team_id: TEAM_ID,
      };

      console.log('Oktto payload:', JSON.stringify(payload));

      const response = await fetch('https://api.oktto.com.br/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      console.log(`Oktto leads: ${response.status}`, JSON.stringify(data));
      const forwarded = response.ok || response.status === 201;

      return res.json({ ok: true, forwarded });
    } catch (error) {
      console.error('Oktto lead error:', error.message);
      return res.json({ ok: true, forwarded: false });
    }
  });

  // Check current auth status
  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        // Clear invalid session
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
        });
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user profile
      const profile = await storage.getProfileByUserId(userId);
      if (!profile) {
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
        });
        return res.status(401).json({ message: "Profile not found" });
      }

      res.json({
        user: { id: user.id, username: user.username },
        profile: { 
          id: profile.id, 
          full_name: profile.full_name, 
          email: profile.email, 
          role: profile.role,
          student_level: profile.student_level,
          is_active: profile.is_active,
          must_change_password: user.must_change_password === true,
        }
      });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/profile", requireAuth, async (req, res) => {
    res.json({
      user: { id: req.user.id, username: req.user.username },
      profile: req.user.profile
    });
  });

  // Teacher availability routes
  app.get("/api/teacher-availability/:teacherId", requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      const userProfile = req.user.profile;

      // SECURITY allow teacher to access their own availability or admin
      if (userProfile.role === 'teacher' && userProfile.id !== teacherId) {
        return res.status(403).json({ message: 'Access denied can only view your own availability' });
      }

      const availability = await storage.getTeacherAvailability(teacherId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching teacher availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/teacher-availability", requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const data = insertTeacherAvailabilitySchema.parse(req.body);
      const userProfile = req.user.profile;

      // SECURITY teacher_id matches authenticated user (teachers can only create their own availability)
      if (userProfile.role === 'teacher' && data.teacher_id !== userProfile.id) {
        return res.status(403).json({ message: 'Access denied can only create availability for yourself' });
      }

      const availability = await storage.createTeacherAvailability(data);
      res.status(201).json(availability);
    } catch (error) {
      console.error("Error creating teacher availability:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
        return res.status(409).json({ message: "Teacher availability already exists for this time slot" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/teacher-availability/:id", requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateTeacherAvailabilitySchema.parse(req.body);
      const userProfile = req.user.profile;

      // SECURITY ownership before updating
      const existingAvailability = await storage.getTeacherAvailabilityById(id);
      if (!existingAvailability) {
        return res.status(404).json({ message: "Teacher availability not found" });
      }

      // Only allow teacher to update their own availability or admin
      if (userProfile.role === 'teacher' && existingAvailability.teacher_id !== userProfile.id) {
        return res.status(403).json({ message: 'Access denied can only update your own availability' });
      }

      // Prevent teacher_id changes if updating teacher is not admin
      if (userProfile.role === 'teacher' && data.teacher_id && data.teacher_id !== userProfile.id) {
        return res.status(403).json({ message: 'Access denied cannot change the teacher_id to another teacher' });
      }

      const availability = await storage.updateTeacherAvailability(id, data);
      res.json(availability);
    } catch (error) {
      console.error("Error updating teacher availability:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/teacher-availability/:id", requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;

      // SECURITY ownership before deleting
      const existingAvailability = await storage.getTeacherAvailabilityById(id);
      if (!existingAvailability) {
        return res.status(404).json({ message: "Teacher availability not found" });
      }

      // Only allow teacher to delete their own availability or admin
      if (userProfile.role === 'teacher' && existingAvailability.teacher_id !== userProfile.id) {
        return res.status(403).json({ message: 'Access denied can only delete your own availability' });
      }

      const deleted = await storage.deleteTeacherAvailability(id);
      res.json({ message: "Teacher availability deleted successfully" });
    } catch (error) {
      console.error("Error deleting teacher availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Classes routes - specific routes first, then generic ones
  // Today's classes count (must come before /api/classes/:id)
  app.get("/api/classes/today", requireAuth, async (req, res) => {
    try {
      const todayCount = await storage.getTodayClassesCount();
      res.json({ count: todayCount });
    } catch (error) {
      console.error("Error fetching today's classes count:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upcoming classes (next 48h) for admin dashboard
  app.get("/api/classes/upcoming", requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const upcoming = await storage.getUpcomingClasses(48);
      res.json(upcoming);
    } catch (error) {
      console.error("Error fetching upcoming classes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin dashboard consolidated stats
  app.get("/api/admin/stats", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/classes/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;

      const classData = await storage.getClass(id);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      // SECURITY allow student, teacher of this class, or admin to view
      if (userProfile.role !== 'admin' && 
          userProfile.id !== classData.student_id && 
          userProfile.id !== classData.teacher_id) {
        return res.status(403).json({ message: 'Access denied can only view classes you are involved in' });
      }

      res.json(classData);
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get teachers list
  app.get("/api/teachers", requireAuth, async (req, res) => {
    try {
      const teachers = await storage.getAllTeachers();
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/classes/teacher/:teacherId", requireAuth, async (req, res) => {
    try {
      const { teacherId } = req.params;
      const userProfile = req.user.profile;

      // SECURITY allow teacher to access their own classes or admin
      if (userProfile.role !== 'admin' && userProfile.id !== teacherId) {
        return res.status(403).json({ message: 'Access denied can only view your own classes' });
      }

      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const classes = await storage.getClassesByTeacher(teacherId, start, end);
      res.json(classes);
    } catch (error) {
      console.error("Error fetching teacher classes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/classes/student/:studentId", requireAuth, async (req, res) => {
    try {
      // SECURITY allow users to see their own classes (or admins/teachers to see any)
      const requestedStudentId = req.params.studentId;
      const userProfile = req.user.profile;

      // Students can only see their own classes
      if (userProfile.role === 'student' && userProfile.id !== requestedStudentId) {
        return res.status(403).json({ message: 'Access denied can only view your own classes' });
      }
      // Teachers and admins can view any student's classes

      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const classes = await storage.getClassesByStudent(requestedStudentId, start, end);
      res.json(classes);
    } catch (error) {
      console.error("Error fetching student classes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/classes", requireAuth, async (req, res) => {
    try {
      // SECURITY only safe fields from client, student_id comes from authenticated session
      const { teacher_id, scheduled_at, duration_minutes } = req.body;

      // Only allow students to book classes for themselves
      if (req.user.profile.role !== 'student') {
        return res.status(403).json({ message: 'Only students can book classes' });
      }

      // SECURITY FIX use authenticated user's profile ID, never trust client-provided student_id
      const classData = {
        student_id: req.user.profile.id, // ALWAYS from authenticated session
        teacher_id,
        scheduled_at: new Date(scheduled_at), // Ensure proper Date conversion
        duration_minutes: duration_minutes || 60
      };

      // Validate the class data
      const validatedData = insertClassSchema.parse(classData);

      // Check for student's existing class conflicts (double-booking prevention)
      const studentHasConflict = await storage.checkStudentClassConflict(
        req.user.profile.id,
        validatedData.scheduled_at,
        validatedData.duration_minutes || 60
      );

      if (studentHasConflict) {
        return res.status(409).json({ 
          message: 'You already have a class scheduled during this time. Please choose a different time slot.' 
        });
      }

      // Generate Google Meet link for the class - ensure duration_minutes is defined
      const meetLinkData = {
        scheduled_at: validatedData.scheduled_at,
        duration_minutes: validatedData.duration_minutes || 60,
        student_id: validatedData.student_id,
        teacher_id: validatedData.teacher_id
      };
      const meetLink = await generateGoogleMeetLink(meetLinkData);

      // Add the meet link to the class data
      const classWithMeetLink = {
        ...validatedData,
        meet_link: meetLink
      };

      const createdClass = await storage.createClass(classWithMeetLink);
      res.status(201).json(createdClass);
    } catch (error) {
      console.error("Error creating class:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      if (error instanceof Error && (
        error.message === 'Schedule conflict detected' || 
        error.message === 'Class scheduled outside teacher availability'
      )) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/classes/:id", requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateClassSchema.parse(req.body);
      const userProfile = req.user.profile;

      // SECURITY ownership before updating
      const existingClass = await storage.getClass(id);
      if (!existingClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Only allow teacher of this class or admin to update
      if (userProfile.role === 'teacher' && userProfile.id !== existingClass.teacher_id) {
        return res.status(403).json({ message: 'Access denied can only update your own classes' });
      }

      const classData = await storage.updateClass(id, data);
      res.json(classData);
    } catch (error) {
      console.error("Error updating class:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      if (error instanceof Error && (
        error.message === 'Schedule conflict detected' || 
        error.message === 'Class scheduled outside teacher availability'
      )) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/classes/:id", requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;

      // SECURITY ownership before deleting
      const existingClass = await storage.getClass(id);
      if (!existingClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Only allow teacher of this class or admin to delete
      if (userProfile.role === 'teacher' && userProfile.id !== existingClass.teacher_id) {
        return res.status(403).json({ message: 'Access denied can only delete your own classes' });
      }

      const deleted = await storage.deleteClass(id);
      res.json({ message: "Class deleted successfully" });
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Available slots route
  app.get("/api/available-slots/:teacherId/:date", requireAuth, async (req, res) => {
    try {
      const { teacherId, date } = req.params;
      const durationValidation = durationQuerySchema.safeParse(req.query);

      if (!durationValidation.success) {
        return res.status(400).json({ 
          message: "Invalid duration. Must be between 15-180 minutes and multiple of 15", 
          errors: durationValidation.error.errors 
        });
      }

      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const slotDuration = durationValidation.data.duration;
      const slots = await storage.getAvailableSlots(teacherId, targetDate, slotDuration);
      res.json({ 
        date: date,
        teacher_id: teacherId,
        duration_minutes: slotDuration,
        available_slots: slots
      });
    } catch (error) {
      console.error("Error fetching available slots:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Weekly availability overview
  app.get("/api/weekly-availability/:teacherId", requireAuth, async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { startDate } = req.query;

      const durationValidation = durationQuerySchema.safeParse(req.query);
      if (!durationValidation.success) {
        return res.status(400).json({ 
          message: "Invalid duration. Must be between 15-180 minutes and multiple of 15", 
          errors: durationValidation.error.errors 
        });
      }

      const baseDate = startDate ? new Date(startDate) : new Date();
      if (isNaN(baseDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const slotDuration = durationValidation.data.duration;

      // Get availability for the week using UTC consistently
      const weeklySlots = [];
      for (let i = 0; i < 7; i++) {
        // Create date in UTC to avoid DST issues
        const utcYear = baseDate.getUTCFullYear();
        const utcMonth = baseDate.getUTCMonth();
        const utcDate = baseDate.getUTCDate() + i;
        const currentDate = new Date(Date.UTC(utcYear, utcMonth, utcDate));

        const slots = await storage.getAvailableSlots(teacherId, currentDate, slotDuration);
        weeklySlots.push({
          date: currentDate.toISOString().split('T')[0],
          day_name: new Intl.DateTimeFormat('pt-BR', { 
            weekday: 'long', 
            timeZone: 'UTC' 
          }).format(currentDate),
          available_slots: slots
        });
      }

      res.json({
        teacher_id: teacherId,
        week_start: baseDate.toISOString().split('T')[0],
        duration_minutes: slotDuration,
        weekly_availability: weeklySlots
      });
    } catch (error) {
      console.error("Error fetching weekly availability:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Class reschedule routes
  app.get("/api/class-reschedules/:classId", requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { classId } = req.params;
      const reschedules = await storage.getClassReschedules(classId);
      res.json(reschedules);
    } catch (error) {
      console.error("Error fetching class reschedules:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/class-reschedules", requireAuth, async (req, res) => {
    try {
      const data = insertClassRescheduleSchema.parse(req.body);
      const reschedule = await storage.createClassReschedule(data);
      res.status(201).json(reschedule);
    } catch (error) {
      console.error("Error creating class reschedule:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      if (error instanceof Error && (
        error.message === 'Reschedule request has schedule conflict' ||
        error.message === 'Reschedule request outside teacher availability' ||
        error.message === 'Class not found'
      )) {
        const statusCode = error.message === 'Class not found' ? 404 : 409;
        return res.status(statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/class-reschedules/:id", requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateClassRescheduleSchema.parse(req.body);
      const reschedule = await storage.updateClassReschedule(id, data);

      if (!reschedule) {
        return res.status(404).json({ message: "Class reschedule not found" });
      }

      res.json(reschedule);
    } catch (error) {
      console.error("Error updating class reschedule:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      if (error instanceof Error && (
        error.message === 'Reschedule request has schedule conflict' ||
        error.message === 'Reschedule request outside teacher availability'
      )) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/pending-reschedules", requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { teacherId } = req.query;
      const reschedules = await storage.getPendingReschedules(teacherId | undefined);
      res.json(reschedules);
    } catch (error) {
      console.error("Error fetching pending reschedules:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/class-reschedules/student/:studentId", requireAuth, async (req, res) => {
    try {
      const { studentId } = req.params;
      const userProfile = req.user.profile;

      // SECURITY allow student to access their own reschedules or admin
      if (userProfile.role !== 'admin' && userProfile.id !== studentId) {
        return res.status(403).json({ message: 'Access denied can only view your own reschedule requests' });
      }

      const reschedules = await storage.getStudentReschedules(studentId);
      res.json(reschedules);
    } catch (error) {
      console.error("Error fetching student reschedules:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Profiles/Users routes
  app.get("/api/profiles", requireAuth, async (req, res) => {
    try {
      // SECURITY admins can list all profiles  
      const userProfile = req.user.profile;
      if (userProfile.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const profiles = await storage.getAllProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enhanced profiles endpoint for feedback recipients  
  app.get("/api/profiles/recipients", requireAuth, async (req, res) => {
    try {
      const { role } = req.query;
      const userProfile = req.user.profile;

      let profiles = [];

      if (!role || role === 'all') {
        // Return available recipients based on user role permissions
        if (userProfile.role === 'student') {
          profiles = await storage.getAllTeachers();
        } else if (userProfile.role === 'teacher') {
          profiles = await storage.getAllStudents();
        } else if (userProfile.role === 'admin') {
          const teachers = await storage.getAllTeachers();
          const students = await storage.getAllStudents();
          profiles = [...teachers, ...students];
        }
      } else {
        // Filter by specific role if user has permission
        switch (role) {
          case 'teacher':
            if (userProfile.role === 'student' || userProfile.role === 'admin') {
              profiles = await storage.getAllTeachers();
            } else {
              return res.status(403).json({ message: "Teachers cannot give feedback to other teachers" });
            }
            break;
          case 'student':
            if (userProfile.role === 'teacher' || userProfile.role === 'admin') {
              profiles = await storage.getAllStudents();
            } else {
              return res.status(403).json({ message: "Students cannot give feedback to other students" });
            }
            break;
          default:
            return res.status(400).json({ message: "Invalid role parameter" });
        }
      }

      // Return simplified profile data for recipient selection
      const recipients = profiles.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        email: profile.email
      }));

      res.json(recipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Student management routes
  app.get("/api/students", requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/students/active", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const students = await storage.getActiveStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching active students:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/students/inactive", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const students = await storage.getInactiveStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching inactive students:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/students/search", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search term is required" });
      }
      const students = await storage.searchStudents(q);
      res.json(students);
    } catch (error) {
      console.error("Error searching students:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/students/stats", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getStudentStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching student stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/students", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const validatedData = createStudentSchema.parse(req.body);

      // Check if email already exists
      const existingUser = await storage.getUserByUsername(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está cadastrado no sistema" });
      }

      // Create user account first with secure temporary password
      const tempPassword = crypto.randomBytes(12).toString('base64');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      const user = await storage.createUser({
        username: validatedData.email,
        password: hashedPassword
      });

      // Create student profile
      const student = await storage.createProfile({
        ...validatedData,
        user_id: user.id,
        role: 'student'
      });

      res.status(201).json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      if (error.code === '23505') {
        return res.status(400).json({ message: "Este email já está cadastrado no sistema" });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.put("/api/students/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateStudentSchema.parse(req.body);

      const student = await storage.updateProfile(id, validatedData);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/students/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;

      const success = await storage.deleteStudent(id);
      if (!success) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Forum routes
  app.get("/api/forum/posts", optionalAuth, async (req, res) => {
    try {
      const { authorId, category } = req.query;
      const posts = await storage.getForumPosts(
        authorId | undefined,
        category | undefined
      );
      res.json(posts);
    } catch (error) {
      console.error("Error fetching forum posts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/forum/posts", requireAuth, async (req, res) => {
    try {
      const userProfile = req.user.profile;

      // SECURITY author_id from authenticated user, never trust client
      const postData = {
        ...req.body,
        author_id: userProfile.id // Always use authenticated user
      };

      const validatedData = insertForumPostSchema.parse(postData);
      const post = await storage.createForumPost(validatedData);

      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating forum post:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/forum/posts/:id", optionalAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getForumPost(id);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json(post);
    } catch (error) {
      console.error("Error fetching forum post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Forum likes endpoints
  app.post("/api/forum/posts/:id/like", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;

      // Check if post exists
      const post = await storage.getForumPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const like = await storage.addLike(id, userProfile.id);
      const likesCount = await storage.getPostLikesCount(id);

      res.json({ 
        message: "Post liked successfully",
        like,
        likesCount
      });
    } catch (error) {
      console.error("Error liking post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/forum/posts/:id/unlike", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;

      // Check if post exists
      const post = await storage.getForumPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const success = await storage.removeLike(id, userProfile.id);
      if (!success) {
        return res.status(400).json({ message: "Like not found" });
      }

      const likesCount = await storage.getPostLikesCount(id);

      res.json({ 
        message: "Post unliked successfully",
        likesCount
      });
    } catch (error) {
      console.error("Error unliking post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/forum/posts/:id/likes", optionalAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if post exists
      const post = await storage.getForumPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const likesCount = await storage.getPostLikesCount(id);
      let isLiked = false;

      // Check if current user has liked this post
      if (req.user?.profile?.id) {
        const userLike = await storage.getUserLike(id, req.user.profile.id);
        isLiked = !!userLike;
      }

      res.json({ 
        likesCount,
        isLiked
      });
    } catch (error) {
      console.error("Error fetching post likes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Forum comments endpoints
  app.get("/api/forum/posts/:id/comments", optionalAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if post exists
      const post = await storage.getForumPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const comments = await storage.getForumReplies(id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching post comments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/forum/posts/:id/comments", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;

      // Check if post exists
      const post = await storage.getForumPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Create comment data
      const commentData = {
        ...req.body,
        author_id: userProfile.id, // Always use authenticated user
        parent_id: id, // This makes it a comment/reply to the post
        is_question: false // Comments are not questions
      };

      const validatedData = insertForumPostSchema.parse(commentData);
      const comment = await storage.createForumPost(validatedData);

      // Get the full comment with author info
      const fullComment = await storage.getForumPost(comment.id);

      res.status(201).json(fullComment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Feedback routes
  app.get("/api/feedbacks", requireAuth, async (req, res) => {
    try {
      const userProfile = req.user.profile;
      const { type, user_id } = req.query;

      // Get feedbacks based on query parameters
      const feedbacks = await storage.getFeedbacks(
        user_id || undefined,
        type || undefined
      );

      // Filter results based on user role for security
      const filteredFeedbacks = feedbacks.filter(feedback => {
        // Admin can see all
        if (userProfile.role === 'admin') return true;

        // Users can see feedbacks they are involved in
        return feedback.from_user_id === userProfile.id || 
               feedback.to_user_id === userProfile.id ||
               feedback.to_user_id === null; // General feedback
      });

      res.json(filteredFeedbacks);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/feedbacks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;

      const feedback = await storage.getFeedback(id);
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // SECURITY allow access to users involved in the feedback or admin
      if (userProfile.role !== 'admin' && 
          feedback.from_user_id !== userProfile.id && 
          feedback.to_user_id !== userProfile.id &&
          feedback.to_user_id !== null) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/feedbacks", requireAuth, async (req, res) => {
    try {
      const userProfile = req.user.profile;

      // Parse and validate feedback data
      const feedbackData = {
        ...req.body,
        from_user_id: userProfile.id, // Always use authenticated user
      };

      const validatedData = insertFeedbackSchema.parse(feedbackData);

      // Additional role-based validation
      switch (validatedData.feedback_type) {
        case 'teacher':
          if (userProfile.role === 'student' && !validatedData.to_user_id) {
            return res.status(400).json({ message: "Teacher feedback requires a recipient" });
          }
          if (userProfile.role === 'teacher') {
            return res.status(403).json({ message: "Teachers cannot give feedback to other teachers" });
          }
          break;
        case 'student':
          if (userProfile.role === 'student') {
            return res.status(403).json({ message: "Students cannot give feedback to other students" });
          }
          if (!validatedData.to_user_id) {
            return res.status(400).json({ message: "Student feedback requires a recipient" });
          }
          break;
        case 'general':
          // General feedback doesn't require a specific recipient
          validatedData.to_user_id = null;
          break;
        case 'class':
          // Class feedback can be general or specific to a teacher
          if (!validatedData.class_id && !validatedData.to_user_id) {
            return res.status(400).json({ message: "Class feedback requires either a class ID or teacher recipient" });
          }
          break;
      }

      const feedback = await storage.createFeedback(validatedData);
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/feedbacks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;

      // Check if feedback exists
      const existingFeedback = await storage.getFeedback(id);
      if (!existingFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // SECURITY allow feedback author or admin to update
      if (existingFeedback.from_user_id !== userProfile.id && userProfile.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied cannot update this feedback' });
      }

      // Parse and validate feedback data
      const feedbackData = {
        ...req.body,
        from_user_id: existingFeedback.from_user_id, // Keep original author
      };

      const validatedData = updateFeedbackSchema.parse(feedbackData);

      const updatedFeedback = await storage.updateFeedback(id, validatedData);
      if (!updatedFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      res.json(updatedFeedback);
    } catch (error) {
      console.error("Error updating feedback:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/feedbacks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;

      // Check if feedback exists
      const existingFeedback = await storage.getFeedback(id);
      if (!existingFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // SECURITY allow feedback author or admin to delete
      if (existingFeedback.from_user_id !== userProfile.id && userProfile.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied cannot delete this feedback' });
      }

      const deleted = await storage.deleteFeedback(id);
      if (!deleted) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/feedbacks/:id/respond", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { response } = req.body;
      const userProfile = req.user.profile;

      if (!response || typeof response !== 'string') {
        return res.status(400).json({ message: "Response text is required" });
      }

      // Check if feedback exists
      const existingFeedback = await storage.getFeedback(id);
      if (!existingFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // SECURITY allow feedback recipient, admin, or teachers to respond
      const canRespond = userProfile.role === 'admin' ||
                        userProfile.role === 'teacher' ||
                        existingFeedback.to_user_id === userProfile.id;

      if (!canRespond) {
        return res.status(403).json({ message: 'Access denied cannot respond to this feedback' });
      }

      const feedback = await storage.respondToFeedback(id, response, userProfile.id);
      res.json(feedback);
    } catch (error) {
      console.error("Error responding to feedback:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===========================================
  // ANNOUNCEMENTS ROUTES
  // ===========================================
  
  // Payment Settings endpoints (admin only)
  app.get("/api/settings/payments", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const settings = await storage.getPaymentSettings();
      res.json({
        activeProvider: 'asaas',
        asaasApiToken: settings.asaasApiToken ? '****' + settings.asaasApiToken.slice(-4) : '',
        asaasSandbox: settings.asaasSandbox
      });
    } catch (error) {
      console.error("Error fetching payment settings:", error);
      res.status(500).json({ message: "Erro ao carregar configurações de pagamento" });
    }
  });

  app.post("/api/settings/payments", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { asaasApiToken, asaasSandbox } = req.body;
      const userProfile = req.user.profile;

      const currentSettings = await storage.getPaymentSettings();

      const settingsData = {
        asaasApiToken: asaasApiToken && !asaasApiToken.startsWith('****')
          ? asaasApiToken
          : currentSettings.asaasApiToken,
        asaasSandbox: asaasSandbox !== undefined ? asaasSandbox : currentSettings.asaasSandbox
      };

      await storage.savePaymentSettings(settingsData, userProfile.id);
      res.json({ message: "Configurações de pagamento salvas com sucesso" });
    } catch (error) {
      console.error("Error saving payment settings:", error);
      res.status(500).json({ message: "Erro ao salvar configurações de pagamento" });
    }
  });

  // ===========================================
  // SITE SETTINGS (APPEARANCE) ENDPOINTS
  // ===========================================

  // Get all site settings (public - for landing page)
  app.get("/api/site-settings", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      // Convert array to object for easier frontend access
      const settingsObj = {};
      settings.forEach(s => {
        settingsObj[s.setting_key] = {
          value: s.setting_value,
          type: s.setting_type,
          category: s.category,
          label: s.label,
          description: s.description
        };
      });
      res.json(settingsObj);
    } catch (error) {
      console.error("Error fetching site settings:", error);
      res.status(500).json({ message: "Erro ao carregar configurações do site" });
    }
  });

  // Get site settings by category (admin)
  app.get("/api/settings/appearance", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      // Initialize default settings if empty
      const existing = await storage.getSiteSettings();
      if (existing.length === 0) {
        await storage.initializeDefaultSiteSettings(req.user.profile.id);
      }
      
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching appearance settings:", error);
      res.status(500).json({ message: "Erro ao carregar configurações de aparência" });
    }
  });

  // Update a site setting (admin)
  app.post("/api/settings/appearance", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { key, value, type, category, label, description } = req.body;
      const userProfile = req.user.profile;

      if (!key) {
        return res.status(400).json({ message: "Chave da configuração é obrigatória" });
      }

      const result = await storage.setSiteSetting(key, value, type, category, label, description, userProfile.id);
      res.json({ message: "Configuração salva com sucesso", setting: result });
    } catch (error) {
      console.error("Error saving site setting:", error);
      res.status(500).json({ message: "Erro ao salvar configuração" });
    }
  });

  // Batch update site settings (admin)
  app.put("/api/settings/appearance", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { settings } = req.body;
      const userProfile = req.user.profile;

      if (!Array.isArray(settings)) {
        return res.status(400).json({ message: "Formato inválido" });
      }

      for (const setting of settings) {
        await storage.setSiteSetting(
          setting.key, 
          setting.value, 
          setting.type, 
          setting.category, 
          setting.label, 
          setting.description, 
          userProfile.id
        );
      }

      res.json({ message: "Configurações salvas com sucesso" });
    } catch (error) {
      console.error("Error saving site settings:", error);
      res.status(500).json({ message: "Erro ao salvar configurações" });
    }
  });

  // ===========================================
  // ASAAS INTEGRATION ENDPOINTS
  // ===========================================

  // Create Asaas customer
  app.post("/api/asaas/customers", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const customer = await asaas.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating Asaas customer:", error);
      res.status(500).json({ message: error.message || "Erro ao criar cliente no Asaas" });
    }
  });

  // Get Asaas customer
  app.get("/api/asaas/customers/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const customer = await asaas.getCustomer(req.params.id);
      res.json(customer);
    } catch (error) {
      console.error("Error fetching Asaas customer:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar cliente no Asaas" });
    }
  });

  // List Asaas customers
  app.get("/api/asaas/customers", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const customers = await asaas.listCustomers(req.query);
      res.json(customers);
    } catch (error) {
      console.error("Error listing Asaas customers:", error);
      res.status(500).json({ message: error.message || "Erro ao listar clientes no Asaas" });
    }
  });

  // Create Asaas subscription
  app.post("/api/asaas/subscriptions", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const subscription = await asaas.createSubscription(req.body);
      res.status(201).json(subscription);
    } catch (error) {
      console.error("Error creating Asaas subscription:", error);
      res.status(500).json({ message: error.message || "Erro ao criar assinatura no Asaas" });
    }
  });

  // Get Asaas subscription
  app.get("/api/asaas/subscriptions/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const subscription = await asaas.getSubscription(req.params.id);
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching Asaas subscription:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar assinatura no Asaas" });
    }
  });

  // List Asaas subscriptions
  app.get("/api/asaas/subscriptions", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const subscriptions = await asaas.listSubscriptions(req.query);
      res.json(subscriptions);
    } catch (error) {
      console.error("Error listing Asaas subscriptions:", error);
      res.status(500).json({ message: error.message || "Erro ao listar assinaturas no Asaas" });
    }
  });

  // Update Asaas subscription
  app.put("/api/asaas/subscriptions/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const subscription = await asaas.updateSubscription(req.params.id, req.body);
      res.json(subscription);
    } catch (error) {
      console.error("Error updating Asaas subscription:", error);
      res.status(500).json({ message: error.message || "Erro ao atualizar assinatura no Asaas" });
    }
  });

  // Delete Asaas subscription
  app.delete("/api/asaas/subscriptions/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      await asaas.deleteSubscription(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting Asaas subscription:", error);
      res.status(500).json({ message: error.message || "Erro ao cancelar assinatura no Asaas" });
    }
  });

  // Get Asaas subscription payments
  app.get("/api/asaas/subscriptions/:id/payments", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const payments = await asaas.getSubscriptionPayments(req.params.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching Asaas subscription payments:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar cobranças da assinatura" });
    }
  });

  // Update Asaas subscription credit card
  app.put("/api/asaas/subscriptions/:id/creditCard", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const result = await asaas.updateSubscriptionCreditCard(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error updating Asaas subscription credit card:", error);
      res.status(500).json({ message: error.message || "Erro ao atualizar cartão da assinatura" });
    }
  });

  // Set Asaas subscription invoice settings
  app.post("/api/asaas/subscriptions/:id/invoiceSettings", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const result = await asaas.setSubscriptionInvoiceSettings(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error setting Asaas subscription invoice settings:", error);
      res.status(500).json({ message: error.message || "Erro ao configurar notas fiscais da assinatura" });
    }
  });

  // Create Asaas payment
  app.post("/api/asaas/payments", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const payment = await asaas.createPayment(req.body);
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating Asaas payment:", error);
      res.status(500).json({ message: error.message || "Erro ao criar cobrança no Asaas" });
    }
  });

  // Get Asaas payment
  app.get("/api/asaas/payments/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const payment = await asaas.getPayment(req.params.id);
      res.json(payment);
    } catch (error) {
      console.error("Error fetching Asaas payment:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar cobrança no Asaas" });
    }
  });

  // List Asaas payments
  app.get("/api/asaas/payments", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const payments = await asaas.listPayments(req.query);
      res.json(payments);
    } catch (error) {
      console.error("Error listing Asaas payments:", error);
      res.status(500).json({ message: error.message || "Erro ao listar cobranças no Asaas" });
    }
  });

  // Delete Asaas payment
  app.delete("/api/asaas/payments/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      await asaas.deletePayment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting Asaas payment:", error);
      res.status(500).json({ message: error.message || "Erro ao excluir cobrança no Asaas" });
    }
  });

  // Get Asaas payment PIX QR Code
  app.get("/api/asaas/payments/:id/pixQrCode", requireAuth, async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const qrCode = await asaas.getPaymentPixQrCode(req.params.id);
      res.json(qrCode);
    } catch (error) {
      console.error("Error fetching Asaas PIX QR code:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar QR code PIX" });
    }
  });

  // Get Asaas payment bank slip bar code
  app.get("/api/asaas/payments/:id/bankSlip", requireAuth, async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const barCode = await asaas.getPaymentBankSlipBarCode(req.params.id);
      res.json(barCode);
    } catch (error) {
      console.error("Error fetching Asaas bank slip:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar código de barras do boleto" });
    }
  });

  // Refund Asaas payment
  app.post("/api/asaas/payments/:id/refund", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const { value, description } = req.body;
      const result = await asaas.refundPayment(req.params.id, value, description);
      res.json(result);
    } catch (error) {
      console.error("Error refunding Asaas payment:", error);
      res.status(500).json({ message: error.message || "Erro ao estornar cobrança" });
    }
  });

  // Get Asaas account balance
  app.get("/api/asaas/balance", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const balance = await asaas.getBalance();
      res.json(balance);
    } catch (error) {
      console.error("Error fetching Asaas balance:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar saldo" });
    }
  });

  // Get Asaas account status
  app.get("/api/asaas/status", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const status = await asaas.getAccountStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching Asaas account status:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar status da conta" });
    }
  });

  // ===========================================
  // STUDENT PAYMENT ENDPOINTS (Self-service)
  // ===========================================

  // Get payment settings (public for frontend to know which provider is active)
  app.get("/api/payment-config", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getPaymentSettings();
      const asaasEnabled = !!settings.asaasApiToken;
      res.json({
        asaasEnabled,
        activeProvider: 'asaas'
      });
    } catch (error) {
      console.error("Error fetching payment config:", error);
      res.status(500).json({ message: "Erro ao buscar configurações de pagamento" });
    }
  });

  // Get student's own subscription status and charges
  app.get("/api/my-subscription", requireAuth, async (req, res) => {
    try {
      const userProfile = req.user.profile;
      const settings = await storage.getPaymentSettings();
      const asaasEnabled = !!settings.asaasApiToken;

      let subscription = null;
      let charges = [];

      if (asaasEnabled && userProfile.asaas_customer_id) {
        try {
          const asaas = await createAsaasService(storage);
          if (userProfile.asaas_subscription_id) {
            subscription = await asaas.getSubscription(userProfile.asaas_subscription_id);
          }
          const paymentsResponse = await asaas.listPayments({ customer: userProfile.asaas_customer_id });
          charges = paymentsResponse.data || [];
        } catch (asaasError) {
          console.error("Error fetching Asaas data:", asaasError);
        }
      }

      res.json({
        subscription: subscription ? { ...subscription, provider: 'asaas' } : null,
        charges,
        monthlyFee: userProfile.monthly_fee ?? null,
        hasAsaasCustomer: !!userProfile.asaas_customer_id,
        hasAsaasSubscription: !!userProfile.asaas_subscription_id
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Erro ao buscar informações de assinatura" });
    }
  });

  // Create subscription for student (self-service)
  app.post("/api/my-subscription", requireAuth, async (req, res) => {
    try {
      const userProfile = req.user.profile;
      const { billingType, cycle = 'MONTHLY', creditCard, creditCardHolderInfo } = req.body;
      
      const settings = await storage.getPaymentSettings();
      
      // Check if Asaas is enabled based on activeProvider and API token
      const asaasEnabled = (settings.activeProvider === 'asaas' || settings.activeProvider === 'both') && !!settings.asaasApiToken;
      
      if (!asaasEnabled) {
        return res.status(400).json({ message: "Sistema de pagamentos Asaas não está ativo" });
      }

      const allowedBillingTypes = ['PIX', 'BOLETO', 'CREDIT_CARD'];
      if (!billingType || !allowedBillingTypes.includes(billingType)) {
        return res.status(400).json({ message: "Tipo de cobrança inválido. Use PIX, BOLETO ou CREDIT_CARD." });
      }
      
      const asaas = await createAsaasService(storage);
      
      // Create customer if not exists
      let customerId = userProfile.asaas_customer_id;
      if (!customerId) {
        const customer = await asaas.createCustomer({
          name: userProfile.full_name,
          email: req.user.email,
          cpfCnpj: req.body.cpfCnpj || userProfile.cpf,
          phone: userProfile.phone
        });
        customerId = customer.id;
        
        // Save customer ID to profile
        await storage.updateProfile(userProfile.id, { asaas_customer_id: customerId });
      }
      
      const monthlyFeeInCents = Number(userProfile.monthly_fee);
      if (!Number.isInteger(monthlyFeeInCents) || monthlyFeeInCents <= 0) {
        return res.status(400).json({ message: 'Monthly fee is not configured for this profile' });
      }
      
      if (billingType === 'CREDIT_CARD' && (!creditCard || !creditCardHolderInfo)) {
        return res.status(400).json({ message: 'Credit card details are required for CREDIT_CARD billing' });
      }
      
      // Calculate next due date (today + 1 day)
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + 1);
      const dueDateStr = nextDueDate.toISOString().split('T')[0];
      
      // Create subscription
      const subscriptionData = {
        customer: customerId,
        billingType,
        value: monthlyFeeInCents / 100, // Convert cents to reais
        cycle: cycle,
        nextDueDate: dueDateStr,
        description: `Mensalidade Be Fluent School - ${userProfile.full_name}`
      };
      
      // Add credit card data if payment by card
      if (billingType === 'CREDIT_CARD' && creditCard) {
        subscriptionData.creditCard = creditCard;
        subscriptionData.creditCardHolderInfo = creditCardHolderInfo;
      }
      
      const subscription = await asaas.createSubscription(subscriptionData);
      
      // Save subscription ID to profile
      await storage.updateProfile(userProfile.id, { asaas_subscription_id: subscription.id });
      
      res.status(201).json({
        subscription,
        message: "Assinatura criada com sucesso!"
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: error.message || "Erro ao criar assinatura" });
    }
  });

  // Get PIX QR Code for a payment (student self-service)
  app.get("/api/my-payments/:id/pix", requireAuth, async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const qrCode = await asaas.getPaymentPixQrCode(req.params.id);
      res.json(qrCode);
    } catch (error) {
      console.error("Error fetching PIX QR code:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar QR code PIX" });
    }
  });

  // Get bank slip info for a payment (student self-service)
  app.get("/api/my-payments/:id/boleto", requireAuth, async (req, res) => {
    try {
      const asaas = await createAsaasService(storage);
      const bankSlip = await asaas.getPaymentBankSlipBarCode(req.params.id);
      res.json(bankSlip);
    } catch (error) {
      console.error("Error fetching bank slip:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar boleto" });
    }
  });

  // ===========================================
  // ANNOUNCEMENTS ENDPOINTS
  // ===========================================
  
  // Get all announcements (all authenticated users)
  app.get("/api/announcements", requireAuth, async (req, res) => {
    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Erro ao buscar avisos" });
    }
  });

  // Get single announcement
  app.get("/api/announcements/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const announcement = await storage.getAnnouncement(id);
      if (!announcement) {
        return res.status(404).json({ message: "Aviso não encontrado" });
      }
      res.json(announcement);
    } catch (error) {
      console.error("Error fetching announcement:", error);
      res.status(500).json({ message: "Erro ao buscar aviso" });
    }
  });

  // Create announcement (admin and teacher)
  app.post("/api/announcements", requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const userProfile = req.user.profile;
      const { title, content, priority } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: "Título e conteúdo são obrigatórios" });
      }

      const announcementData = {
        title,
        content,
        is_urgent: priority === 'urgent',
        target_role: null,
        created_by: userProfile.id
      };

      const announcement = await storage.createAnnouncement(announcementData);
      res.status(201).json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Erro ao criar aviso" });
    }
  });

  // Update announcement (admin can edit any, teacher can edit only their own)
  app.put("/api/announcements/:id", requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;
      const { title, content, priority } = req.body;

      const existingAnnouncement = await storage.getAnnouncement(id);
      if (!existingAnnouncement) {
        return res.status(404).json({ message: "Aviso não encontrado" });
      }

      // Teachers can only edit their own announcements
      if (userProfile.role === 'teacher' && existingAnnouncement.created_by !== userProfile.id) {
        return res.status(403).json({ message: "Você só pode editar avisos criados por você" });
      }

      const updateData = {
        title,
        content,
        is_urgent: priority === 'urgent'
      };

      const announcement = await storage.updateAnnouncement(id, updateData);
      res.json(announcement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ message: "Erro ao atualizar aviso" });
    }
  });

  // Delete announcement (admin can delete any, teacher can delete only their own)
  app.delete("/api/announcements/:id", requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const userProfile = req.user.profile;
      
      console.log("Deleting announcement with ID:", id);

      const existingAnnouncement = await storage.getAnnouncement(id);
      console.log("Found announcement:", existingAnnouncement);
      
      if (!existingAnnouncement) {
        console.log("Announcement not found for ID:", id);
        return res.status(404).json({ message: "Aviso não encontrado" });
      }

      // Teachers can only delete their own announcements
      if (userProfile.role === 'teacher' && existingAnnouncement.created_by !== userProfile.id) {
        return res.status(403).json({ message: "Você só pode excluir avisos criados por você" });
      }

      await storage.deleteAnnouncement(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Erro ao excluir aviso" });
    }
  });

  // Reports API endpoints - providing real data from database
  app.get("/api/reports/revenue", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { timeRange = '6months' } = req.query;

      // Validate timeRange parameter
      const validRanges = ['1month', '3months', '6months', '1year'];
      if (typeof timeRange !== 'string' || !validRanges.includes(timeRange)) {
        return res.status(400).json({ message: "Invalid timeRange. Must be one of: 1month, 3months, 6months, 1year" });
      }

      const revenueData = await storage.getRevenueData(timeRange);
      res.json(revenueData);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/reports/student-progress", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { timeRange = '6months' } = req.query;

      // Validate timeRange parameter
      const validRanges = ['1month', '3months', '6months', '1year'];
      if (typeof timeRange !== 'string' || !validRanges.includes(timeRange)) {
        return res.status(400).json({ message: "Invalid timeRange. Must be one of: 1month, 3months, 6months, 1year" });
      }

      const progressData = await storage.getStudentProgressData(timeRange);
      res.json(progressData);
    } catch (error) {
      console.error("Error fetching student progress data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/reports/teacher-performance", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const performanceData = await storage.getTeacherPerformanceData();
      res.json(performanceData);
    } catch (error) {
      console.error("Error fetching teacher performance data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/reports/course-completion", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const completionData = await storage.getCourseCompletionData();
      res.json(completionData);
    } catch (error) {
      console.error("Error fetching course completion data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Additional endpoints needed by frontend components

  // Admin students endpoint (used by AdminDashboard.tsx)
  app.get("/api/admin/students", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching admin students:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin teachers endpoint (used by AdminDashboard.tsx)
  app.get("/api/admin/teachers", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const teachers = await storage.getAllTeachers();
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching admin teachers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Teachers list endpoint (used by AdminDashboard.tsx and AdvancedReports.tsx)
  app.get("/api/profiles/teachers", requireAuth, async (req, res) => {
    try {
      const userProfile = req.user.profile;

      // Security allow admin and students to view teacher profiles
      if (userProfile.role !== 'admin' && userProfile.role !== 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teachers = await storage.getAllTeachers();
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Alternative teachers endpoint (used by AdvancedReports.tsx)
  app.get("/api/teachers", requireAuth, requireRole(['admin', 'student']), async (req, res) => {
    try {
      const teachers = await storage.getAllTeachers();
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Teacher statistics endpoint
  app.get("/api/teachers/stats", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const teachers = await storage.getAllTeachers();
      const activeTeachers = teachers.filter(t => t.is_active);
      const stats = {
        totalTeachers: teachers.length,
        activeTeachers: activeTeachers.length,
        inactiveTeachers: teachers.length - activeTeachers.length,
        averageStudents: 0
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching teacher stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create teacher endpoint
  app.post("/api/teachers", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { full_name, email, phone, cpf, address, teacher_type, hourly_rate } = req.body;
      
      // Check if email already exists (email is used as username)
      const existingUser = await storage.getUserByUsername(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create user with teacher role (email is used as username)
      const password = req.body.password || crypto.randomBytes(12).toString('base64url');
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const user = await storage.createUser({
        username: email,
        password: hashedPassword
      });

      // Create teacher profile
      const profile = await storage.createProfile({
        user_id: user.id,
        full_name,
        email,
        phone,
        cpf,
        address,
        role: 'teacher',
        teacher_type: teacher_type || 'individual',
        hourly_rate: hourly_rate || 0,
        is_active: true
      });

      const responsePayload = { profile };
      if (!req.body.password) {
        responsePayload.temporaryPassword = password;
      }

      res.status(201).json(responsePayload);
    } catch (error) {
      console.error("Error creating teacher:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get students linked to a teacher
  app.get("/api/teachers/:id/students", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const allStudents = await storage.getActiveStudents();
      const linked = allStudents.filter(s => s.teacher_id === id);
      res.json(linked);
    } catch (error) {
      console.error("Error fetching teacher students:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reassign students to a new teacher (bulk)
  app.post("/api/teachers/:id/reassign", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { assignments } = req.body; // [{ studentId, newTeacherId }]
      if (!Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({ message: "assignments array required" });
      }
      for (const { studentId, newTeacherId } of assignments) {
        await storage.updateProfile(studentId, { teacher_id: newTeacherId });
      }
      res.json({ message: "Students reassigned successfully", count: assignments.length });
    } catch (error) {
      console.error("Error reassigning students:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update teacher endpoint
  app.put("/api/teachers/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const profile = await storage.updateProfile(id, updateData);
      if (!profile) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating teacher:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete teacher endpoint
  app.delete("/api/teachers/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get profile to find user_id
      const profile = await storage.getProfile(id);
      if (!profile) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      
      // Soft delete - just deactivate
      await storage.updateProfile(id, { is_active: false });
      
      res.json({ message: "Teacher deactivated successfully" });
    } catch (error) {
      console.error("Error deleting teacher:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===========================================
  // UNIFIED USER MANAGEMENT ROUTES (/api/users)
  // ===========================================

  app.post("/api/users", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { full_name, email, phone, cpf, address, birth_date, role,
              student_level, english_level, current_module, monthly_fee, payment_due_date, plan_type,
              teacher_type, hourly_rate } = req.body;

      if (!full_name || !email || !role) {
        return res.status(400).json({ message: "Nome, email e papel são obrigatórios" });
      }
      if (!['student', 'teacher', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Papel inválido" });
      }

      const existingUser = await storage.getUserByUsername(email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está cadastrado no sistema" });
      }

      const isAdminProvided = !!req.body.password;
      const password = req.body.password || crypto.randomBytes(12).toString('base64url');
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUser({
        username: email,
        password: hashedPassword,
        must_change_password: !isAdminProvided,
      });

      const { current_activity } = req.body;
      const profileData = { user_id: user.id, full_name, email, phone, cpf, address, birth_date, role, is_active: true };
      if (role === 'student') {
        const initialModule = current_module || 'S1';
        const initialActivity = Number(current_activity) || 1;
        Object.assign(profileData, {
          student_level: student_level || english_level || 'beginner',
          current_module: initialModule,
          current_activity: initialActivity,
          monthly_fee: monthly_fee || null,
          payment_due_date: payment_due_date || null,
          plan_type: plan_type || null,
        });
      }
      if (role === 'teacher') {
        Object.assign(profileData, { teacher_type: teacher_type || 'individual', hourly_rate: hourly_rate || 0 });
      }

      const profile = await storage.createProfile(profileData);

      // Initialize activity progress for student
      if (role === 'student') {
        const initialModule = current_module || 'S1';
        const initialActivity = Number(current_activity) || 1;
        try {
          await storage.initializeStudentActivities(profile.id, initialModule, initialActivity);
        } catch (initErr) {
          console.error('Failed to initialize activities:', initErr.message);
        }
      }

      // Send welcome email with temporary password
      if (!isAdminProvided) {
        try {
          const { emailService } = await import('./services/email-service.js');
          const roleLabel = role === 'student' ? 'Aluno' : role === 'teacher' ? 'Professor' : 'Administrador';
          await emailService.sendSingleEmail({
            to: email,
            subject: `Bem-vindo à Be Fluent School, ${full_name.split(' ')[0]}! 🎉`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f0f13;color:#eeeef0;padding:0;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#E59313,#d4830f);padding:32px;text-align:center;">
                  <h1 style="margin:0;font-size:24px;color:#fff;">Be Fluent School</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Bem-vindo(a) à plataforma!</p>
                </div>
                <div style="padding:32px;">
                  <p style="font-size:16px;color:#eeeef0;">Olá, <strong>${full_name.split(' ')[0]}</strong>!</p>
                  <p style="color:#a0a0b0;font-size:14px;">Sua conta foi criada como <strong style="color:#E59313">${roleLabel}</strong>. Use as credenciais abaixo para acessar a plataforma:</p>
                  <div style="background:#1c1c22;border:1px solid rgba(229,147,19,0.2);border-radius:10px;padding:20px;margin:24px 0;">
                    <p style="margin:0 0 8px;font-size:12px;color:#5a5a6e;text-transform:uppercase;letter-spacing:0.05em;">Suas Credenciais</p>
                    <p style="margin:0 0 6px;font-size:14px;color:#a0a0b0;"><strong>Email:</strong> ${email}</p>
                    <p style="margin:0;font-size:14px;color:#a0a0b0;"><strong>Senha temporária:</strong> <code style="background:#13131a;padding:3px 8px;border-radius:4px;color:#E59313;font-size:15px;">${password}</code></p>
                  </div>
                  <p style="color:#ef4444;font-size:13px;background:rgba(239,68,68,0.08);padding:12px 16px;border-radius:8px;">⚠️ Você deverá trocar esta senha no seu primeiro acesso.</p>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="${process.env.BASE_URL || 'http://localhost:5173'}" style="background:#E59313;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">Acessar Plataforma</a>
                  </div>
                  <p style="color:#5a5a6e;font-size:12px;">Em caso de dúvidas, entre em contato com a Be Fluent School.</p>
                </div>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error('Failed to send welcome email:', emailErr.message);
        }
      }

      const responsePayload = { profile };
      if (!isAdminProvided) {
        responsePayload.temporaryPassword = password;
      }
      res.status(201).json(responsePayload);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error.code === '23505') {
        return res.status(400).json({ message: "Este email já está cadastrado no sistema" });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.put("/api/users/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const profile = await storage.updateProfile(id, req.body);
      if (!profile) return res.status(404).json({ message: "Usuário não encontrado" });
      res.json(profile);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteUserByProfileId(id);
      if (!deleted) return res.status(404).json({ message: "Usuário não encontrado" });
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===========================================
  // MARKETING AUTOMATION ROUTES
  // ===========================================

  // Rate limiting for marketing endpoints
  const marketingRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many marketing requests from this IP, please try again later.',
  });

  // Validation schemas for marketing endpoints
  const trackEventSchema = z.object({
    user_id: z.string().optional(),
    session_id: z.string().optional(),
    event_type: z.string().min(1),
    event_name: z.string().min(1),
    page_url: z.string().optional(),
    referrer: z.string().optional(),
    event_data: z.record(z.any()).optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_content: z.string().optional(),
    utm_term: z.string().optional(),
    user_agent: z.string().optional(),
    ip_address: z.string().optional(),
    duration: z.number().optional(),
  });

  const createCampaignSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    template_id: z.string().min(1),
    subject_line: z.string().min(1),
    campaign_type: z.enum(['email', 'sms', 'push']),
    status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed']).default('draft'),
    scheduled_at: z.string().transform(str => new Date(str)).optional(),
    target_audience: z.array(z.string()).optional(),
    segmentation_criteria: z.record(z.any()).optional(),
  });

  const createABTestSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    test_type: z.string().min(1),
    traffic_allocation: z.number().min(0).max(100),
    variants: z.array(z.object({
      name: z.string().min(1),
      config: z.record(z.any()),
      weight: z.number().min(0).max(100).optional(),
    })).min(2),
  });

  // ===========================================
  // MARKETING API ROUTES
  // ===========================================

  // POST /api/marketing/events - Track custom event
  app.post("/api/marketing/events", marketingRateLimit, async (req, res) => {
    try {
      const eventData = trackEventSchema.parse(req.body);

      await marketingAutomationService.trackUserEvent(eventData);

      res.json({ 
        success: true, 
        message: 'Event tracked successfully' 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error tracking event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/marketing/lead-scores - Analytics de scoring
  app.get("/api/marketing/lead-scores", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { userId } = req.query;

      if (userId) {
        const userScoring = await storage.getLeadScoringByUserId(userId);
        res.json(userScoring);
      } else {
        const allScoring = await storage.getAllLeadScoring();
        res.json(allScoring);
      }
    } catch (error) {
      console.error("Error fetching lead scores:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/marketing/campaigns - Criar campanha
  app.post("/api/marketing/campaigns", requireAuth, requireRole(['admin']), marketingRateLimit, async (req, res) => {
    try {
      const campaignData = createCampaignSchema.parse(req.body);

      const campaign = await storage.createMarketingCampaign({
        ...campaignData,
        created_by: req.user.id,
      });

      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/marketing/campaigns - Listar campanhas
  app.get("/api/marketing/campaigns", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const campaigns = await storage.getAllMarketingCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/marketing/campaigns/:id/execute - Executar campanha
  app.post("/api/marketing/campaigns/:id/execute", requireAuth, requireRole(['admin']), marketingRateLimit, async (req, res) => {
    try {
      const { id } = req.params;

      await marketingAutomationService.executeCampaign(id);

      res.json({ 
        success: true, 
        message: 'Campaign execution started' 
      });
    } catch (error) {
      console.error("Error executing campaign:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/marketing/ab-tests - Listar testes A/B
  app.get("/api/marketing/ab-tests", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const abTests = await storage.getAllAbTests();
      res.json(abTests);
    } catch (error) {
      console.error("Error fetching A/B tests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/marketing/ab-tests - Criar teste A/B
  app.post("/api/marketing/ab-tests", requireAuth, requireRole(['admin']), marketingRateLimit, async (req, res) => {
    try {
      const testData = createABTestSchema.parse(req.body);

      const abTest = await marketingAutomationService.createABTest(testData);

      res.status(201).json(abTest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating A/B test:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/marketing/ab-tests/:id/start - Iniciar teste A/B
  app.post("/api/marketing/ab-tests/:id/start", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;

      await marketingAutomationService.startABTest(id);

      res.json({ 
        success: true, 
        message: 'A/B test started successfully' 
      });
    } catch (error) {
      console.error("Error starting A/B test:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/marketing/ab-tests/:id/stop - Parar teste A/B
  app.post("/api/marketing/ab-tests/:id/stop", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { winnerVariant } = req.body;

      await marketingAutomationService.stopABTest(id, winnerVariant);

      res.json({ 
        success: true, 
        message: 'A/B test stopped successfully' 
      });
    } catch (error) {
      console.error("Error stopping A/B test:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/marketing/ab-tests/:id/results - Resultados do teste A/B
  app.get("/api/marketing/ab-tests/:id/results", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;

      const results = await marketingAutomationService.getABTestResults(id);

      res.json(results);
    } catch (error) {
      console.error("Error fetching A/B test results:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===========================================
  // SENDGRID WEBHOOK ROUTES COM SIGNATURE VERIFICATION
  // ===========================================

  // Helper function para verificar signature do SendGrid
  function verifySignature(payload, signature, timestamp) {
    if (!process.env.SENDGRID_WEBHOOK_SECRET) {
      console.warn('SENDGRID_WEBHOOK_SECRET not configured - signature verification disabled');
      return true; // Allow in dev/test environments
    }

    try {
      const timestampInSeconds = Math.floor(Date.now() / 1000);
      const requestTimestamp = parseInt(timestamp);

      // Verify timestamp is within 10 minutes
      if (Math.abs(timestampInSeconds - requestTimestamp) > 600) {
        console.error('SendGrid webhook timestamp too old');
        return false;
      }

      // Create expected signature
      const expectedSignature = crypto.createHmac('sha256', process.env.SENDGRID_WEBHOOK_SECRET)
        .update(timestamp + payload.toString())
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Error verifying SendGrid signature:', error);
      return false;
    }
  }

  // POST /api/marketing/webhooks/sendgrid - Webhook SendGrid SEGURO
  app.post('/api/marketing/webhooks/sendgrid', 
    express.raw({ type: 'application/json' }), 
    async (req, res) => {
      try {
        const signature = req.headers['x-twilio-email-event-webhook-signature'];
        const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'];

        // SECURITY signature obrigatória
        if (!verifySignature(req.body, signature, timestamp)) {
          console.error('Invalid SendGrid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }

        const events = JSON.parse(req.body.toString());
        const eventArray = Array.isArray(events) ? events : [events];

        for (const event of eventArray) {
          await marketingAutomationService.handleSendGridEvent(event);
        }

        res.status(200).send('OK');
      } catch (error) {
        console.error('Error handling SendGrid webhook:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  );

  // ===========================================
  // SUPPRESSION LIST E UNSUBSCRIBE ROUTES OBRIGATÓRIAS
  // ===========================================

  // GET /api/marketing/unsubscribe/:token - Unsubscribe endpoint público
  app.get('/api/marketing/unsubscribe/:token', async (req, res) => {
    try {
      const { token } = req.params;

      // Decode and validate unsubscribe token
      const decodedData = Buffer.from(token, 'base64url').toString('utf8');
      const { email, timestamp } = JSON.parse(decodedData);

      // Verify token is not expired (30 days)
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 30 * 24 * 60 * 60 * 1000) {
        return res.status(400).json({ message: 'Unsubscribe link has expired' });
      }

      // Add to suppression list
      await marketingAutomationService.addToSuppressionList(email, 'unsubscribe', 'User clicked unsubscribe link');

      res.json({ 
        success: true, 
        message: 'You have been successfully unsubscribed from our emails.',
        email: email 
      });
    } catch (error) {
      console.error('Error processing unsubscribe:', error);
      res.status(500).json({ message: 'Error processing unsubscribe request' });
    }
  });

  // POST /api/marketing/suppress - Manage suppression list (admin only)
  app.post('/api/marketing/suppress', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { email, reason, description } = req.body;

      if (!email || !reason) {
        return res.status(400).json({ message: 'Email and reason are required' });
      }

      await marketingAutomationService.addToSuppressionList(email, reason, description);

      res.json({ 
        success: true, 
        message: 'Email added to suppression list',
        email,
        reason 
      });
    } catch (error) {
      console.error('Error adding to suppression list:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // GET /api/marketing/suppression-list - View suppression list (admin only)
  app.get('/api/marketing/suppression-list', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const suppressions = await storage.getSuppressionList();
      res.json(suppressions);
    } catch (error) {
      console.error('Error fetching suppression list:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // DELETE /api/marketing/suppress/:email - Remove from suppression list
  app.delete('/api/marketing/suppress/:email', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { email } = req.params;
      const success = await storage.removeFromSuppressionList(email);

      if (!success) {
        return res.status(404).json({ message: 'Email not found in suppression list' });
      }

      res.json({ 
        success: true, 
        message: 'Email removed from suppression list',
        email 
      });
    } catch (error) {
      console.error('Error removing from suppression list:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // GET /api/marketing/campaigns/:id/metrics - A/B testing metrics obrigatória
  app.get('/api/marketing/campaigns/:id/metrics', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;

      const campaign = await storage.getMarketingCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Get campaign performance metrics
      const metrics = await storage.getCampaignPerformance(id);

      // If campaign has A/B test, include A/B test results
      let abTestResults = null;
      if (campaign.ab_test_id) {
        abTestResults = await marketingAutomationService.getABTestResults(campaign.ab_test_id);
      }

      res.json({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          ab_test_id: campaign.ab_test_id
        },
        metrics,
        ab_test_results: abTestResults
      });
    } catch (error) {
      console.error('Error fetching campaign metrics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // POST /api/marketing/ab-tests/:id/finalize - Finalizar A/B test obrigatória
  app.post('/api/marketing/ab-tests/:id/finalize', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { winnerVariant, autoRollout } = req.body;

      const test = await storage.getAbTest(id);
      if (!test) {
        return res.status(404).json({ message: 'A/B test not found' });
      }

      if (test.status !== 'running') {
        return res.status(400).json({ message: 'A/B test is not currently running' });
      }

      // Stop the test and declare winner
      await marketingAutomationService.stopABTest(id, winnerVariant);

      // If auto rollout is enabled, update campaigns to use winner variant
      if (autoRollout && winnerVariant) {
        await marketingAutomationService.rolloutWinnerVariant(id, winnerVariant);
      }

      res.json({ 
        success: true, 
        message: 'A/B test finalized successfully',
        winner_variant: winnerVariant,
        auto_rollout: autoRollout 
      });
    } catch (error) {
      console.error('Error finalizing A/B test:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // GET /api/marketing/health - Health check endpoint para cron jobs
  app.get('/api/marketing/health', async (req, res) => {
    try {
      const healthStatus = await marketingAutomationService.getHealthStatus();

      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });

  // GET /api/marketing/analytics/dashboard - Dashboard analytics
  app.get("/api/marketing/analytics/dashboard", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const analytics = {
        totalCampaigns: await storage.getTotalCampaigns(),
        totalUsers: await storage.getTotalUsers(),
        totalEvents: await storage.getTotalUserEvents(),
        leadScoring: {
          totalLeads: await storage.getTotalLeads(),
          qualifiedLeads: await storage.getQualifiedLeads(),
          averageScore: await storage.getAverageLeadScore(),
        },
        campaignMetrics: await storage.getCampaignMetrics(),
        recentActivity: await storage.getRecentMarketingActivity(),
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching marketing analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/assessment/questions", requireAuth, async (req, res) => {
    try {
      res.json({ questions: assessmentQuestions });
    } catch (error) {
      console.error("Error fetching assessment questions:", error);
      res.status(500).json({ message: "Não foi possível carregar as questões do teste." });
    }
  });

  app.post("/api/assessment/evaluate", requireAuth, authRateLimit, async (req, res) => {
    try {
      const data = assessmentSchema.parse(req.body);
      let speakingTranscript = data.speakingText || "";
      let aiScores = null;

      if (data.speakingAudioBase64) {
        const transcript = await transcribeAudioWithOpenAI(data.speakingAudioBase64);
        if (transcript) {
          speakingTranscript = transcript;
        }
      }

      if (process.env.OPENAI_API_KEY) {
        aiScores = await evaluateWithOpenAI({
          listeningAnswer1: data.listeningAnswer1,
          listeningAnswer2: data.listeningAnswer2,
          readingAnswer1: data.readingAnswer1,
          readingAnswer2: data.readingAnswer2,
          writingAnswer: data.writingAnswer,
          speakingTranscript,
        });
      }

      const listeningScore = aiScores?.listeningScore ?? scoreListening(data.listeningAnswer1, data.listeningAnswer2);
      const readingScore = aiScores?.readingScore ?? scoreReading(data.readingAnswer1, data.readingAnswer2);
      const writingScore = aiScores?.writingScore ?? scoreWriting(data.writingAnswer);
      const speakingScore = aiScores?.speakingScore ?? scoreSpeaking(speakingTranscript);

      const averageScore = Math.round((listeningScore + readingScore + writingScore + speakingScore) / 4);
      const cefrLevel = getCefrLevel(averageScore);
      const recommendedPlan = getRecommendedPlan(averageScore);
      const feedback = buildPlacementFeedback({
        listening: listeningScore,
        reading: readingScore,
        writing: writingScore,
        speaking: speakingScore,
      }, cefrLevel);

      res.json({
        cefrLevel,
        recommendedPlan,
        scores: {
          listening: listeningScore,
          reading: readingScore,
          writing: writingScore,
          speaking: speakingScore,
        },

        speakingTranscript,
        feedbackSummary: feedback.feedbackSummary,
        feedbackDetails: feedback.feedbackDetails,
        strengths: feedback.strengths,
        recommendations: feedback.recommendations,
        aiUsed: !!process.env.OPENAI_API_KEY,
      });
    } catch (error) {
      console.error("Error evaluating assessment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados do teste inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao processar o teste de nivelamento" });
    }
  });

  // ─── Materials routes (P6) ─────────────────────────────────────
  // GET /api/materials — listar materiais (filtro opcional: ?level=intermediate)
  app.get('/api/materials', requireAuth, async (req, res) => {
    try {
      const { level, classId } = req.query;
      const result = await storage.getMaterials({ level, classId });
      res.json(result);
    } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  const createMaterialSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    file_url: z.string().url("file_url deve ser uma URL válida").optional().or(z.literal('')).transform(v => v || null),
    material_type: z.enum(['pdf', 'video', 'image', 'document', 'audio', 'other']).optional(),
    level: z.string().max(50).optional(),
    category: z.string().max(100).optional(),
    class_id: z.string().uuid().optional().nullable(),
  });

  // POST /api/materials — criar material (admin ou teacher)
  app.post('/api/materials', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const parsed = createMaterialSchema.parse(req.body);
      const material = await storage.createMaterial({
        ...parsed,
        description: parsed.description ?? null,
        file_url: parsed.file_url ?? null,
        material_type: parsed.material_type ?? null,
        level: parsed.level ?? null,
        category: parsed.category ?? null,
        class_id: parsed.class_id ?? null,
        created_by: req.user.id,
      });
      res.status(201).json(material);
    } catch (error) {
      console.error('Error creating material:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // DELETE /api/materials/:id — deletar material (admin ou dono)
  app.delete('/api/materials/:id', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const material = await storage.getMaterialById(req.params.id);
      if (!material) return res.status(404).json({ message: 'Material não encontrado' });
      if (req.user.role !== 'admin' && material.created_by !== req.user.id) {
        return res.status(403).json({ message: 'Sem permissão para deletar este material' });
      }
      await storage.deleteMaterial(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting material:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // POST /api/olivia/chat — OlivIA assistente de inglês powered by OpenAI
  app.post('/api/olivia/chat', requireAuth, async (req, res) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: 'messages array is required' });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: 'OlivIA não configurada. Adicione OPENAI_API_KEY no servidor.' });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are OlivIA, the AI English tutor of Be Fluent School — a Brazilian English school focused on "Performance English".
Your role is to help students practice English in a friendly, encouraging, and professional way.

Guidelines:
- Always respond in English, but when explaining grammar rules or complex concepts, you may add a brief explanation in Portuguese in parentheses
- Keep responses concise and conversational (2-4 sentences max unless explaining a grammar point)
- Gently correct grammatical errors by including the corrected version naturally in your reply
- Encourage the student to practice speaking and writing in English
- Simulate realistic professional dialogues (meetings, presentations, travel, negotiations) when asked
- Align with CEFR levels: adjust complexity based on the conversation
- Never break character — you are OlivIA, not ChatGPT`,
            },
            ...messages,
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message ?? 'OpenAI API error');
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content ?? '';
      res.json({ reply });
    } catch (error) {
      console.error('OlivIA error:', error);
      res.status(500).json({ message: error.message ?? 'Erro ao processar mensagem da OlivIA' });
    }
  });

  app.post('/api/marketing/okkto-lead', authRateLimit, async (req, res) => {
    try {
      const data = okktoLeadSchema.parse(req.body);
      await createOkktoLead(data);
      return res.json({ success: true });
    } catch (error) {
      console.error('Error forwarding lead to Okkto:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados do lead inválidos', errors: error.errors });
      }
      if (!process.env.OKKTO_API_URL || !process.env.OKKTO_API_KEY) {
        return res.json({ success: true, message: 'Okkto não configurado, integração desativada' });
      }
      return res.status(500).json({ message: 'Erro ao enviar lead para Okkto' });
    }
  });

  // ─── Meet Links ───────────────────────────────────────────────────
  app.get('/api/meet-links', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const links = await storage.getMeetLinks(req.user.role === 'teacher' ? req.user.id : undefined);
      res.json(links);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/meet-links', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { title, description, link } = req.body;
      if (!title || !link) return res.status(400).json({ message: 'title e link são obrigatórios' });
      const created = await storage.createMeetLink({ title, description: description ?? null, link, created_by: req.user.id });
      res.status(201).json(created);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete('/api/meet-links/:id', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const deleted = await storage.deleteMeetLink(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'Link não encontrado' });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Messages ─────────────────────────────────────────────────────
  app.get('/api/messages/inbox', requireAuth, async (req, res) => {
    try {
      const msgs = await storage.getInboxMessages(req.user.id);
      res.json(msgs);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/messages/sent', requireAuth, async (req, res) => {
    try {
      const msgs = await storage.getSentMessages(req.user.id);
      res.json(msgs);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      const { to_user_id, subject, content, priority } = req.body;
      if (!to_user_id || !subject || !content) return res.status(400).json({ message: 'to_user_id, subject e content são obrigatórios' });
      const msg = await storage.createMessage({ from_user_id: req.user.id, to_user_id, subject, content, priority: priority ?? 'medium' });
      res.status(201).json(msg);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch('/api/messages/:id/read', requireAuth, async (req, res) => {
    try {
      const updated = await storage.markMessageRead(req.params.id, req.user.id);
      if (!updated) return res.status(404).json({ message: 'Mensagem não encontrada' });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete('/api/messages/:id', requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteMessage(req.params.id, req.user.id);
      if (!deleted) return res.status(404).json({ message: 'Mensagem não encontrada' });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Support Tickets ──────────────────────────────────────────────
  app.get('/api/support-tickets', requireAuth, async (req, res) => {
    try {
      const tickets = await storage.getSupportTickets(req.user.id, req.user.role);
      res.json(tickets);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/support-tickets', requireAuth, async (req, res) => {
    try {
      const { title, description, category, priority } = req.body;
      if (!title || !description || !category) return res.status(400).json({ message: 'title, description e category são obrigatórios' });
      const ticket = await storage.createSupportTicket({ user_id: req.user.id, title, description, category, priority: priority ?? 'medium' });
      res.status(201).json(ticket);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch('/api/support-tickets/:id/status', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: 'status é obrigatório' });
      const updated = await storage.updateSupportTicketStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ message: 'Ticket não encontrado' });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Progress Summary ─────────────────────────────────────────────
  app.get('/api/progress/:studentId', requireAuth, async (req, res) => {
    try {
      const { studentId } = req.params;
      if (req.user.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      const summary = await storage.getStudentProgressSummary(studentId);
      res.json(summary);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Lesson Progress ──────────────────────────────────────────────
  app.get('/api/lesson-progress/:studentId', requireAuth, async (req, res) => {
    try {
      const { studentId } = req.params;
      if (req.user.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      const progress = await storage.getLessonProgress(studentId);
      res.json(progress);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/lesson-progress', requireAuth, async (req, res) => {
    try {
      const { student_id: requestedStudentId, lesson_id, module_id, status, score, xp_earned, lesson_number } = req.body;
      const student_id = req.user.role === 'student' ? req.user.id : requestedStudentId;

      if (!student_id || !lesson_id || !module_id || !status) {
        return res.status(400).json({ message: 'student_id, lesson_id, module_id e status são obrigatórios' });
      }

      if (req.user.role === 'student' && student_id !== req.user.id) {
        return res.status(403).json({ message: 'Acesso negado para atualizar progresso de outro aluno' });
      }

      if (req.user.role !== 'student' && !requestedStudentId) {
        return res.status(400).json({ message: 'student_id é obrigatório para professores e administradores' });
      }

      const parsedLessonNumber = lesson_number != null ? Number(lesson_number) : null;
      if (lesson_number != null && Number.isNaN(parsedLessonNumber)) {
        return res.status(400).json({ message: 'lesson_number deve ser um número válido' });
      }

      const completed_at = status === 'completed' ? new Date() : null;
      const result = await storage.upsertLessonProgress({
        student_id,
        lesson_id,
        module_id,
        lesson_number: parsedLessonNumber,
        status,
        score: score ?? null,
        xp_earned: xp_earned ?? 0,
        completed_at,
      });

      await storage.updateProfile(student_id, { current_module: module_id });

      if (status === 'completed') {
        const progressRows = await storage.getLessonProgress(student_id);
        const completedLessons = progressRows.filter((row) => row.status === 'completed').length;
        const milestones = [6, 11, 20];

        if (milestones.includes(completedLessons)) {
          const student = await storage.getProfile(student_id);
          if (student) {
            const content = `Você concluiu ${completedLessons} lições até agora. Reserve um tempo para revisar o conteúdo antes da prova teórica e prática e aproveite para tirar dúvidas com seu professor.`;
            await storage.createMessage({
              from_user_id: req.user.id,
              to_user_id: student_id,
              subject: 'Revisão para prova: próximo passo',
              content,
              priority: 'medium',
            });
          }
        }
      }

      res.status(201).json(result);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Activity Progress ────────────────────────────────────────────

  // GET /api/activity-progress/:studentId — get all activity progress for a student
  app.get('/api/activity-progress/:studentId', requireAuth, async (req, res) => {
    try {
      const { studentId } = req.params;
      const { moduleId } = req.query;
      if (req.user.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      const rows = await storage.getActivityProgress(studentId, moduleId || null);
      res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
  });

  // POST /api/activity-progress — upsert activity status (teacher or admin)
  app.post('/api/activity-progress', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { student_id, module_id, activity_number, status, classes_used, notes } = req.body;
      if (!student_id || !module_id || !activity_number || !status) {
        return res.status(400).json({ message: 'student_id, module_id, activity_number e status são obrigatórios' });
      }

      const result = await storage.upsertActivityProgress({ student_id, module_id, activity_number: Number(activity_number), status, classes_used: classes_used ?? 0, notes: notes ?? null });

      // Update student profile with current position
      if (status === 'in_progress') {
        await storage.updateProfile(student_id, { current_module: module_id, current_activity: Number(activity_number) });
      }

      // Check milestone and trigger exam if needed
      let milestoneResult = { triggered: false };
      if (status === 'completed') {
        // Advance to next activity automatically
        const nextActivity = Number(activity_number) + 1;
        if (nextActivity <= 20) {
          await storage.upsertActivityProgress({ student_id, module_id, activity_number: nextActivity, status: 'in_progress', classes_used: 0 });
          await storage.updateProfile(student_id, { current_module: module_id, current_activity: nextActivity });
        }
        milestoneResult = await storage.checkActivityMilestone(student_id, module_id, Number(activity_number), req.user.id);
      }

      res.status(201).json({ ...result, milestone: milestoneResult });
    } catch (e) { res.status(500).json({ message: e.message }); }
  });

  // POST /api/activity-progress/initialize — initialize 20 activities for a student starting a module
  app.post('/api/activity-progress/initialize', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { student_id, module_id, starting_activity = 1 } = req.body;
      if (!student_id || !module_id) return res.status(400).json({ message: 'student_id e module_id são obrigatórios' });
      await storage.initializeStudentActivities(student_id, module_id, Number(starting_activity));
      await storage.updateProfile(student_id, { current_module: module_id, current_activity: Number(starting_activity) });
      res.json({ message: 'Atividades inicializadas com sucesso' });
    } catch (e) { res.status(500).json({ message: e.message }); }
  });

  // ─── Exams ────────────────────────────────────────────────────────

  // GET /api/exams/student/:studentId — student's exams
  app.get('/api/exams/student/:studentId', requireAuth, async (req, res) => {
    try {
      const { studentId } = req.params;
      const { moduleId } = req.query;
      if (req.user.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      const rows = await storage.getStudentExams(studentId, moduleId || null);
      res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
  });

  // GET /api/exams/teacher — all exams for teacher's students
  app.get('/api/exams/teacher', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const rows = await storage.getTeacherStudentExams(req.user.id);
      res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
  });

  // POST /api/exams — manually create an exam (teacher/admin)
  app.post('/api/exams', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { student_id, module_id, triggered_by_activity, exam_type, form_link } = req.body;
      if (!student_id || !module_id || !triggered_by_activity || !exam_type) {
        return res.status(400).json({ message: 'student_id, module_id, triggered_by_activity e exam_type são obrigatórios' });
      }
      const result = await storage.createExam({ student_id, teacher_id: req.user.id, module_id, triggered_by_activity: Number(triggered_by_activity), exam_type, status: 'pending', form_link: form_link || null });
      res.status(201).json(result);
    } catch (e) { res.status(500).json({ message: e.message }); }
  });

  // PATCH /api/exams/:id — update exam (score, feedback, status, form_link)
  app.patch('/api/exams/:id', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, score, feedback, form_link } = req.body;
      const result = await storage.updateExam(id, { status, score, feedback, form_link, teacher_id: req.user.id });
      res.json(result);
    } catch (e) { res.status(500).json({ message: e.message }); }
  });

  // Routes registered successfully - server creation handled in index.ts
}
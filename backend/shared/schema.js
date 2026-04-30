import { pgTable, text, varchar, integer, boolean, time, timestamp, uuid, pgEnum, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum('user_role', ['admin', 'student', 'teacher']);
export const studentLevelEnum = pgEnum('student_level', ['beginner', 'elementary', 'pre_intermediate', 'intermediate', 'upper_intermediate', 'advanced', 'proficiency']);
export const activityStatusEnum = pgEnum('activity_status', ['not_started', 'in_progress', 'completed']);
export const examTypeEnum = pgEnum('exam_type', ['theoretical', 'performatic']);
export const examStatusEnum = pgEnum('exam_status', ['pending', 'in_progress', 'completed']);
export const classStatusEnum = pgEnum('class_status', ['scheduled', 'completed', 'cancelled', 'rescheduled']);
export const rescheduleStatusEnum = pgEnum('reschedule_status', ['pending', 'approved', 'rejected']);
export const paymentStatusEnum = pgEnum('payment_status', ['paid', 'pending', 'overdue']);
export const feedbackTypeEnum = pgEnum('feedback_type', ['teacher', 'student', 'class', 'general']);
export const feedbackStatusEnum = pgEnum('feedback_status', ['sent', 'responded', 'resolved']);

export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']);
export const campaignTypeEnum = pgEnum('campaign_type', ['email', 'sms', 'push', 'social', 'display']);
export const emailSequenceTypeEnum = pgEnum('email_sequence_type', ['welcome', 'onboarding', 'nurturing', 'trial', 'reactivation', 'upgrade', 'promotional']);
export const eventTypeEnum = pgEnum('event_type', ['page_view', 'button_click', 'form_submit', 'file_download', 'video_play', 'email_open', 'email_click', 'trial_signup', 'payment', 'class_booking', 'profile_update', 'login', 'logout']);
export const leadScoreTierEnum = pgEnum('lead_score_tier', ['cold', 'warm', 'hot', 'qualified']);
export const abTestStatusEnum = pgEnum('ab_test_status', ['draft', 'running', 'completed', 'cancelled']);
export const segmentationCriteriaEnum = pgEnum('segmentation_criteria', ['student_level', 'payment_status', 'activity_level', 'signup_date', 'trial_user', 'location', 'age_group', 'engagement_score']);
export const suppressionReasonEnum = pgEnum('suppression_reason', ['unsubscribe', 'bounce', 'spam', 'invalid', 'manual']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  password_reset_token: text("password_reset_token"),
  password_reset_expires: timestamp("password_reset_expires", { withTimezone: true }),
  must_change_password: boolean("must_change_password").default(false),
});

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  full_name: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default('student'),
  student_level: studentLevelEnum("student_level"),
  is_active: boolean("is_active").notNull().default(true),
  cpf: text("cpf"),
  birth_date: timestamp("birth_date", { withTimezone: true }),
  address: text("address"),
  monthly_fee: integer("monthly_fee"),
  payment_due_date: integer("payment_due_date"),
  current_module: text("current_module"),
  current_activity: integer("current_activity").default(1),
  english_cefr: text("english_cefr"),
  current_payment_status: paymentStatusEnum("current_payment_status").default('pending'),
  last_payment_date: timestamp("last_payment_date", { withTimezone: true }),
  asaas_customer_id: text("asaas_customer_id"),
  asaas_subscription_id: text("asaas_subscription_id"),
  teacher_type: text("teacher_type"),
  hourly_rate: integer("hourly_rate").default(0),
  plan_type: text("plan_type"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teacherAvailability = pgTable("teacher_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacher_id: varchar("teacher_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  day_of_week: integer("day_of_week").notNull(),
  start_time: time("start_time").notNull(),
  end_time: time("end_time").notNull(),
  is_available: boolean("is_available").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    uniqueAvailability: unique().on(table.teacher_id, table.day_of_week, table.start_time, table.end_time),
  };
});

export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  student_id: varchar("student_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  teacher_id: varchar("teacher_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  scheduled_at: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  duration_minutes: integer("duration_minutes").notNull().default(60),
  meet_link: text("meet_link"),
  status: classStatusEnum("status").notNull().default('scheduled'),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  class_id: varchar("class_id").references(() => classes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  file_url: text("file_url"),
  material_type: text("material_type"),
  level: text("level"),
  category: text("category"),
  created_by: varchar("created_by").notNull().references(() => profiles.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  target_role: userRoleEnum("target_role"),
  is_urgent: boolean("is_urgent").notNull().default(false),
  created_by: varchar("created_by").notNull().references(() => profiles.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }),
});

export const forumPosts = pgTable("forum_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author_id: varchar("author_id").notNull().references(() => profiles.id),
  class_id: varchar("class_id").references(() => classes.id),
  parent_id: varchar("parent_id"),
  is_question: boolean("is_question").notNull().default(true),
  is_answered: boolean("is_answered").notNull().default(false),
  likes_count: integer("likes_count").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const forumLikes = pgTable("forum_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  post_id: varchar("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  user_id: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    uniqueLike: unique().on(table.post_id, table.user_id),
  };
});

export const classReschedules = pgTable("class_reschedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  class_id: varchar("class_id").notNull().references(() => classes.id),
  requested_by: varchar("requested_by").notNull().references(() => profiles.id),
  old_scheduled_at: timestamp("old_scheduled_at", { withTimezone: true }).notNull(),
  new_scheduled_at: timestamp("new_scheduled_at", { withTimezone: true }).notNull(),
  reason: text("reason").notNull(),
  status: rescheduleStatusEnum("status").notNull().default('pending'),
  approved_by: varchar("approved_by").references(() => profiles.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  is_read: boolean("is_read").notNull().default(false),
  related_id: varchar("related_id"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const feedbacks = pgTable("feedbacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  from_user_id: varchar("from_user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  to_user_id: varchar("to_user_id").references(() => profiles.id, { onDelete: "cascade" }),
  feedback_type: feedbackTypeEnum("feedback_type").notNull(),
  status: feedbackStatusEnum("status").notNull().default('sent'),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  rating: integer("rating").notNull(),
  class_id: varchar("class_id").references(() => classes.id),
  teacher_feedback: text("teacher_feedback"),
  student_feedback: text("student_feedback"),
  class_feedback: text("class_feedback"),
  general_feedback: text("general_feedback"),
  response: text("response"),
  responded_by: varchar("responded_by").references(() => profiles.id),
  responded_at: timestamp("responded_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  html_content: text("html_content").notNull(),
  text_content: text("text_content"),
  template_type: emailSequenceTypeEnum("template_type").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  variables: text("variables"),
  ab_test_id: varchar("ab_test_id"),
  variation_name: text("variation_name"),
  created_by: varchar("created_by").notNull().references(() => profiles.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailSequences = pgTable("email_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  sequence_type: emailSequenceTypeEnum("sequence_type").notNull(),
  trigger_event: eventTypeEnum("trigger_event").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  target_role: userRoleEnum("target_role"),
  target_level: studentLevelEnum("target_level"),
  segmentation_criteria: text("segmentation_criteria"),
  created_by: varchar("created_by").notNull().references(() => profiles.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailSequenceSteps = pgTable("email_sequence_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequence_id: varchar("sequence_id").notNull().references(() => emailSequences.id, { onDelete: "cascade" }),
  template_id: varchar("template_id").notNull().references(() => emailTemplates.id),
  step_order: integer("step_order").notNull(),
  delay_hours: integer("delay_hours").notNull().default(0),
  delay_days: integer("delay_days").notNull().default(0),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    uniqueStepOrder: unique().on(table.sequence_id, table.step_order),
  };
});

export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  campaign_type: campaignTypeEnum("campaign_type").notNull(),
  status: campaignStatusEnum("status").notNull().default('draft'),
  start_date: timestamp("start_date", { withTimezone: true }),
  end_date: timestamp("end_date", { withTimezone: true }),
  target_audience: text("target_audience"),
  budget: integer("budget"),
  daily_budget: integer("daily_budget"),
  email_template_id: varchar("email_template_id").references(() => emailTemplates.id),
  sequence_id: varchar("sequence_id").references(() => emailSequences.id),
  total_sent: integer("total_sent").notNull().default(0),
  total_delivered: integer("total_delivered").notNull().default(0),
  total_opened: integer("total_opened").notNull().default(0),
  total_clicked: integer("total_clicked").notNull().default(0),
  total_converted: integer("total_converted").notNull().default(0),
  total_cost: integer("total_cost").notNull().default(0),
  created_by: varchar("created_by").notNull().references(() => profiles.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userEvents = pgTable("user_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  session_id: text("session_id"),
  event_type: eventTypeEnum("event_type").notNull(),
  event_name: text("event_name").notNull(),
  page_url: text("page_url"),
  referrer: text("referrer"),
  event_data: text("event_data"),
  utm_source: text("utm_source"),
  utm_medium: text("utm_medium"),
  utm_campaign: text("utm_campaign"),
  utm_content: text("utm_content"),
  utm_term: text("utm_term"),
  user_agent: text("user_agent"),
  ip_address: text("ip_address"),
  country: text("country"),
  city: text("city"),
  device_type: text("device_type"),
  browser: text("browser"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  duration: integer("duration"),
});

export const leadScoring = pgTable("lead_scoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }).unique(),
  total_score: integer("total_score").notNull().default(0),
  score_tier: leadScoreTierEnum("score_tier").notNull().default('cold'),
  engagement_score: integer("engagement_score").notNull().default(0),
  interaction_score: integer("interaction_score").notNull().default(0),
  conversion_score: integer("conversion_score").notNull().default(0),
  behavior_score: integer("behavior_score").notNull().default(0),
  recency_score: integer("recency_score").notNull().default(0),
  last_activity: timestamp("last_activity", { withTimezone: true }).defaultNow().notNull(),
  qualified_at: timestamp("qualified_at", { withTimezone: true }),
  assigned_to: varchar("assigned_to").references(() => profiles.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leadScoringRules = pgTable("lead_scoring_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  event_type: eventTypeEnum("event_type").notNull(),
  event_criteria: text("event_criteria"),
  points: integer("points").notNull(),
  max_points_per_day: integer("max_points_per_day"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const abTests = pgTable("ab_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  test_type: text("test_type").notNull(),
  status: abTestStatusEnum("status").notNull().default('draft'),
  traffic_split: integer("traffic_split").notNull().default(50),
  min_sample_size: integer("min_sample_size").notNull().default(100),
  confidence_level: integer("confidence_level").notNull().default(95),
  start_date: timestamp("start_date", { withTimezone: true }),
  end_date: timestamp("end_date", { withTimezone: true }),
  winner_variant: text("winner_variant"),
  statistical_significance: boolean("statistical_significance").default(false),
  confidence_score: integer("confidence_score"),
  created_by: varchar("created_by").notNull().references(() => profiles.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const abTestVariants = pgTable("ab_test_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  test_id: varchar("test_id").notNull().references(() => abTests.id, { onDelete: "cascade" }),
  variant_name: text("variant_name").notNull(),
  variant_data: text("variant_data").notNull(),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  conversion_rate: integer("conversion_rate").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    uniqueTestVariant: unique().on(table.test_id, table.variant_name),
  };
});

export const emailCampaignExecutions = pgTable("email_campaign_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaign_id: varchar("campaign_id").notNull().references(() => marketingCampaigns.id, { onDelete: "cascade" }),
  user_id: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  template_id: varchar("template_id").notNull().references(() => emailTemplates.id),
  sequence_id: varchar("sequence_id").references(() => emailSequences.id),
  sequence_step_id: varchar("sequence_step_id").references(() => emailSequenceSteps.id),
  email_subject: text("email_subject").notNull(),
  email_content: text("email_content").notNull(),
  recipient_email: text("recipient_email").notNull(),
  sent_at: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  delivered_at: timestamp("delivered_at", { withTimezone: true }),
  opened_at: timestamp("opened_at", { withTimezone: true }),
  first_click_at: timestamp("first_click_at", { withTimezone: true }),
  last_click_at: timestamp("last_click_at", { withTimezone: true }),
  unsubscribed_at: timestamp("unsubscribed_at", { withTimezone: true }),
  total_opens: integer("total_opens").notNull().default(0),
  total_clicks: integer("total_clicks").notNull().default(0),
  ab_test_id: varchar("ab_test_id").references(() => abTests.id),
  variant_name: text("variant_name"),
  delivery_status: text("delivery_status").notNull().default('sent'),
  error_message: text("error_message"),
});

export const marketingWorkflows = pgTable("marketing_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  trigger_event: eventTypeEnum("trigger_event").notNull(),
  trigger_criteria: text("trigger_criteria"),
  is_active: boolean("is_active").notNull().default(true),
  actions: text("actions").notNull(),
  total_triggered: integer("total_triggered").notNull().default(0),
  total_completed: integer("total_completed").notNull().default(0),
  avg_completion_time: integer("avg_completion_time"),
  created_by: varchar("created_by").notNull().references(() => profiles.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailSuppressionList = pgTable("email_suppression_list", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  reason: suppressionReasonEnum("reason").notNull(),
  description: text("description"),
  sg_message_id: text("sg_message_id"),
  campaign_id: varchar("campaign_id").references(() => marketingCampaigns.id),
  user_id: varchar("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const marketingAnalytics = pgTable("marketing_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date", { withTimezone: true }).notNull(),
  metric_type: text("metric_type").notNull(),
  metric_id: varchar("metric_id").notNull(),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  revenue: integer("revenue").notNull().default(0),
  cost: integer("cost").notNull().default(0),
  click_rate: integer("click_rate").notNull().default(0),
  conversion_rate: integer("conversion_rate").notNull().default(0),
  roi: integer("roi").notNull().default(0),
  metadata: text("metadata"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    uniqueMetric: unique().on(table.date, table.metric_type, table.metric_id),
  };
});

export const paymentProviderEnum = pgEnum('payment_provider', ['asaas']);

export const paymentSettings = pgTable("payment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  active_provider: paymentProviderEnum("active_provider").notNull().default('asaas'),
  asaas_api_token: text("asaas_api_token"),
  asaas_sandbox: boolean("asaas_sandbox").notNull().default(true),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updated_by: varchar("updated_by").references(() => profiles.id),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProfileSchema = createInsertSchema(profiles);
export const selectProfileSchema = createSelectSchema(profiles);

export const insertTeacherAvailabilitySchema = createInsertSchema(teacherAvailability).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateTeacherAvailabilitySchema = insertTeacherAvailabilitySchema.partial();

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateClassSchema = insertClassSchema.partial();

export const insertClassRescheduleSchema = createInsertSchema(classReschedules).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateClassRescheduleSchema = insertClassRescheduleSchema.partial();

export const insertForumPostSchema = createInsertSchema(forumPosts).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateForumPostSchema = insertForumPostSchema.partial();

export const insertForumLikeSchema = createInsertSchema(forumLikes).omit({
  id: true,
  created_at: true,
});

export const selectForumLikeSchema = createSelectSchema(forumLikes);

export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateFeedbackSchema = insertFeedbackSchema.partial();

export const teacherFeedbackSchema = z.object({
  didatica: z.number().min(1).max(5),
  metodologia: z.number().min(1).max(5),
  clareza: z.number().min(1).max(5),
  paciencia: z.number().min(1).max(5),
  pontualidade: z.number().min(1).max(5),
});

export const studentFeedbackSchema = z.object({
  progresso: z.number().min(1).max(5),
  participacao: z.number().min(1).max(5),
  pontualidade: z.number().min(1).max(5),
  dedicacao: z.number().min(1).max(5),
  evolucao: z.number().min(1).max(5),
});

export const classFeedbackSchema = z.object({
  conteudo: z.number().min(1).max(5),
  material_didatico: z.number().min(1).max(5),
  dificuldade: z.number().min(1).max(5),
  duracao: z.number().min(1).max(5),
  utilidade: z.number().min(1).max(5),
});

export const generalFeedbackSchema = z.object({
  plataforma: z.number().min(1).max(5),
  infraestrutura: z.number().min(1).max(5),
  sugestoes: z.string().optional(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateEmailTemplateSchema = insertEmailTemplateSchema.partial();

export const insertEmailSequenceSchema = createInsertSchema(emailSequences).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateEmailSequenceSchema = insertEmailSequenceSchema.partial();

export const insertEmailSequenceStepSchema = createInsertSchema(emailSequenceSteps).omit({
  id: true,
  created_at: true,
});

export const updateEmailSequenceStepSchema = insertEmailSequenceStepSchema.partial();

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  total_sent: true,
  total_delivered: true,
  total_opened: true,
  total_clicked: true,
  total_converted: true,
  total_cost: true,
  created_at: true,
  updated_at: true,
});

export const updateMarketingCampaignSchema = insertMarketingCampaignSchema.partial();

export const insertUserEventSchema = createInsertSchema(userEvents).omit({
  id: true,
  timestamp: true,
});

export const insertLeadScoringSchema = createInsertSchema(leadScoring).omit({
  id: true,
  total_score: true,
  score_tier: true,
  engagement_score: true,
  interaction_score: true,
  conversion_score: true,
  behavior_score: true,
  recency_score: true,
  last_activity: true,
  created_at: true,
  updated_at: true,
});

export const updateLeadScoringSchema = insertLeadScoringSchema.partial();

export const insertLeadScoringRuleSchema = createInsertSchema(leadScoringRules).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateLeadScoringRuleSchema = insertLeadScoringRuleSchema.partial();

export const insertAbTestSchema = createInsertSchema(abTests).omit({
  id: true,
  winner_variant: true,
  statistical_significance: true,
  confidence_score: true,
  created_at: true,
  updated_at: true,
});

export const updateAbTestSchema = insertAbTestSchema.partial();

export const insertAbTestVariantSchema = createInsertSchema(abTestVariants).omit({
  id: true,
  impressions: true,
  clicks: true,
  conversions: true,
  conversion_rate: true,
  created_at: true,
});

export const updateAbTestVariantSchema = insertAbTestVariantSchema.partial();

export const insertEmailCampaignExecutionSchema = createInsertSchema(emailCampaignExecutions).omit({
  id: true,
  sent_at: true,
  total_opens: true,
  total_clicks: true,
});

export const insertMarketingWorkflowSchema = createInsertSchema(marketingWorkflows).omit({
  id: true,
  total_triggered: true,
  total_completed: true,
  avg_completion_time: true,
  created_at: true,
  updated_at: true,
});

export const updateMarketingWorkflowSchema = insertMarketingWorkflowSchema.partial();

export const insertMarketingAnalyticsSchema = createInsertSchema(marketingAnalytics).omit({
  id: true,
  click_rate: true,
  conversion_rate: true,
  roi: true,
  created_at: true,
});

// Site Appearance Settings
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  setting_key: text("setting_key").notNull().unique(),
  setting_value: text("setting_value"),
  setting_type: text("setting_type").notNull().default('text'), // text, image, color, json
  category: text("category").notNull().default('general'), // general, hero, branding, footer
  label: text("label").notNull(),
  description: text("description"),
  updated_by: varchar("updated_by").references(() => profiles.id),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updated_at: true,
});

// Meet Links
export const meetLinks = pgTable("meet_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  link: text("link").notNull(),
  created_by: varchar("created_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMeetLinkSchema = createInsertSchema(meetLinks).omit({ id: true, created_at: true });

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  from_user_id: varchar("from_user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  to_user_id: varchar("to_user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("medium"),
  is_read: boolean("is_read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, is_read: true, created_at: true });

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, status: true, created_at: true, updated_at: true });

// Lesson Progress (LearningPath)
export const lessonProgress = pgTable("lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  student_id: varchar("student_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  lesson_id: text("lesson_id").notNull(),
  module_id: text("module_id").notNull(),
  lesson_number: integer("lesson_number"),
  status: text("status").notNull().default("available"),
  score: integer("score"),
  xp_earned: integer("xp_earned").default(0),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueProgress: unique().on(table.student_id, table.lesson_id),
}));

export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({ id: true, created_at: true, updated_at: true });

// Activity Progress — tracks each Be Fluent activity (1-20) per module per student
export const activityProgress = pgTable("activity_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  student_id: varchar("student_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  module_id: text("module_id").notNull(),
  activity_number: integer("activity_number").notNull(),
  status: activityStatusEnum("status").notNull().default("not_started"),
  classes_used: integer("classes_used").notNull().default(0),
  started_at: timestamp("started_at", { withTimezone: true }),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueActivity: unique().on(table.student_id, table.module_id, table.activity_number),
}));

export const insertActivityProgressSchema = createInsertSchema(activityProgress).omit({ id: true, created_at: true, updated_at: true });
export const updateActivityProgressSchema = insertActivityProgressSchema.partial();

// Exams — theoretical (Google Forms) and performatic (oral analysis)
export const exams = pgTable("exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  student_id: varchar("student_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  teacher_id: varchar("teacher_id").references(() => profiles.id, { onDelete: "set null" }),
  module_id: text("module_id").notNull(),
  triggered_by_activity: integer("triggered_by_activity").notNull(),
  exam_type: examTypeEnum("exam_type").notNull(),
  status: examStatusEnum("status").notNull().default("pending"),
  score: integer("score"),
  max_score: integer("max_score").default(100),
  feedback: text("feedback"),
  form_link: text("form_link"),
  triggered_at: timestamp("triggered_at", { withTimezone: true }).defaultNow().notNull(),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertExamSchema = createInsertSchema(exams).omit({ id: true, created_at: true, updated_at: true, triggered_at: true });
export const updateExamSchema = insertExamSchema.partial();

export const updateSiteSettingSchema = insertSiteSettingSchema.partial();

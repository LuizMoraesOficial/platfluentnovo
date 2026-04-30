import { lazy } from 'react';
import { PageLoading } from '@/components/loading/PageLoading';
import { performanceMonitor } from '@/lib/performance';

// Performance optimization: Lazy load heavy dashboard components
// Track component load performance
const createLazyComponent = (
  importFn,
  componentName
) => {
  return lazy(() => {
    const startTime = performance.now();
    return importFn().then((module) => {
      performanceMonitor.trackComponentLoad(componentName, startTime);
      return module;
    });
  });
};

// Lazy loading dos componentes pesados por categoria para otimização de bundle

// === DASHBOARD SECTIONS POR ROLE ===
export const LazyAdminDashboard = createLazyComponent(
  () => import('@/components/dashboard/sections/AdminDashboard').then(module => ({
    default: module.AdminDashboard
  })),
  'AdminDashboard'
);

export const LazyTeacherDashboard = createLazyComponent(
  () => import('@/components/dashboard/sections/TeacherDashboard').then(module => ({
    default: module.TeacherDashboard
  })),
  'TeacherDashboard'
);

export const LazyStudentDashboard = createLazyComponent(
  () => import('@/components/dashboard/sections/StudentDashboard').then(module => ({
    default: module.StudentDashboard
  })),
  'StudentDashboard'
);

// === COMPONENTES DE CALENDAR E SCHEDULING ===
export const LazySmartCalendar = createLazyComponent(
  () => import('@/components/calendar/SmartCalendar').then(module => ({
    default: module.SmartCalendar
  })),
  'SmartCalendar'
);

// === COMPONENTES DE RELATÓRIOS E ANALYTICS ===
export const LazyAdvancedReports = createLazyComponent(
  () => import('@/components/dashboard/sections/AdvancedReports').then(module => ({
    default: module.AdvancedReports
  })),
  'AdvancedReports'
);

// === COMPONENTES DE FEEDBACK E FORMS ===
export const LazyFeedbackSystem = createLazyComponent(
  () => import('@/components/feedback/FeedbackSystem').then(module => ({
    default: module.FeedbackSystem
  })),
  'FeedbackSystem'
);

export const LazyStudentFeedback = createLazyComponent(
  () => import('@/components/feedback/StudentFeedback').then(module => ({
    default: module.StudentFeedback
  })),
  'StudentFeedback'
);

// === COMPONENTES DE PAGAMENTO ===
export const LazyPaymentSystem = createLazyComponent(
  () => import('@/components/payments/PaymentSystem').then(module => ({
    default: module.PaymentSystem
  })),
  'PaymentSystem'
);

// === COMPONENTES DE COMUNICAÇÃO ===
export const LazyMessageCenter = createLazyComponent(
  () => import('@/components/messages/MessageCenter').then(module => ({
    default: module.MessageCenter
  })),
  'MessageCenter'
);

export const LazyChatSupport = createLazyComponent(
  () => import('@/components/support/ChatSupport').then(module => ({
    default: module.ChatSupport
  })),
  'ChatSupport'
);

// === COMPONENTES ADMINISTRATIVOS ===
export const LazyUserManagement = createLazyComponent(
  () => import('@/components/admin/UserManagement').then(module => ({
    default: module.UserManagement
  })),
  'UserManagement'
);

export const LazyStudentManagement = createLazyComponent(
  () => import('@/components/admin/StudentManagement').then(module => ({
    default: module.StudentManagement
  })),
  'StudentManagement'
);

export const LazyTeacherManagement = createLazyComponent(
  () => import('@/components/admin/TeacherManagement').then(module => ({
    default: module.TeacherManagement
  })),
  'TeacherManagement'
);

export const LazySystemSettings = createLazyComponent(
  () => import('@/components/admin/SystemSettings').then(module => ({
    default: module.SystemSettings
  })),
  'SystemSettings'
);

// === COMPONENTES DE PROFESSOR ===
export const LazyClassManagement = createLazyComponent(
  () => import('@/components/teacher/ClassManagement').then(module => ({
    default: module.ClassManagement
  })),
  'ClassManagement'
);

export const LazyTeacherStudentManagement = createLazyComponent(
  () => import('@/components/teacher/StudentManagement').then(module => ({
    default: module.StudentManagement
  })),
  'TeacherStudentManagement'
);

export const LazyTeacherEarnings = createLazyComponent(
  () => import('@/components/teacher/TeacherEarnings').then(module => ({
    default: module.TeacherEarnings
  })),
  'TeacherEarnings'
);

export const LazyTeacherAvailability = createLazyComponent(
  () => import('@/components/teacher/TeacherAvailability').then(module => ({
    default: module.TeacherAvailability
  })),
  'TeacherAvailability'
);

// === COMPONENTES DE ESTUDANTE ===
export const LazyLearningPath = createLazyComponent(
  () => import('@/components/student/LearningPath').then(module => ({
    default: module.LearningPath
  })),
  'LearningPath'
);

export const LazyStudyMaterials = createLazyComponent(
  () => import('@/components/student/StudyMaterials').then(module => ({
    default: module.StudyMaterials
  })),
  'StudyMaterials'
);

// === COMPONENTES DE PROGRESS E GAMIFICATION ===
export const LazyProgressTracker = createLazyComponent(
  () => import('@/components/gamification/ProgressTracker').then(module => ({
    default: module.ProgressTracker
  })),
  'ProgressTracker'
);

// === COMPONENTES DE FORUM E COMMUNITY ===
export const LazyForumSection = createLazyComponent(
  () => import('@/components/forum/ForumSection').then(module => ({
    default: module.ForumSection
  })),
  'ForumSection'
);

// === COMPONENTES DE RESCHEDULE ===
export const LazyRescheduleManagement = createLazyComponent(
  () => import('@/components/reschedule/RescheduleManagement').then(module => ({
    default: module.RescheduleManagement
  })),
  'RescheduleManagement'
);

export const LazyRescheduleStatus = createLazyComponent(
  () => import('@/components/reschedule/RescheduleStatus').then(module => ({
    default: module.RescheduleStatus
  })),
  'RescheduleStatus'
);

// === COMPONENTES DE PROFILE E SETTINGS ===
export const LazyUserProfile = createLazyComponent(
  () => import('@/components/profile/UserProfile').then(module => ({
    default: module.UserProfile
  })),
  'UserProfile'
);

export const LazyUserSettings = createLazyComponent(
  () => import('@/components/settings/UserSettings').then(module => ({
    default: module.UserSettings
  })),
  'UserSettings'
);

// Preload function para componentes críticos baseado no role
export const preloadCriticalComponents = (userRole) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      switch (userRole) {
        case 'admin':
          import('@/components/admin/UserManagement');
          import('@/components/dashboard/sections/AdvancedReports');
          break;
        case 'teacher':
          import('@/components/teacher/ClassManagement');
          import('@/components/calendar/SmartCalendar');
          break;
        case 'student':
          import('@/components/student/LearningPath');
          import('@/components/calendar/SmartCalendar');
          break;
      }
    });
  }
};

// Component loading fallback padrão
export const ComponentLoadingFallback = ({ message = "Carregando componente..."  }) => (
  <PageLoading message={message} fullScreen={false} />
);
// Feedback validation utilities based on user roles

// Role-based validation rules
export const canGiveFeedbackToRole = (userRole, targetType) => {
  switch (userRole) {
    case 'student':
      // Students CAN give feedback to: teachers, classes, general
      // Students CANNOT give feedback to: other students
      return targetType !== 'student';
    
    case 'teacher':
      // Teachers CAN give feedback to: students, classes, general
      // Teachers CANNOT give feedback to: other teachers
      return targetType !== 'teacher';
    
    case 'admin':
      // Admins can give feedback to anyone
      return true;
    
    default:
      return false;
  }
};

// Get available feedback types for a user role
export const getAvailableFeedbackTypes = (userRole) => {
  switch (userRole) {
    case 'student':
      return ['teacher', 'class', 'general'];
    case 'teacher':
      return ['student', 'class', 'general'];
    case 'admin':
      return ['teacher', 'student', 'class', 'general'];
    default:
      return [];
  }
};

// Get available recipients based on user role and feedback type
// Recipients should be fetched from /api/profiles/recipients at runtime
export const getAvailableRecipients = (userRole, feedbackType) => {
  if (feedbackType === 'general') {
    return [{ value: 'be-fluent-school', label: 'Be Fluent School', icon: '🏫' }];
  }
  return [];
};

// Validation messages
export const getValidationMessage = (userRole, targetType) => {
  if (!canGiveFeedbackToRole(userRole, targetType)) {
    switch (userRole) {
      case 'student':
        return 'Alunos não podem dar feedback para outros alunos.';
      case 'teacher':
        return 'Professores não podem dar feedback para outros professores.';
      default:
        return 'Não é possível dar feedback para este tipo.';
    }
  }
  return '';
};

// Get feedback type label
export const getFeedbackTypeLabel = (type) => {
  switch (type) {
    case 'teacher': return 'Professor';
    case 'student': return 'Aluno';
    case 'class': return 'Aula';
    case 'general': return 'Geral';
    default: return 'Desconhecido';
  }
};

// Get feedback type icon
export const getFeedbackTypeIcon = (type) => {
  switch (type) {
    case 'teacher': return '👨‍🏫';
    case 'student': return '👨‍🎓';
    case 'class': return '📚';
    case 'general': return '💭';
    default: return '💬';
  }
};

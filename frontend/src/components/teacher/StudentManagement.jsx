import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Loader2, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { StudentProgressPanel } from './StudentProgressPanel';

const BF_MODULE_INFO = {
  S1: { cefr: 'A1', level: 'Start' }, S2: { cefr: 'A1', level: 'Start' }, S3: { cefr: 'A2', level: 'Start' },
  I1: { cefr: 'B1', level: 'Intermediate' }, I2: { cefr: 'B1', level: 'Intermediate' }, I3: { cefr: 'B2', level: 'Intermediate' },
  AD1: { cefr: 'B2', level: 'Advanced' }, AD2: { cefr: 'C1', level: 'Advanced' }, AD3: { cefr: 'C1', level: 'Advanced' }, AD4: { cefr: 'C2', level: 'Advanced' },
};

export function StudentManagement({ teacherName = 'Professor' }) {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['/api/students'],
    queryFn: () => apiRequest('/students'),
    staleTime: 60_000,
  });

  // Filter only students assigned to this teacher
  const myStudents = students.filter(s =>
    (!profile?.id || s.teacher_id === profile?.id) &&
    (s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     s.email?.toLowerCase().includes(search.toLowerCase()))
  );

  // If no teacher_id filtering is possible (admin view), show all
  const displayStudents = profile?.role === 'teacher'
    ? students.filter(s => s.teacher_id === profile.id &&
        (s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())))
    : students.filter(s =>
        s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="db-panel-title" style={{ fontSize: 18 }}>Meus Alunos</div>
          <div className="db-panel-sub">{displayStudents.length} aluno{displayStudents.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#42424a' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar aluno..."
          style={{
            width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#eeeef0', fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Total Alunos', value: displayStudents.length, color: '#3b82f6' },
          { label: 'Módulo Start', value: displayStudents.filter(s => BF_MODULE_INFO[s.current_module]?.level === 'Start').length, color: '#22c55e' },
          { label: 'Módulo Advanced', value: displayStudents.filter(s => BF_MODULE_INFO[s.current_module]?.level === 'Advanced').length, color: '#a855f7' },
        ].map(({ label, value, color }, i) => (
          <div key={label} className={`db-kpi da${i + 1}`} style={{ '--kpi-accent': color + '30', padding: 14 }}>
            <div className="db-kpi-icon" style={{ background: color + '12', borderColor: color + '25', color, width: 28, height: 28, borderRadius: 7 }}>
              <Users style={{ width: 12, height: 12 }} />
            </div>
            <div className="db-kpi-num" style={{ fontSize: '1.4rem', marginTop: 10 }}>{value}</div>
            <div className="db-kpi-label" style={{ fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Student list with progress panels */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 style={{ width: 18, height: 18, color: '#E59313' }} className="animate-spin" />
        </div>
      ) : displayStudents.length === 0 ? (
        <div className="db-panel">
          <div className="db-panel-inner" style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <Users style={{ width: 28, height: 28, color: '#252529' }} />
            <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#42424a' }}>
              {search ? 'Nenhum aluno encontrado' : 'Nenhum aluno vinculado'}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayStudents.map(student => (
            <StudentProgressPanel key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  );
}

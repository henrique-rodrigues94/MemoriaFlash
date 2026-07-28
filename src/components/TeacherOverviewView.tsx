import React, { useState } from 'react';
import {
  School,
  Users,
  Copy,
  QrCode,
  CheckCircle2,
  Download,
  BookOpen,
  Plus,
  Sparkles,
  Search,
} from 'lucide-react';
import { TeacherClass } from '../types';

interface TeacherOverviewViewProps {
  classes: TeacherClass[];
  onSaveClass: (newClass: TeacherClass) => void;
}

export const TeacherOverviewView: React.FC<TeacherOverviewViewProps> = ({
  classes,
  onSaveClass,
}) => {
  const [selectedClass, setSelectedClass] = useState<TeacherClass>(classes[0]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleExportPdf = () => {
    alert(`Gerando relatório em PDF para a turma "${selectedClass.name}" com ${selectedClass.students.length} alunos...`);
  };

  const handleCreateClass = () => {
    if (!newClassName.trim()) return;
    const created: TeacherClass = {
      id: `class-${Date.now()}`,
      name: newClassName,
      category: newCategory || 'Educação',
      studentCount: 1,
      averageMasteryPercent: 75,
      bgImageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      code: `PROF-${Math.floor(1000 + Math.random() * 9000)}`,
      students: [
        {
          id: 'st-new',
          name: 'Maria Rodrigues (Professor)',
          email: 'maria.r@escola.edu.br',
          masteryPercent: 100,
          studyTimeFormatted: '10h 00m',
          lastActive: 'Agora',
        },
      ],
    };
    onSaveClass(created);
    setSelectedClass(created);
    setNewClassName('');
    setNewCategory('');
    setShowCreateModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#adc6ff]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D8EFEF]/10 text-[#D8EFEF] border border-[#D8EFEF]/20 text-xs font-mono font-bold mb-2">
            <School className="w-3.5 h-3.5" /> PAINEL DO PROFESSOR & INSTITUCIONAL
          </div>
          <h2 className="text-2xl font-extrabold text-white">Gestão de Turmas & Desempenho</h2>
          <p className="text-xs text-[#8c91a0] mt-1">
            Acompanhe o domínio SRS dos alunos, compartilhe códigos de turma e exporte relatórios.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Criar Nova Turma
        </button>
      </div>

      {/* Class Cards Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            onClick={() => setSelectedClass(cls)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              selectedClass?.id === cls.id
                ? 'bg-[#122238] border-[#60a5fa] shadow-xl shadow-blue-500/10'
                : 'glass-card border-[#424754]/30 hover:border-[#adc6ff]/40'
            }`}
          >
            <div>
              <span className="px-2.5 py-0.5 rounded-md bg-[#0b1a2a] text-[#adc6ff] text-[10px] font-mono border border-[#adc6ff]/20">
                {cls.category}
              </span>
              <h3 className="text-sm font-bold text-white mt-2">{cls.name}</h3>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#424754]/20 text-xs text-[#8c91a0]">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#60a5fa]" /> {cls.studentCount} Alunos
              </span>
              <span className="text-emerald-400 font-bold">{cls.averageMasteryPercent}% Média</span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Class Analytics & Invite Center */}
      {selectedClass && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#adc6ff]/20 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#424754]/30 pb-6">
            <div>
              <h3 className="text-xl font-bold text-white">{selectedClass.name}</h3>
              <p className="text-xs text-[#8c91a0]">{selectedClass.category} • Código Ativo</p>
            </div>

            {/* Invite Code Box */}
            <div className="flex items-center gap-2 bg-[#0b1a2a] p-3 rounded-2xl border border-[#adc6ff]/20">
              <div>
                <div className="text-[10px] font-mono text-[#8c91a0] uppercase">Código de Acesso</div>
                <div className="text-sm font-mono font-extrabold text-[#60a5fa]">
                  {selectedClass.code}
                </div>
              </div>

              <button
                onClick={() => handleCopyCode(selectedClass.code)}
                className="p-2 rounded-xl bg-[#122131] text-[#adc6ff] hover:text-white hover:bg-[#1c2b3c] transition-colors"
                title="Copiar Código"
              >
                {copiedCode ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="p-2 rounded-xl bg-[#122131] text-[#adc6ff] hover:text-white hover:bg-[#1c2b3c] transition-colors"
                title="Exibir QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#60a5fa]" /> Lista de Alunos Matriculados ({selectedClass.students.length})
              </h4>

              <button
                onClick={handleExportPdf}
                className="px-3.5 py-1.5 rounded-xl bg-[#122131] hover:bg-[#1c2b3c] text-[#adc6ff] text-xs font-bold flex items-center gap-1.5 border border-[#adc6ff]/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Relatório em PDF
              </button>
            </div>

            <div className="space-y-2">
              {selectedClass.students.length > 0 ? (
                selectedClass.students.map((st) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{st.name}</div>
                      <div className="text-[10px] text-[#8c91a0]">{st.email} • Ativo: {st.lastActive}</div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-[10px] text-[#8c91a0]">Horas de Estudo</div>
                        <div className="font-mono text-white font-bold">{st.studyTimeFormatted}</div>
                      </div>

                      <div className="w-24">
                        <div className="flex justify-between text-[10px] font-mono text-[#8c91a0] mb-0.5">
                          <span>Dominância</span>
                          <span className="text-emerald-400 font-bold">{st.masteryPercent}%</span>
                        </div>
                        <div className="w-full bg-[#122131] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full rounded-full"
                            style={{ width: `${st.masteryPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-[#8c91a0] bg-[#0b1a2a] rounded-2xl">
                  Nenhum aluno entrou nesta turma ainda. Compartilhe o código <strong className="text-[#60a5fa]">{selectedClass.code}</strong>.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1a2a] border border-[#adc6ff]/20 rounded-3xl p-6 text-center space-y-4 max-w-sm w-full text-white">
            <h3 className="text-lg font-bold">QR Code de Acesso da Turma</h3>
            <p className="text-xs text-[#8c91a0]">{selectedClass.name}</p>

            <div className="p-6 bg-white rounded-2xl mx-auto w-48 h-48 flex items-center justify-center shadow-2xl">
              <div className="w-36 h-36 border-4 border-black p-2 flex flex-col items-center justify-center text-black font-mono text-[10px] font-bold text-center">
                <span>FLASHMIND AI</span>
                <span className="text-base my-2">{selectedClass.code}</span>
                <span>SCAN TO JOIN</span>
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#122131] hover:bg-[#1c2b3c] text-white text-xs font-bold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1a2a] border border-[#adc6ff]/20 rounded-3xl p-6 space-y-4 max-w-md w-full text-white">
            <h3 className="text-lg font-bold">Criar Nova Turma de Alunos</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#8c91a0] uppercase">Nome da Turma</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ex: Direito Processual Civil - Turma B"
                  className="w-full mt-1 bg-[#122131] border border-[#424754]/40 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#8c91a0] uppercase">Categoria / Matéria</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Ex: Direito"
                  className="w-full mt-1 bg-[#122131] border border-[#424754]/40 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#122131] hover:bg-[#1c2b3c] text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateClass}
                className="flex-1 py-3 rounded-xl bg-[#4d8eff] hover:bg-[#3b82f6] text-xs font-bold"
              >
                Criar Turma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

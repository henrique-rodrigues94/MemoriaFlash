// src/components/BottomNav.tsx
import React from 'react';
import { Home, BookOpen, Mic, BarChart3, GraduationCap } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentLanguage?: string;
}

// Botão "Criar" removido da nav por ser redundante com o fluxo de criação
// acessível via aba Baralhos → Novo Deck. A nav agora tem 5 destinos claros:
// Início · Baralhos · Voz · Stats · Professor
export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home',    label: 'Início',    icon: <Home       size={22} /> },
    { id: 'explore', label: 'Baralhos', icon: <BookOpen   size={22} /> },
    { id: 'voice',   label: 'Voz',      icon: <Mic        size={22} /> },
    { id: 'stats',   label: 'Stats',    icon: <BarChart3  size={22} /> },
    { id: 'teacher', label: 'Professor',icon: <GraduationCap size={22} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0a1a2e]/95 backdrop-blur-sm border-t border-[#1a2d44] px-2 py-1 flex justify-around items-center z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === item.id
              ? 'text-[#adc6ff] bg-[#adc6ff]/10'
              : 'text-[#6a7f9f] hover:text-[#8aa4c8]'
          }`}
        >
          {item.icon}
          <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

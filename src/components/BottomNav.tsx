// src/components/BottomNav.tsx
import React from 'react';
import { Home, PlusCircle, Mic, BarChart3, GraduationCap } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentLanguage?: string;
}

export function BottomNav({ activeTab, setActiveTab, currentLanguage }: BottomNavProps) {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Início', icon: <Home size={24} /> },
    { id: 'create', label: 'Criar', icon: <PlusCircle size={24} /> },
    { id: 'voice', label: 'Voz', icon: <Mic size={24} /> },
    // Duelo removido
    { id: 'stats', label: 'Stats', icon: <BarChart3 size={24} /> },
    { id: 'teacher', label: 'Professor', icon: <GraduationCap size={24} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0a1a2e] border-t border-[#1a2d44] px-2 py-1 flex justify-around items-center z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
            activeTab === item.id
              ? 'text-[#adc6ff]'
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
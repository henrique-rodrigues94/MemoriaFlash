import React from 'react';
import { Home, Compass, PlusCircle, BarChart3, HelpCircle } from 'lucide-react';
import { ActiveTab } from '../types';
import { SupportedLanguage, translations } from '../lib/i18n';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentLanguage: SupportedLanguage;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isHighlight?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, currentLanguage }) => {
  const t = translations[currentLanguage] || translations.pt;

  const navItems: NavItem[] = [
      { id: 'home', label: 'Estudar', icon: Home },
      { id: 'quiz', label: 'QUIZ', icon: HelpCircle },
      { id: 'create', label: 'Cards', icon: PlusCircle },
      { id: 'stats', label: t.stats, icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0b1a2a]/95 backdrop-blur-lg border-t border-[#424754]/30 z-40 px-3 flex items-center justify-around max-w-lg mx-auto md:max-w-4xl rounded-t-2xl shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            id={`nav-btn-${item.id}`}
            onClick={() => setActiveTab(item.id as ActiveTab)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              isActive ? 'text-[#adc6ff] scale-105 font-bold' : 'text-[#8c91a0] hover:text-[#c2c6d6]'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-[#60a5fa]' : ''}`} />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

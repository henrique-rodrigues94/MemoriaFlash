import React from 'react';
import { Home, HelpCircle, Camera, Layers, BarChart2 } from 'lucide-react';
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
      { id: 'scanner', label: 'Scanner', icon: Camera },
      { id: 'cards', label: 'Cards', icon: Layers },
      { id: 'stats', label: t.stats, icon: BarChart2 },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 h-16 backdrop-blur-xl border-t z-50 px-3 flex items-center justify-around max-w-lg mx-auto md:max-w-4xl rounded-t-2xl shadow-2xl transition-colors duration-300 ${activeTab ? 'bg-[#0b1a2a]/95 border-[#424754]/30' : 'bg-[#0b1a2a]/95 border-[#424754]/30'}`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            id={`nav-btn-${item.id}`}
            onClick={() => setActiveTab(item.id as ActiveTab)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer nav-item ${
              isActive ? 'nav-item-active scale-105 font-bold' : 'nav-item-inactive hover:nav-item-hover'
            }`}
          >
            <Icon className={`w-5 h-5 nav-icon ${isActive ? 'nav-icon-active' : ''}`} />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

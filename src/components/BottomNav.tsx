import React from 'react';
import { Home, Compass, PlusCircle, BarChart3 } from 'lucide-react';
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
    { id: 'home', label: t.home, icon: Home },
    { id: 'explore', label: t.decks, icon: Compass },
    { id: 'create', label: t.aiStudio, icon: PlusCircle, isHighlight: true },
    { id: 'stats', label: t.stats, icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0b1a2a]/95 backdrop-blur-lg border-t border-[#424754]/30 z-40 px-3 flex items-center justify-around max-w-lg mx-auto md:max-w-4xl rounded-t-2xl shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        if (item.isHighlight) {
          return (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className="flex flex-col items-center -mt-5 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#60a5fa] text-white flex items-center justify-center shadow-lg shadow-[#3b82f6]/40 group-hover:scale-105 transition-transform">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-semibold mt-1 text-[#adc6ff]">
                {item.label}
              </span>
            </button>
          );
        }

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

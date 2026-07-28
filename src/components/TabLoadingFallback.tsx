import React from 'react';
import { Loader2 } from 'lucide-react';

// Fallback exibido brevemente enquanto um chunk de tela (carregado sob
// demanda via React.lazy) termina de baixar — ver App.tsx.
export const TabLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24 text-[#8c91a0]">
    <Loader2 className="w-6 h-6 animate-spin mr-2" />
    <span className="text-xs font-medium">Carregando...</span>
  </div>
);

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Download, Trash2, Plus, AlertCircle } from 'lucide-react';
import { Category } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onUpdateCategories: (newCategories: Category[]) => void;
  theme: 'light' | 'dark';
  onToggleTheme: (theme: 'light' | 'dark') => void;
  onExportCSV: () => void;
  onClearData: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  categories,
  onUpdateCategories,
  theme,
  onToggleTheme,
  onExportCSV,
  onClearData
}) => {
  const [newCategory, setNewCategory] = useState('');

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      onUpdateCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (catToRemove: string) => {
    onUpdateCategories(categories.filter(c => c !== catToRemove));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex justify-between items-center bg-surfaceHighlight/50">
              <h2 className="text-lg font-semibold text-textMain">Settings</h2>
              <button onClick={onClose} className="text-textMuted hover:text-textMain transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-8 no-scrollbar">
              
              {/* Appearance */}
              <section>
                <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Appearance</h3>
                <div className="bg-background rounded-xl p-1 flex gap-1 border border-border">
                  <button
                    onClick={() => onToggleTheme('light')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      theme === 'light' 
                        ? 'bg-surface text-textMain shadow-sm' 
                        : 'text-textMuted hover:text-textMain'
                    }`}
                  >
                    <Sun size={16} /> Light
                  </button>
                  <button
                    onClick={() => onToggleTheme('dark')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      theme === 'dark' 
                        ? 'bg-surface text-textMain shadow-sm' 
                        : 'text-textMuted hover:text-textMain'
                    }`}
                  >
                    <Moon size={16} /> Dark
                  </button>
                </div>
              </section>

              {/* Categories */}
              <section>
                <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Activities</h3>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/50 group">
                      <span className="text-sm text-textMain font-medium">{cat}</span>
                      <button 
                        onClick={() => handleRemoveCategory(cat)}
                        className="text-textMuted hover:text-danger p-1 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="New activity name..."
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-textMain/50"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <button
                      onClick={handleAddCategory}
                      disabled={!newCategory.trim()}
                      className="bg-textMain text-surface p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </section>

              {/* Data Zone */}
              <section>
                <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Data</h3>
                <div className="space-y-3">
                  <button 
                    onClick={onExportCSV}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-border text-textMain hover:bg-surfaceHighlight transition-colors text-sm font-medium"
                  >
                    <Download size={16} /> Export to CSV
                  </button>
                  
                  <div className="pt-2">
                     <button 
                      onClick={() => {
                        if(window.confirm('Are you sure? This will delete all history and reset categories.')) {
                          onClearData();
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 transition-colors text-sm font-medium"
                    >
                      <AlertCircle size={16} /> Clear All Data
                    </button>
                  </div>
                </div>
              </section>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
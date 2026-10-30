import React, { useState, useEffect } from 'react';
import {
  Building2,
  Cpu,
  ShieldCheck,
  Save,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { SystemSettings } from '../types';
import { api } from '../api';

interface SettingsViewProps {
  onRefreshStats: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshStats }) => {
  const [settings, setSettings] = useState<SystemSettings>({
    institution_name: 'V.S.B. ENGINEERING COLLEGE (AUTONOMOUS)',
    department_name: 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE & DATA SCIENCE',
    demo_mode: true,
    ai_provider: 'Hybrid (Offline Procedural + LLM)',
    has_gemini_api_key: false,
    has_openai_api_key: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => setSettings(s)).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.saveSettings(settings);
      setSaveSuccess(true);
      onRefreshStats();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="ledger-card p-6">
        <h2 className="text-lg font-bold font-serif text-[#1C1F24]">Institution & System Configuration</h2>
        <p className="text-xs text-[#5B6354]">
          Customize header branding, autonomous exam regulations, and AI generation parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Institutional Branding Card */}
        <div className="ledger-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-[#2D3128]/20">
            <Building2 className="w-4 h-4 text-[#C2571B]" />
            <h3 className="text-sm font-bold font-serif text-[#1C1F24]">Official Institution Letterhead</h3>
          </div>

          <div>
            <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
              Institution Name (Printed on Header)
            </label>
            <input
              type="text"
              value={settings.institution_name}
              onChange={(e) => setSettings({ ...settings, institution_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white border-2 border-[#2D3128] rounded text-xs font-bold font-serif text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
              Department Name
            </label>
            <input
              type="text"
              value={settings.department_name}
              onChange={(e) => setSettings({ ...settings, department_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white border-2 border-[#2D3128] rounded text-xs font-bold font-serif text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
            />
          </div>
        </div>

        {/* AI & Generation Engine Settings */}
        <div className="ledger-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-[#2D3128]/20">
            <Cpu className="w-4 h-4 text-[#C2571B]" />
            <h3 className="text-sm font-bold font-serif text-[#1C1F24]">AI Engine & Offline Demo Mode</h3>
          </div>

          <div className="p-4 rounded-md bg-[#EFF7F1] border-2 border-[#2A6E3B] shadow-[2px_2px_0_#2A6E3B] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#2A6E3B] flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold font-serif text-[#2A6E3B] block">Offline Academic Procedural Mode Active</span>
              <p className="text-[#2A6E3B] leading-relaxed font-serif">
                The application operates 100% locally with zero cloud API keys required. Questions, rubrics, and either/or pairs are procedurally synthesized using Bloom's Revised Taxonomy and Course Outcome constraints.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-md border-2 border-[#2D3128] bg-white shadow-[2px_2px_0_#2D3128] space-y-1">
              <div className="font-bold text-[#1C1F24] flex items-center justify-between">
                <span>Google Gemini API:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                  settings.has_gemini_api_key ? 'bg-[#EFF7F1] text-[#2A6E3B] border-[#2A6E3B]' : 'bg-[#EFE8DC] text-[#5B6354] border-[#2D3128]'
                }`}>
                  {settings.has_gemini_api_key ? 'Configured (Env)' : 'Not Set (Fallback Active)'}
                </span>
              </div>
              <p className="text-[11px] text-[#5B6354]">Configurable via <code className="bg-[#EFE8DC] px-1 py-0.5 rounded text-[#1C1F24]">GEMINI_API_KEY</code> environment variable.</p>
            </div>

            <div className="p-4 rounded-md border-2 border-[#2D3128] bg-white shadow-[2px_2px_0_#2D3128] space-y-1">
              <div className="font-bold text-[#1C1F24] flex items-center justify-between">
                <span>OpenAI API:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                  settings.has_openai_api_key ? 'bg-[#EFF7F1] text-[#2A6E3B] border-[#2A6E3B]' : 'bg-[#EFE8DC] text-[#5B6354] border-[#2D3128]'
                }`}>
                  {settings.has_openai_api_key ? 'Configured (Env)' : 'Not Set (Fallback Active)'}
                </span>
              </div>
              <p className="text-[11px] text-[#5B6354]">Configurable via <code className="bg-[#EFE8DC] px-1 py-0.5 rounded text-[#1C1F24]">OPENAI_API_KEY</code> environment variable.</p>
            </div>
          </div>
        </div>

        {/* Danger Zone: Reset Data */}
        <div className="bg-[#FAF0F0] p-6 rounded-md border-2 border-rose-600 shadow-[3px_3px_0_#9A2626] space-y-3">
          <div className="text-xs font-bold font-serif text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
            <Trash2 className="w-4 h-4 text-rose-600" />
            Reset Data & Clear Database
          </div>
          <p className="text-xs text-rose-700 leading-relaxed font-serif">
            Wipe all subjects, question banks, and generated papers to start with a completely empty database. All subject details and questions will need to be manually added.
          </p>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Wipe all subjects, questions, and papers to start with a 100% clean database?')) {
                try {
                  await api.resetAllData();
                  alert('Database cleared successfully! You can now manually add your subjects and questions.');
                  onRefreshStats();
                } catch (err: any) {
                  alert(err.message);
                }
              }
            }}
            className="px-4 py-2 rounded bg-white hover:bg-rose-100 text-rose-800 border-2 border-rose-600 text-xs font-bold font-serif transition-colors shadow-[1px_1px_0_#9A2626]"
          >
            Clear All Subjects & Questions
          </button>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          {saveSuccess && (
            <span className="text-xs font-bold font-mono text-[#2A6E3B] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-[#2A6E3B]" /> Settings Saved Successfully
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="btn-rust px-6 py-2.5 text-xs font-bold"
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

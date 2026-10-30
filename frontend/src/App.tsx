import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { UploadDocumentsView } from './views/UploadDocumentsView';
import { QuestionBankView } from './views/QuestionBankView';
import { GeneratePaperWizardView } from './views/GeneratePaperWizardView';
import { PaperEditorView } from './views/PaperEditorView';
import { GeneratedPapersView } from './views/GeneratedPapersView';
import { SettingsView } from './views/SettingsView';
import { api } from './api';
import { DashboardStats, Subject, UploadedDoc, GeneratedPaper, Template } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [activePaperId, setActivePaperId] = useState<number | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const loadInitialData = async () => {
    try {
      const [statsData, subjectsData, docsData, papersData, tmplsData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getSubjects().catch(() => []),
        api.getDocuments().catch(() => []),
        api.getPapers().catch(() => []),
        api.getTemplates().catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      setSubjects(subjectsData);
      setDocuments(docsData);
      setPapers(papersData);
      setTemplates(tmplsData);

      // If papers exist and activePaperId is null or not found, set to first paper
      if (papersData.length > 0) {
        if (!activePaperId || !papersData.some(p => p.id === activePaperId)) {
          setActivePaperId(papersData[0].id);
        }
      } else {
        setActivePaperId(null);
      }
    } catch (err) {
      console.error('Error loading initial application data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleNavigate = (tab: TabType, paperId?: number) => {
    if (paperId) {
      setActivePaperId(paperId);
    }
    setCurrentTab(tab);
  };

  const handlePaperGenerated = (newPaperId: number) => {
    setActivePaperId(newPaperId);
    setCurrentTab('editor');
    loadInitialData();
  };

  return (
    <div className="flex min-h-screen bg-[#F7F3EC] font-sans text-[#2D3128] antialiased selection:bg-[#C2571B] selection:text-white">
      {/* Dark Navy Sidebar */}
      <div className="no-print">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          activePaperId={activePaperId}
          stats={{
            total_questions: stats?.total_questions,
            total_papers: stats?.total_papers
          }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="no-print">
          <Navbar currentTab={currentTab} />
        </div>

        <main className="flex-1 pb-16">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              onNavigate={(tab, pid) => handleNavigate(tab, pid)}
            />
          )}

          {currentTab === 'upload' && (
            <UploadDocumentsView
              subjects={subjects}
              documents={documents}
              onRefresh={loadInitialData}
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'question_bank' && (
            <QuestionBankView
              subjects={subjects}
              templates={templates}
              onRefreshStats={loadInitialData}
              onPaperGenerated={handlePaperGenerated}
            />
          )}

          {currentTab === 'generate' && (
            <GeneratePaperWizardView
              subjects={subjects}
              templates={templates}
              onPaperGenerated={handlePaperGenerated}
              onRefreshStats={loadInitialData}
            />
          )}

          {currentTab === 'editor' && (
            <PaperEditorView
              paperId={activePaperId}
              onRefreshStats={loadInitialData}
              onNavigateToPapers={() => setCurrentTab('generated_papers')}
            />
          )}

          {currentTab === 'generated_papers' && (
            <GeneratedPapersView
              papers={papers}
              onOpenEditor={(pid) => handleNavigate('editor', pid)}
              onNavigateToWizard={() => setCurrentTab('generate')}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView onRefreshStats={loadInitialData} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

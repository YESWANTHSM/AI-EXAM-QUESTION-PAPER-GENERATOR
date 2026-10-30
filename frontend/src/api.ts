import type {
  DashboardStats, Subject, UploadedDoc, Question,
  GeneratedPaper, Template, SystemSettings
} from './types';

// Support custom backend URL in production (e.g. Render / Railway) or local proxy fallback (/api)
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export const api = {
  // Stats
  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const res = await fetch(`${API_BASE}/subjects`);
    if (!res.ok) throw new Error('Failed to fetch subjects');
    return res.json();
  },

  async createSubject(data: Partial<Subject>): Promise<Subject> {
    const res = await fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create subject');
    return res.json();
  },

  async updateSubject(id: number, data: Partial<Subject>): Promise<any> {
    const res = await fetch(`${API_BASE}/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update subject');
    return res.json();
  },

  async deleteSubject(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/subjects/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete subject');
    return res.json();
  },

  async resetAllData(): Promise<any> {
    const res = await fetch(`${API_BASE}/subjects/reset-all`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset all data');
    return res.json();
  },

  // Documents
  async getDocuments(subjectId?: number): Promise<UploadedDoc[]> {
    const url = subjectId ? `${API_BASE}/documents?subject_id=${subjectId}` : `${API_BASE}/documents`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadDocument(formData: FormData): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async parseTextQuestions(subjectId: number, text: string): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/parse-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: subjectId, text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to parse text');
    }
    return res.json();
  },

  async getDocumentQuestions(docId: number): Promise<Question[]> {
    const res = await fetch(`${API_BASE}/documents/${docId}/extracted-questions`);
    if (!res.ok) throw new Error('Failed to fetch extracted questions');
    return res.json();
  },

  async deleteDocument(docId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  // Questions
  async getQuestions(filters: Record<string, any> = {}): Promise<Question[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    });
    const res = await fetch(`${API_BASE}/questions?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch questions');
    return res.json();
  },

  async addQuestion(question: Partial<Question>): Promise<any> {
    const res = await fetch(`${API_BASE}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question),
    });
    if (!res.ok) throw new Error('Failed to add question');
    return res.json();
  },

  async updateQuestion(id: number, data: Partial<Question>): Promise<any> {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update question');
    return res.json();
  },

  async deleteQuestion(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete question');
    return res.json();
  },

  // Templates
  async getTemplates(subjectId?: number): Promise<Template[]> {
    const url = subjectId ? `${API_BASE}/templates?subject_id=${subjectId}` : `${API_BASE}/templates`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  },

  // Paper Generation
  async generatePaper(payload: any): Promise<{ success: boolean; paper_id: number; message: string }> {
    const res = await fetch(`${API_BASE}/papers/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Paper generation failed');
    }
    return res.json();
  },

  // Papers & Interactive Editor
  async getPapers(): Promise<GeneratedPaper[]> {
    const res = await fetch(`${API_BASE}/papers`);
    if (!res.ok) throw new Error('Failed to fetch papers');
    return res.json();
  },

  async getPaper(id: number): Promise<GeneratedPaper> {
    const res = await fetch(`${API_BASE}/papers/${id}`);
    if (!res.ok) throw new Error('Failed to fetch paper details');
    return res.json();
  },

  async updatePaper(id: number, payload: Partial<GeneratedPaper>): Promise<any> {
    const res = await fetch(`${API_BASE}/papers/${id}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update paper');
    return res.json();
  },

  async updatePaperQuestion(paperId: number, pqId: number, data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/papers/${paperId}/questions/${pqId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update paper question');
    return res.json();
  },

  async deletePaperQuestion(paperId: number, pqId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/papers/${paperId}/questions/${pqId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete question from paper');
    return res.json();
  },

  async addQuestionToSection(paperId: number, sectionId: number, payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/papers/${paperId}/sections/${sectionId}/add-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to add question to section');
    return res.json();
  },

  async getAlternatives(paperId: number, pqId: number): Promise<Question[]> {
    const res = await fetch(`${API_BASE}/papers/${paperId}/questions/${pqId}/alternatives`);
    if (!res.ok) throw new Error('Failed to fetch question alternatives');
    return res.json();
  },

  async replacePaperQuestion(paperId: number, pqId: number, replacementQuestionId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/papers/${paperId}/questions/${pqId}/replace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replacement_question_id: replacementQuestionId }),
    });
    if (!res.ok) throw new Error('Failed to replace question');
    return res.json();
  },

  async regeneratePaperQuestion(paperId: number, pqId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/papers/${paperId}/questions/${pqId}/regenerate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to regenerate question');
    return res.json();
  },

  // Export URLs
  getPdfExportUrl(paperId: number): string {
    return `${API_BASE}/papers/${paperId}/export/pdf`;
  },

  getDocxExportUrl(paperId: number): string {
    return `${API_BASE}/papers/${paperId}/export/docx`;
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async saveSettings(payload: Partial<SystemSettings>): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  },
};

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  FileSpreadsheet,
  Download,
  Sparkles,
  X,
  FileCheck,
  Plus
} from 'lucide-react';
import { Subject, UploadedDoc, Question } from '../types';
import { api } from '../api';
import { SubjectModal } from '../components/SubjectModal';

interface UploadDocumentsViewProps {
  subjects: Subject[];
  documents: UploadedDoc[];
  onRefresh: () => void;
  onNavigate: (tab: any) => void;
}

export const UploadDocumentsView: React.FC<UploadDocumentsViewProps> = ({
  subjects,
  documents,
  onRefresh,
  onNavigate
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(subjects[0]?.id || 0);
  const [docCategory, setDocCategory] = useState<string>('question_bank');
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<UploadedDoc | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setErrorMessage(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Processing (${i + 1}/${files.length}): ${file.name}`);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject_id', String(selectedSubjectId || subjects[0]?.id || 1));
        formData.append('doc_category', docCategory);

        await api.uploadDocument(formData);
      } catch (err: any) {
        setErrorMessage(`Failed to process ${file.name}: ${err.message}`);
      }
    }
    setIsUploading(false);
    setUploadProgress(null);
    onRefresh();
  };

  const handleDeleteDoc = async (id: number) => {
    if (window.confirm('Delete this document and all extracted questions from bank?')) {
      try {
        await api.deleteDocument(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handlePreviewDoc = async (doc: UploadedDoc) => {
    setPreviewDoc(doc);
    setIsLoadingPreview(true);
    try {
      const qs = await api.getDocumentQuestions(doc.id);
      setPreviewQuestions(qs);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Configuration Controls */}
      <div className="ledger-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-serif font-bold text-[#1C1F24] mb-1">
              Select Subject for Ingestion
            </label>
            <div className="flex items-center gap-2">
              {subjects.length === 0 ? (
                <div className="px-3.5 py-2 bg-[#FAF0F0] border-2 border-rose-600 rounded text-xs font-bold text-rose-800 flex items-center gap-1.5 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" /> No subjects created
                </div>
              ) : (
                <select
                  value={selectedSubjectId || subjects[0]?.id || ''}
                  onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                  className="px-3.5 py-2 bg-white border-2 border-[#2D3128] rounded text-xs font-semibold text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(true)}
                className="btn-secondary px-3 py-2 text-xs whitespace-nowrap"
                title="Add New Subject"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-[#C2571B]" /> New Subject
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-serif font-bold text-[#1C1F24] mb-1">
              Document Category
            </label>
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              className="px-3.5 py-2 bg-white border-2 border-[#2D3128] rounded text-xs font-semibold text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
            >
              <option value="question_bank">Question Bank (.xlsx, .docx, .pdf, .txt)</option>
              <option value="sample_paper">Sample Question Paper Format</option>
              <option value="previous_paper">Previous Year Examination Paper</option>
              <option value="syllabus">Subject Syllabus Curriculum</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-[#5B6354] flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 text-[#C2571B]" />
          <span>Fuzzy Bloom’s taxonomy & CO auto-tagging enabled</span>
        </div>
      </div>

      {/* Drag & Drop Upload Zone - Jayam Automobiles Tactile Ledger Styling */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-10 rounded-md border-2 border-dashed transition-all cursor-pointer text-center relative shadow-[3px_3px_0_#2D3128] ${
          isDragging
            ? 'border-[#C2571B] bg-[#FDF5EF]'
            : 'border-[#2D3128] hover:border-[#C2571B] bg-white hover:bg-[#FDFBF7]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-md bg-[#FDF5EF] border-2 border-[#C2571B] text-[#C2571B] shadow-[2px_2px_0_#C2571B] flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold font-serif text-[#1C1F24] mb-1">
          Drag & Drop Document Files Here
        </h3>
        <p className="text-xs text-[#5B6354] max-w-md mx-auto mb-4 font-mono">
          Supports <span className="font-bold text-[#1C1F24]">PDF, Microsoft Word (.docx), Excel spreadsheets (.xlsx, .xls), and Text (.txt)</span>. Multiple files permitted.
        </p>

        <button
          type="button"
          className="btn-rust px-5 py-2.5 text-xs font-bold"
        >
          Select Files from Device
        </button>

        {isUploading && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded bg-[#EFF7F1] text-[#2A6E3B] border-2 border-[#2A6E3B] text-xs font-mono font-bold">
            <Sparkles className="w-4 h-4 animate-spin text-[#2A6E3B]" />
            {uploadProgress || 'Extracting questions and inferring topics...'}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded bg-[#FAF0F0] text-rose-800 border-2 border-rose-600 text-xs font-bold font-mono">
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </div>
        )}
      </div>

      {/* Downloadable Reference Samples */}
      <div className="bg-[#1C1F24] text-[#EFE8DC] p-6 rounded-md border-2 border-[#2D3128] shadow-[4px_4px_0_#2D3128]">
        <div className="flex items-center justify-between mb-4 border-b-2 border-[#2D3128] pb-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#C2571B]" />
            <h4 className="text-sm font-bold font-serif text-white">Download Sample Templates & Reference Question Banks</h4>
          </div>
          <span className="text-xs font-mono text-[#8C9683]">Ready for instant ingestion</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-md bg-[#282D34] border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-[#2A6E3B]" />
              <div>
                <div className="text-xs font-bold font-serif text-white">CS3452 Question Bank</div>
                <div className="text-[11px] text-[#8C9683] font-mono">Excel (.xlsx) with Bloom's & Rubrics</div>
              </div>
            </div>
            <a
              href="/sample_files/CS3452_Theory_Of_Computation_Bank.xlsx"
              download
              className="p-1.5 rounded bg-white hover:bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24]"
              title="Download sample Excel"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>

          <div className="p-3.5 rounded-md bg-[#282D34] border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#C2571B]" />
              <div>
                <div className="text-xs font-bold font-serif text-white">23ALT501 NLP Question Bank</div>
                <div className="text-[11px] text-[#8C9683] font-mono">Word (.docx) V.S.B. Bank</div>
              </div>
            </div>
            <a
              href="/sample_files/23ALT501_NLP_Question_Bank.docx"
              download
              className="p-1.5 rounded bg-white hover:bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24]"
              title="Download sample DOCX"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>

          <div className="p-3.5 rounded-md bg-[#282D34] border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-[#2A6E3B]" />
              <div>
                <div className="text-xs font-bold font-serif text-white">23ALT501 Plain Text Bank</div>
                <div className="text-[11px] text-[#8C9683] font-mono">Structured Text (Part A, B, C)</div>
              </div>
            </div>
            <a
              href="/sample_files/23ALT501_NLP_Question_Bank.txt"
              download
              className="p-1.5 rounded bg-white hover:bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24]"
              title="Download sample TXT"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Uploaded Documents Table */}
      <div className="ledger-card overflow-hidden">
        <div className="p-4 bg-[#EFE8DC] border-b-2 border-[#2D3128] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C2571B]" />
            <h3 className="text-sm font-bold font-serif text-[#1C1F24]">Uploaded Documents & Processing Logs</h3>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-white border border-[#2D3128] rounded text-[#1C1F24]">
            {documents.length} Files Ingested
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-[#8C9683] font-mono text-sm">
            No uploaded documents found. Upload your first question bank above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-serif">
              <thead className="bg-[#F7F3EC] border-b-2 border-[#2D3128] text-[#1C1F24] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Extracted Qs</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#2D3128]/15 text-[#1C1F24]">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#1C1F24] flex items-center gap-2">
                      <span className="uppercase text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24]">
                        {doc.file_type}
                      </span>
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-[#5B6354]">
                      {doc.doc_category.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#84340A]">
                      {doc.subject_code || `SUB-${doc.subject_id}`}
                    </td>
                    <td className="py-3 px-4 text-[#5B6354] font-mono">
                      {Math.round(doc.file_size / 1024)} KB
                    </td>
                    <td className="py-3 px-4">
                      {doc.status === 'processed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#2A6E3B] px-2.5 py-0.5 rounded bg-[#EFF7F1] border border-[#2A6E3B]">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-rose-800 px-2.5 py-0.5 rounded bg-[#FAF0F0] border border-rose-600">
                          <AlertCircle className="w-3 h-3" /> Error
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-[#C2571B]">
                      {doc.extracted_count}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handlePreviewDoc(doc)}
                        className="px-2.5 py-1 rounded bg-[#F7F3EC] hover:bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24] font-bold text-xs inline-flex items-center gap-1 transition-colors shadow-[1px_1px_0_#2D3128]"
                        title="Preview Extracted Questions"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C2571B]" /> Preview
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1 rounded bg-white hover:bg-rose-50 border border-rose-600 text-rose-700 transition-colors shadow-[1px_1px_0_#2D3128]"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Extracted Questions Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-[#1C1F24]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-md shadow-[6px_6px_0_#1C1F24] flex flex-col overflow-hidden border-2 border-[#2D3128]">
            <div className="p-5 border-b-2 border-[#2D3128] flex items-center justify-between bg-[#EFE8DC]">
              <div>
                <h3 className="text-base font-bold font-serif text-[#1C1F24]">
                  Extracted Questions: {previewDoc.filename}
                </h3>
                <p className="text-xs text-[#5B6354] font-mono">
                  {previewQuestions.length} Questions extracted from document and stored in central question bank
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded bg-white border border-[#2D3128] text-[#1C1F24] hover:bg-[#EFE8DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-[#F7F3EC]">
              {isLoadingPreview ? (
                <div className="py-12 text-center text-[#8C9683] font-mono text-sm">Loading extracted questions...</div>
              ) : previewQuestions.length === 0 ? (
                <div className="py-12 text-center text-[#8C9683] font-mono text-sm">
                  No questions were detected in this document. Please verify formatting.
                </div>
              ) : (
                previewQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-md border-2 border-[#2D3128] bg-white shadow-[2px_2px_0_#2D3128] space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#84340A] px-2 py-0.5 rounded bg-[#FDF5EF] border border-[#C2571B] font-mono">
                          Unit {q.unit}
                        </span>
                        <span className="font-bold font-serif text-[#1C1F24]">{q.topic}</span>
                        <span className="text-[#8C9683]">•</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24] text-[11px] font-mono">
                          {q.question_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-[#2A6E3B] bg-[#EFF7F1] border border-[#2A6E3B] px-2 py-0.5 rounded font-bold">
                          {q.marks} Marks
                        </span>
                        <span className="text-[#2D3128] bg-[#EFE8DC] border border-[#2D3128] px-2 py-0.5 rounded font-bold">
                          {q.blooms_level}
                        </span>
                        <span className="text-[#84340A] bg-[#FDF5EF] border border-[#C2571B] px-2 py-0.5 rounded font-bold">
                          {q.course_outcome}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-[#1C1F24] font-medium font-serif leading-relaxed">
                      {q.question_text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t-2 border-[#2D3128] bg-[#EFE8DC] flex items-center justify-between">
              <button
                onClick={() => {
                  setPreviewDoc(null);
                  onNavigate('question_bank');
                }}
                className="btn-rust px-4 py-2 text-xs font-bold"
              >
                Open Question Bank
              </button>
              <button
                onClick={() => setPreviewDoc(null)}
                className="btn-secondary px-4 py-2 text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Subject Addition Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSubjectSaved={(saved) => {
          setSelectedSubjectId(saved.id);
          onRefresh();
        }}
      />
    </div>
  );
};

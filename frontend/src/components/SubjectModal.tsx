import React, { useState, useEffect } from 'react';
import { X, BookOpen, Save } from 'lucide-react';
import { Subject } from '../types';
import { api } from '../api';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubjectSaved: (subject: Subject) => void;
  initialSubject?: Partial<Subject> | null;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSubjectSaved,
  initialSubject
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [department, setDepartment] = useState('Artificial Intelligence & Data Science');
  const [semester, setSemester] = useState(5);
  const [regulation, setRegulation] = useState('Anna University Autonomous 2023');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubject) {
      setName(initialSubject.name || '');
      setCode(initialSubject.code || '');
      setDepartment(initialSubject.department || 'Artificial Intelligence & Data Science');
      setSemester(initialSubject.semester || 5);
      setRegulation(initialSubject.regulation || 'Anna University Autonomous 2023');
      setDescription(initialSubject.description || '');
    } else {
      setName('');
      setCode('');
      setDepartment('Artificial Intelligence & Data Science');
      setSemester(5);
      setRegulation('Anna University Autonomous 2023');
      setDescription('');
    }
    setError(null);
  }, [initialSubject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Subject Name and Subject Code are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (initialSubject && initialSubject.id) {
        await api.updateSubject(initialSubject.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          department: department.trim(),
          semester: Number(semester),
          regulation: regulation.trim(),
          description: description.trim()
        });
        onSubjectSaved({
          id: initialSubject.id,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          department: department.trim(),
          semester: Number(semester),
          regulation: regulation.trim(),
          description: description.trim(),
          question_count: initialSubject.question_count || 0
        });
      } else {
        const created = await api.createSubject({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          department: department.trim(),
          semester: Number(semester),
          regulation: regulation.trim(),
          description: description.trim()
        });
        onSubjectSaved(created);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1C1F24]/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-md shadow-[6px_6px_0_#1C1F24] overflow-hidden border-2 border-[#2D3128]">
        <div className="p-5 border-b-2 border-[#2D3128] flex items-center justify-between bg-[#EFE8DC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#FDF5EF] border-2 border-[#C2571B] text-[#C2571B] shadow-[1px_1px_0_#C2571B] flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-[#1C1F24]">
                {initialSubject?.id ? 'Edit Subject Details' : 'Add New Subject'}
              </h3>
              <p className="text-xs text-[#5B6354] font-medium">
                Enter your course particulars to associate question banks and examination papers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-white border border-[#2D3128] text-[#1C1F24] hover:bg-[#EFE8DC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-[#F7F3EC]">
          {error && (
            <div className="p-3 rounded bg-[#FAF0F0] border-2 border-rose-600 text-rose-800 text-xs font-bold font-mono">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NATURAL LANGUAGE PROCESSING"
              className="w-full px-3.5 py-2.5 bg-white border-2 border-[#2D3128] rounded text-xs font-serif font-bold text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
                Subject Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 23ALT501"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-[#2D3128] rounded text-xs font-mono font-bold text-[#84340A] uppercase focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded text-xs font-bold text-[#1C1F24]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full px-3.5 py-2 bg-white border-2 border-[#2D3128] rounded text-xs font-medium text-[#1C1F24]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
                Regulation
              </label>
              <input
                type="text"
                value={regulation}
                onChange={(e) => setRegulation(e.target.value)}
                placeholder="e.g. Autonomous 2023"
                className="w-full px-3.5 py-2 bg-white border-2 border-[#2D3128] rounded text-xs font-medium text-[#1C1F24]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
              Course Description / Syllabus Overview (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief course objectives, unit distribution, or special guidelines..."
              className="w-full px-3.5 py-2 bg-white border-2 border-[#2D3128] rounded text-xs font-medium text-[#1C1F24] focus:outline-none focus:border-[#C2571B]"
            ></textarea>
          </div>

          <div className="pt-3 border-t-2 border-[#2D3128] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-rust px-5 py-2 text-xs font-bold"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {isSubmitting ? 'Saving...' : initialSubject?.id ? 'Update Subject' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

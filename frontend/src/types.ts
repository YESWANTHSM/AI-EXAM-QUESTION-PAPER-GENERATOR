export interface Subject {
  id: number;
  name: string;
  code: string;
  department: string;
  semester: number;
  regulation: string;
  description?: string;
  question_count?: number;
}

export interface UploadedDoc {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  doc_category: string;
  subject_id: number;
  subject_code?: string;
  subject_name?: string;
  status: 'processing' | 'processed' | 'failed';
  extracted_count: number;
  error_message?: string;
  created_at: string;
}

export interface Question {
  id: number;
  subject_id: number;
  subject_code?: string;
  subject_name?: string;
  unit: number;
  topic: string;
  question_text: string;
  marks: number;
  question_type: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  blooms_level: string;
  course_outcome: string;
  source_doc_id?: number;
  is_ai_generated?: boolean;
  sample_answer?: string;
  rubric_json?: string;
}

export interface PaperQuestion {
  id: number;
  section_id: number;
  question_id?: number;
  question_number: number;
  sub_part?: string | null;
  is_or_choice: boolean;
  or_group_id?: string | null;
  choice_side?: 'A' | 'B' | null;
  question_text: string;
  marks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  blooms_level: string;
  course_outcome: string;
  unit: number;
  topic: string;
  question_order: number;
  sample_answer?: string;
  rubric_text?: string;
}

export interface PaperSection {
  id: number;
  section_name: string;
  section_title: string;
  instructions: string;
  total_questions_to_answer: number;
  total_questions: number;
  marks_per_question: number;
  section_order: number;
  questions: PaperQuestion[];
}

export interface GeneratedPaper {
  id: number;
  title: string;
  subject_id: number;
  subject_name?: string;
  subject_code?: string;
  exam_code: string;
  exam_title?: string;
  regulations?: string;
  academic_year: string;
  semester: string;
  date_str: string;
  duration_minutes: number;
  total_marks: number;
  institution_name: string;
  department_name: string;
  instructions: string;
  status: 'draft' | 'finalized';
  generation_mode: 'bank' | 'ai';
  created_at: string;
  updated_at: string;
  sections?: PaperSection[];
}

export interface DashboardStats {
  total_documents: number;
  total_questions: number;
  total_papers: number;
  recent_papers: Array<{
    id: number;
    title: string;
    subject_code: string;
    subject_name: string;
    total_marks: number;
    date_str: string;
    status: string;
    updated_at: string;
  }>;
  recent_uploads: Array<{
    id: number;
    filename: string;
    file_type: string;
    file_size: number;
    extracted_count: number;
    status: string;
    created_at: string;
  }>;
  subject_stats: Array<{
    id: number;
    name: string;
    code: string;
    question_count: number;
  }>;
  difficulty_dist: Record<string, number>;
  blooms_dist: Record<string, number>;
}

export interface Template {
  id: number;
  name: string;
  subject_id?: number;
  total_marks: number;
  duration_minutes: number;
  institution_name: string;
  department_name: string;
  exam_title: string;
  instructions: string;
  sections_config: Array<{
    section_name: string;
    section_title: string;
    instructions: string;
    total_questions_to_answer: number;
    total_questions: number;
    marks_per_question: number;
    has_either_or: boolean;
  }>;
}

export interface SystemSettings {
  institution_name: string;
  department_name: string;
  demo_mode: boolean;
  ai_provider: string;
  has_gemini_api_key: boolean;
  has_openai_api_key: boolean;
}

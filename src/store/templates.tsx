import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// --- Types ---

export type TemplateCategory =
  | 'general'
  | 'coding'
  | 'writing'
  | 'analysis'
  | 'custom';

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: TemplateCategory;
  createdAt: number;
  updatedAt: number;
}

// --- Constants ---

const STORAGE_KEY = 'llama-ui-templates';

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'tmpl-code-review-0',
    name: 'Code Review',
    content:
      'Please review the following code for potential bugs, performance issues, code style improvements, and best practices. Provide specific suggestions with explanations.\n\n```\n{{CODE_HERE}}\n```',
    category: 'coding',
    createdAt: Date.now() - 60000 * 5,
    updatedAt: Date.now() - 60000 * 5,
  },
  {
    id: 'tmpl-translate-1',
    name: 'Translate Text',
    content:
      'Translate the following text into {{TARGET_LANGUAGE}}. Preserve the original tone, formatting, and meaning as accurately as possible:\n\n{{TEXT_HERE}}',
    category: 'general',
    createdAt: Date.now() - 60000 * 4,
    updatedAt: Date.now() - 60000 * 4,
  },
  {
    id: 'tmpl-summarize-2',
    name: 'Summarize Text',
    content:
      'Please provide a clear and concise summary of the following text. Highlight the key points and main arguments:\n\n{{TEXT_HERE}}',
    category: 'analysis',
    createdAt: Date.now() - 60000 * 3,
    updatedAt: Date.now() - 60000 * 3,
  },
  {
    id: 'tmpl-explain-3',
    name: 'Explain Concept',
    content:
      'Please explain the following concept in a simple and easy-to-understand way. Use analogies and examples where appropriate:\n\n{{CONCEPT_HERE}}',
    category: 'general',
    createdAt: Date.now() - 60000 * 2,
    updatedAt: Date.now() - 60000 * 2,
  },
  {
    id: 'tmpl-creative-4',
    name: 'Creative Writing',
    content:
      'Write a creative piece based on the following prompt. Be imaginative, use vivid descriptions, and maintain a consistent style:\n\n{{PROMPT_HERE}}',
    category: 'writing',
    createdAt: Date.now() - 60000 * 1,
    updatedAt: Date.now() - 60000 * 1,
  },
  {
    id: 'tmpl-debug-5',
    name: 'Debug Code',
    content:
      'I have the following code that has a bug. Please identify the issue, explain why it occurs, and provide a corrected version:\n\n```\n{{CODE_HERE}}\n```\n\nError message (if any): {{ERROR_HERE}}',
    category: 'coding',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// --- Context Types ---

interface TemplateContextValue {
  templates: PromptTemplate[];
  addTemplate: (
    template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateTemplate: (
    id: string,
    updates: Partial<Omit<PromptTemplate, 'id' | 'createdAt'>>
  ) => void;
  deleteTemplate: (id: string) => void;
  getTemplatesByCategory: (category: TemplateCategory) => PromptTemplate[];
}

// --- Context ---

const TemplateContext = createContext<TemplateContextValue | null>(null);

// --- Provider ---

export const TemplateContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);

  // Load templates from localStorage on mount; seed defaults if empty
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTemplates(parsed as PromptTemplate[]);
          return;
        }
      } catch {
        // corrupt data – fall through to defaults
      }
    }
    // First run: write defaults
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    setTemplates(DEFAULT_TEMPLATES);
  }, []);

  // Persist to localStorage on every change
  const persist = useCallback((next: PromptTemplate[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addTemplate = useCallback(
    (
      template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const now = Date.now();
      const newTemplate: PromptTemplate = {
        ...template,
        id: `tmpl-${now}`,
        createdAt: now,
        updatedAt: now,
      };
      setTemplates((prev) => {
        const next = [...prev, newTemplate];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const updateTemplate = useCallback(
    (
      id: string,
      updates: Partial<Omit<PromptTemplate, 'id' | 'createdAt'>>
    ) => {
      setTemplates((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? { ...t, ...updates, updatedAt: Date.now() }
            : t
        );
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      setTemplates((prev) => {
        const next = prev.filter((t) => t.id !== id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const getTemplatesByCategory = useCallback(
    (category: TemplateCategory): PromptTemplate[] => {
      return templates.filter((t) => t.category === category);
    },
    [templates]
  );

  const value = useMemo<TemplateContextValue>(
    () => ({
      templates,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      getTemplatesByCategory,
    }),
    [templates, addTemplate, updateTemplate, deleteTemplate, getTemplatesByCategory]
  );

  return (
    <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>
  );
};

// --- Hook ---

export const useTemplateContext = (): TemplateContextValue => {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error(
      'useTemplateContext must be used within a TemplateContextProvider'
    );
  }
  return context;
};

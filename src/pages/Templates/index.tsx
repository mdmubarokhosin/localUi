import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LuPlus,
  LuTrash2,
  LuSquarePen,
  LuCopy,
  LuSearch,
} from 'react-icons/lu';
import {
  useTemplateContext,
  type PromptTemplate,
  type TemplateCategory,
} from '../../store/templates';

// --- Exported Props ---

export interface TemplateInsertProps {
  onInsert?: (content: string) => void;
}

// --- Constants ---

const ALL_CATEGORIES: readonly string[] = [
  'all',
  'general',
  'coding',
  'writing',
  'analysis',
  'custom',
];

// We extend the union with 'all' for the UI filter only
// type CategoryFilter = TemplateCategory | 'all';

const CATEGORY_BADGE_CLASSES: Record<TemplateCategory, string> = {
  general: 'badge-info',
  coding: 'badge-success',
  writing: 'badge-warning',
  analysis: 'badge-primary',
  custom: 'badge-secondary',
};

// --- Helpers ---

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

// --- Sub-components ---

interface NewTemplateFormProps {
  onSave: (template: {
    name: string;
    content: string;
    category: TemplateCategory;
  }) => void;
  onCancel: () => void;
}

const NewTemplateForm: React.FC<NewTemplateFormProps> = ({
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<TemplateCategory>('general');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      const trimmedContent = content.trim();
      if (!trimmedName || !trimmedContent) return;
      onSave({ name: trimmedName, content: trimmedContent, category });
    },
    [name, content, category, onSave]
  );

  return (
    <div className="card bg-base-200 shadow-sm border border-primary/30">
      <div className="card-body">
        <h3 className="card-title text-base">
          {t('templates.newTemplate', 'New Template')}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            placeholder={t('templates.namePlaceholder', 'Template name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select
            className="select select-bordered select-sm w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory)}
          >
            <option value="general">{t('templates.categories.general', 'General')}</option>
            <option value="coding">{t('templates.categories.coding', 'Coding')}</option>
            <option value="writing">{t('templates.categories.writing', 'Writing')}</option>
            <option value="analysis">{t('templates.categories.analysis', 'Analysis')}</option>
            <option value="custom">{t('templates.categories.custom', 'Custom')}</option>
          </select>
          <textarea
            className="textarea textarea-bordered w-full h-28 text-sm"
            placeholder={t('templates.contentPlaceholder', 'Prompt text...')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onCancel}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {t('common.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditTemplateFormProps {
  template: PromptTemplate;
  onSave: (id: string, updates: { name?: string; content?: string; category?: TemplateCategory }) => void;
  onCancel: () => void;
}

const EditTemplateForm: React.FC<EditTemplateFormProps> = ({
  template,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState<string>(template.name);
  const [content, setContent] = useState<string>(template.content);
  const [category, setCategory] = useState<TemplateCategory>(template.category);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      const trimmedContent = content.trim();
      if (!trimmedName || !trimmedContent) return;
      onSave(template.id, {
        name: trimmedName,
        content: trimmedContent,
        category,
      });
    },
    [name, content, category, template.id, onSave]
  );

  return (
    <div className="card bg-base-200 shadow-sm border border-warning/30">
      <div className="card-body">
        <h3 className="card-title text-base">
          {t('templates.editTemplate', 'Edit Template')}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            placeholder={t('templates.namePlaceholder', 'Template name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select
            className="select select-bordered select-sm w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory)}
          >
            <option value="general">{t('templates.categories.general', 'General')}</option>
            <option value="coding">{t('templates.categories.coding', 'Coding')}</option>
            <option value="writing">{t('templates.categories.writing', 'Writing')}</option>
            <option value="analysis">{t('templates.categories.analysis', 'Analysis')}</option>
            <option value="custom">{t('templates.categories.custom', 'Custom')}</option>
          </select>
          <textarea
            className="textarea textarea-bordered w-full h-28 text-sm"
            placeholder={t('templates.contentPlaceholder', 'Prompt text...')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onCancel}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-warning btn-sm">
              {t('common.update', 'Update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main Page ---

export const TemplatesPage: React.FC<TemplateInsertProps> = ({ onInsert }) => {
  const { t } = useTranslation();
  const { templates, addTemplate, updateTemplate, deleteTemplate } =
    useTemplateContext();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewForm, setShowNewForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    let result: PromptTemplate[] = templates;

    if (activeCategory !== 'all') {
      result = result.filter((t) => t.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.content.toLowerCase().includes(query)
      );
    }

    // Sort newest first
    return result.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [templates, activeCategory, searchQuery]);

  // Handlers
  const handleCreate = useCallback(
    (data: {
      name: string;
      content: string;
      category: TemplateCategory;
    }) => {
      addTemplate(data);
      setShowNewForm(false);
    },
    [addTemplate]
  );

  const handleUpdate = useCallback(
    (
      id: string,
      updates: { name?: string; content?: string; category?: TemplateCategory }
    ) => {
      updateTemplate(id, updates);
      setEditingId(null);
    },
    [updateTemplate]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteTemplate(id);
      if (editingId === id) setEditingId(null);
    },
    [deleteTemplate, editingId]
  );

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // clipboard API may not be available
      console.warn('Failed to copy to clipboard');
    }
  }, []);

  const handleInsert = useCallback(
    (content: string) => {
      onInsert?.(content);
    },
    [onInsert]
  );

  const editingTemplate = useMemo(
    () => (editingId ? templates.find((t) => t.id === editingId) ?? null : null),
    [editingId, templates]
  );

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-5xl mx-auto w-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {t('templates.title', 'Prompt Templates')}
        </h1>
        <button
          className="btn btn-primary btn-sm gap-1 self-start"
          onClick={() => {
            setShowNewForm((prev) => !prev);
            setEditingId(null);
          }}
        >
          <LuPlus className="text-base" />
          {t('templates.create', 'New Template')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="join w-full max-w-md">
        <span className="join-item btn btn-sm no-animation">
          <LuSearch />
        </span>
        <input
          type="text"
          className="input input-bordered input-sm join-item w-full"
          placeholder={t('templates.searchPlaceholder', 'Search templates...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist">
        {ALL_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          const label =
            cat === 'all'
              ? t('templates.all', 'All')
              : t(`templates.categories.${cat}`, cat.charAt(0).toUpperCase() + cat.slice(1));
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* New Template Form */}
      {showNewForm && (
        <NewTemplateForm
          onSave={handleCreate}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {/* Edit Template Form */}
      {editingTemplate && (
        <EditTemplateForm
          template={editingTemplate}
          onSave={handleUpdate}
          onCancel={() => setEditingId(null)}
        />
      )}

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-base-content/50">
          <LuSearch className="text-4xl mb-3" />
          <p>{t('templates.noTemplates', 'No templates found.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="card-body p-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="card-title text-base line-clamp-1">
                    {tmpl.name}
                  </h3>
                  <span
                    className={`badge badge-sm ${CATEGORY_BADGE_CLASSES[tmpl.category]} shrink-0`}
                  >
                    {t(
                      `templates.categories.${tmpl.category}`,
                      tmpl.category.charAt(0).toUpperCase() + tmpl.category.slice(1)
                    )}
                  </span>
                </div>

                {/* Content Preview */}
                <p className="text-sm text-base-content/70 line-clamp-3 whitespace-pre-line">
                  {truncateText(tmpl.content, 200)}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-base-content/40">
                    {new Date(tmpl.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onInsert && (
                      <button
                        className="btn btn-ghost btn-xs"
                        title={t('templates.insert', 'Insert into chat')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsert(tmpl.content);
                        }}
                      >
                        <LuPlus className="text-base" />
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-xs"
                      title={t('templates.copy', 'Copy to clipboard')}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(tmpl.content);
                      }}
                    >
                      <LuCopy className="text-base" />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      title={t('templates.edit', 'Edit')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNewForm(false);
                        setEditingId(tmpl.id);
                      }}
                    >
                      <LuSquarePen className="text-base" />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      title={t('templates.delete', 'Delete')}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tmpl.id);
                      }}
                    >
                      <LuTrash2 className="text-base" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

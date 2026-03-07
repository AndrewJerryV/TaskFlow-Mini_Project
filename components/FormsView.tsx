'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Form, FormField, FormFieldType, FormResponse, User } from '@/types';
import { Plus, FileText, Trash2, Edit3, BarChart3, ClipboardList, ChevronLeft, Send, CheckCircle2, Copy, X, Calendar, Users, AlertCircle, Inbox } from 'lucide-react';

interface FormsViewProps { projectId: string; }

type ViewMode = 'list' | 'builder' | 'fill' | 'results';


const FIELD_TYPES: Record<FormFieldType, string> = {
    text: 'Short answer', comment: 'Paragraph', radiogroup: 'Multiple choice',
    checkbox: 'Checkboxes', dropdown: 'Dropdown', rating: 'Linear scale', date: 'Date',
};

export default function FormsView({ projectId }: FormsViewProps) {
    const { currentUser } = useAuth();
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [activeForm, setActiveForm] = useState<Form | null>(null);
    const [toast, setToast] = useState('');

    // Builder state
    const [builderTitle, setBuilderTitle] = useState('');
    const [builderDesc, setBuilderDesc] = useState('');
    const [builderFields, setBuilderFields] = useState<FormField[]>([]);
    const [builderStatus, setBuilderStatus] = useState<'draft' | 'active' | 'closed'>('draft');
    const [editingFormId, setEditingFormId] = useState<string | null>(null);
    const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);

    // Fill state
    const [fillAnswers, setFillAnswers] = useState<Record<string, any>>({});
    const [fillErrors, setFillErrors] = useState<Set<string>>(new Set());
    const [submitted, setSubmitted] = useState(false);

    // Results state
    const [responses, setResponses] = useState<FormResponse[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [resTab, setResTab] = useState<'summary' | 'individual'>('summary');

    // User's own responses
    const [userResponses, setUserResponses] = useState<Record<string, FormResponse>>({});

    // Total response counts per form
    const [formResponseCounts, setFormResponseCounts] = useState<Record<string, number>>({});

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 2800);
    }, []);

    const fetchForms = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/forms?projectId=${projectId}`);
            if (res.ok) {
                const fetchedForms: Form[] = await res.json();
                setForms(fetchedForms);

                // Fetch all responses for these forms to calculate counts
                if (fetchedForms.length > 0) {
                    const counts: Record<string, number> = {};
                    await Promise.all(fetchedForms.map(async f => {
                        try {
                            const r = await fetch(`/api/forms/responses?formId=${f.id}`);
                            if (r.ok) {
                                const allResp: FormResponse[] = await r.json();
                                // Count unique respondents
                                const uniqueRespondents = new Set(allResp.map(br => br.respondentId));
                                counts[f.id] = uniqueRespondents.size;
                            }
                        } catch (e) {
                            console.error(`Error fetching count for form ${f.id}`, e);
                        }
                    }));
                    setFormResponseCounts(counts);
                }
            }

            if (currentUser?.id) {
                const userRes = await fetch(`/api/forms/responses?projectId=${projectId}&respondentId=${currentUser.id}`);
                if (userRes.ok) {
                    const responsesData: FormResponse[] = await userRes.json();
                    const responseMap = responsesData.reduce((acc, r) => ({ ...acc, [r.formId]: r }), {});
                    setUserResponses(responseMap);
                }
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [projectId, currentUser?.id]);

    useEffect(() => { fetchForms(); }, [fetchForms]);

    const isCreator = (form: Form) => form.createdBy === currentUser?.id;
    const isCompleted = (formId: string) => !!userResponses[formId];

    // ─── BUILDER HELPERS ───
    const openBuilder = (form?: Form) => {
        if (form) {
            setEditingFormId(form.id);
            setBuilderTitle(form.title);
            setBuilderDesc(form.description || '');
            setBuilderFields(form.fields.length ? form.fields : [makeField()]);
            setBuilderStatus(form.status);
        } else {
            setEditingFormId(null);
            setBuilderTitle('');
            setBuilderDesc('');
            setBuilderFields([makeField()]);
            setBuilderStatus('draft');
        }
        setFocusedFieldId(null);
        setViewMode('builder');
    };

    const makeField = (type: FormFieldType = 'radiogroup'): FormField => ({
        id: `f_${Date.now()}_${Math.floor(Math.random()*10000)}`,
        type, label: '', required: false,
        choices: ['radiogroup', 'checkbox', 'dropdown'].includes(type) ? ['Option 1'] : undefined,
        rateMin: type === 'rating' ? 1 : undefined,
        rateMax: type === 'rating' ? 5 : undefined,
        minLabel: '', maxLabel: '',
    });

    const addField = () => {
        const f = makeField();
        setBuilderFields(prev => [...prev, f]);
        setFocusedFieldId(f.id);
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setBuilderFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeField = (id: string) => {
        setBuilderFields(prev => prev.filter(f => f.id !== id));
    };



    const changeFieldType = (id: string, type: FormFieldType) => {
        setBuilderFields(prev => prev.map(f => {
            if (f.id !== id) return f;
            const updated = { ...f, type };
            if (['radiogroup', 'checkbox', 'dropdown'].includes(type))
                updated.choices = updated.choices && updated.choices.length ? updated.choices : ['Option 1'];
            if (type === 'rating') { updated.rateMin = updated.rateMin ?? 1; updated.rateMax = updated.rateMax ?? 5; }
            return updated;
        }));
    };

    const addChoice = (fieldId: string) => {
        setBuilderFields(prev => prev.map(f => f.id === fieldId ? { ...f, choices: [...(f.choices || []), `Option ${(f.choices?.length || 0) + 1}`] } : f));
    };

    const updateChoice = (fieldId: string, idx: number, val: string) => {
        setBuilderFields(prev => prev.map(f => f.id === fieldId ? { ...f, choices: f.choices?.map((c, i) => i === idx ? val : c) } : f));
    };

    const removeChoice = (fieldId: string, idx: number) => {
        setBuilderFields(prev => prev.map(f => (f.id === fieldId && f.choices && f.choices.length > 1)
            ? { ...f, choices: f.choices.filter((_, i) => i !== idx) }
            : f
        ));
    };

    const saveForm = async (status?: 'draft' | 'active' | 'closed') => {
        if (!builderTitle.trim()) { showToast('Please enter a form title'); return; }
        if (!builderFields.length) { showToast('Add at least one question'); return; }
        const finalStatus = status || builderStatus;
        try {
            if (editingFormId) {
                const res = await fetch('/api/forms', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingFormId, title: builderTitle, description: builderDesc, fields: builderFields, status: finalStatus }),
                });
                if (res.ok) { showToast('Form updated!'); await fetchForms(); setViewMode('list'); }
            } else {
                const res = await fetch('/api/forms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, title: builderTitle, description: builderDesc, fields: builderFields, status: finalStatus, createdBy: currentUser?.id }),
                });
                if (res.ok) { showToast(finalStatus === 'active' ? 'Form published!' : 'Form saved as draft!'); await fetchForms(); setViewMode('list'); }
            }
        } catch (e) { console.error(e); showToast('Failed to save form'); }
    };

    const deleteForm = async (id: string) => {
        if (!confirm('Delete this form and all its responses?')) return;
        try {
            const res = await fetch(`/api/forms?id=${id}`, { method: 'DELETE' });
            if (res.ok) { setForms(prev => prev.filter(f => f.id !== id)); showToast('Form deleted'); }
        } catch (e) { console.error(e); }
    };

    // ─── FILL HELPERS ───
    const openFill = (form: Form) => {
        setActiveForm(form);
        const existingResponse = userResponses[form.id];
        setFillAnswers(existingResponse ? existingResponse.answers : {});
        setFillErrors(new Set());
        setSubmitted(false);
        setViewMode('fill');
    };

    const setAnswer = (fieldId: string, val: any) => {
        setFillAnswers(prev => ({ ...prev, [fieldId]: val }));
        setFillErrors(prev => { const n = new Set(prev); n.delete(fieldId); return n; });
    };

    const toggleCheckbox = (fieldId: string, val: string, checked: boolean) => {
        setFillAnswers(prev => {
            const arr = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
            if (checked) arr.push(val); else arr.splice(arr.indexOf(val), 1);
            return { ...prev, [fieldId]: arr };
        });
        setFillErrors(prev => { const n = new Set(prev); n.delete(fieldId); return n; });
    };

    const submitFill = async () => {
        if (!activeForm || !currentUser) return;
        const errors = new Set<string>();
        activeForm.fields.forEach(f => {
            if (!f.required) return;
            const a = fillAnswers[f.id];
            if (a === undefined || a === null || a === '' || (Array.isArray(a) && a.length === 0)) errors.add(f.id);
        });
        if (errors.size) { setFillErrors(errors); showToast('Please fill in all required fields'); return; }
        try {
            const res = await fetch('/api/forms/responses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formId: activeForm.id, respondentId: currentUser.id, answers: fillAnswers }),
            });
            if (res.ok) {
                const updatedResponse = await res.json();
                setUserResponses(prev => ({ ...prev, [activeForm.id]: updatedResponse }));
                setSubmitted(true);
                showToast('Response saved!');
            }
        } catch (e) { console.error(e); showToast('Failed to submit'); }
    };

    // ─── RESULTS HELPERS ───
    const openResults = async (form: Form) => {
        setActiveForm(form);
        setResTab('summary');
        setViewMode('results');
        try {
            const [res, usersRes] = await Promise.all([
                fetch(`/api/forms/responses?formId=${form.id}`),
                fetch('/api/users')
            ]);

            if (res.ok) {
                const allResponses: FormResponse[] = await res.json();

                // Group by respondentId and only keep the latest response
                const latestResponsesMap = new Map<string, FormResponse>();
                allResponses.forEach(r => {
                    const existing = latestResponsesMap.get(r.respondentId);
                    if (!existing || new Date(r.submittedAt) > new Date(existing.submittedAt)) {
                        latestResponsesMap.set(r.respondentId, r);
                    }
                });

                // Convert back to array and sort by newest first
                const uniqueResponses = Array.from(latestResponsesMap.values())
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

                setResponses(uniqueResponses);
            }
            if (usersRes.ok) setUsers(await usersRes.json());
        } catch (e) { console.error(e); }
    };

    // ─── LIST VIEW ───
    const renderList = () => (
        <div className="mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText size={22} className="text-blue-500" /> Forms
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage forms for your team</p>
                </div>
                <button onClick={() => openBuilder()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    <Plus size={18} /> Create Form
                </button>
            </div>
            {forms.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} className="text-blue-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No forms yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">Create your first form to collect feedback from your team</p>
                    <button onClick={() => openBuilder()} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
                        <Plus size={18} /> Create Your First Form
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {forms.filter(f => isCreator(f) || f.status === 'active').map(form => {
                        const creator = isCreator(form);
                        const statusColors: Record<string, string> = {
                            draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                            active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                            closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
                        };
                        return (
                            <div key={form.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <ClipboardList size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{form.title}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[form.status]}`}>{form.status.charAt(0).toUpperCase() + form.status.slice(1)}</span>
                                            {formResponseCounts[form.id] !== undefined && (
                                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {formResponseCounts[form.id]} response{formResponseCounts[form.id] !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {isCompleted(form.id) && !creator && (
                                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Completed
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(form.createdAt).toLocaleDateString()}</span>
                                            {creator && <span className="flex items-center gap-1"><Users size={12} /> You created this</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {creator ? (
                                            <>
                                                <button onClick={() => openBuilder(form)} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                                    <Edit3 size={14} />
                                                </button>
                                                <button onClick={() => openResults(form)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                                                    <BarChart3 size={14} /> Results
                                                </button>
                                                <button onClick={() => deleteForm(form.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => openFill(form)} className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${isCompleted(form.id) ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                                {isCompleted(form.id) ? <><Edit3 size={14} /> Edit Response</> : <><Send size={14} /> Fill Form</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    // ─── BUILDER VIEW ───
    const renderBuilder = () => (
        <div className="mx-auto p-6">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setViewMode('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                    <ChevronLeft size={16} /> Back to Forms
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={() => saveForm('draft')} className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                        Save as Draft
                    </button>
                    <button onClick={() => saveForm('active')} className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm">
                        <Send size={14} /> {editingFormId ? 'Save & Publish' : 'Publish Form'}
                    </button>
                </div>
            </div>
            {/* Header card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-teal-500" />
                <div className="p-6 border-l-4 border-blue-500">
                    <input value={builderTitle} onChange={e => setBuilderTitle(e.target.value)} placeholder="Untitled form"
                        className="w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600" />
                    <textarea value={builderDesc} onChange={e => setBuilderDesc(e.target.value)} placeholder="Form description (optional)" rows={2}
                        className="w-full mt-2 text-sm bg-transparent border-none outline-none text-gray-500 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-600 resize-none" />
                </div>
            </div>
            {/* Questions */}
            {builderFields.map((field, idx) => (
                <div key={field.id} onClick={() => setFocusedFieldId(field.id)}
                    className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-3 transition-all cursor-pointer ${focusedFieldId === field.id ? 'border-l-4 border-l-blue-500 shadow-lg' : ''}`}>
                    <div className="p-5">
                        <div className="flex items-start gap-3">
                            <input value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} placeholder="Question"
                                className="flex-1 text-sm font-semibold bg-transparent border-b border-gray-200 dark:border-gray-600 outline-none py-2 text-gray-900 dark:text-white placeholder-gray-300 focus:border-blue-500 transition-colors" />
                            <select value={field.type} onChange={e => changeFieldType(field.id, e.target.value as FormFieldType)}
                                className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 outline-none min-w-[140px]">
                                {Object.entries(FIELD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        {/* Field body */}
                        <div className="mt-3">
                            {(field.type === 'text') && <div className="text-sm text-gray-400 border-b border-dotted border-gray-200 dark:border-gray-600 py-2">Short answer text</div>}
                            {(field.type === 'comment') && <div className="text-sm text-gray-400 border-b border-dotted border-gray-200 dark:border-gray-600 py-2">Long answer text</div>}
                            {(field.type === 'date') && <div className="text-sm text-gray-400 border-b border-dotted border-gray-200 dark:border-gray-600 py-2 flex items-center gap-2"><Calendar size={14} /> Date picker</div>}
                            {['radiogroup', 'checkbox', 'dropdown'].includes(field.type) && (
                                <div>
                                    {(field.choices || []).map((c, i) => (
                                        <div key={i} className="flex items-center gap-2 mb-1">
                                            <span className="text-gray-300 dark:text-gray-600">
                                                {field.type === 'radiogroup' ? '○' : field.type === 'checkbox' ? '☐' : '▾'}
                                            </span>
                                            <input value={c} onChange={e => updateChoice(field.id, i, e.target.value)} placeholder={`Option ${i + 1}`}
                                                className="flex-1 text-sm bg-transparent border-b border-gray-200 dark:border-gray-600 outline-none py-1 text-gray-700 dark:text-gray-300 focus:border-blue-500" />
                                            {(field.choices?.length || 0) > 1 && (
                                                <button onClick={(e) => { e.stopPropagation(); removeChoice(field.id, i); }} className="text-gray-300 hover:text-red-500 transition-colors">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={(e) => { e.stopPropagation(); addChoice(field.id); }} className="text-xs text-gray-400 hover:text-blue-500 mt-1 flex items-center gap-1">
                                        <Plus size={12} /> Add option
                                    </button>
                                </div>
                            )}
                            {field.type === 'rating' && (
                                <div>
                                    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                                        <span>Min</span>
                                        <input type="number" min={0} max={5} value={field.rateMin ?? 1} onChange={e => updateField(field.id, { rateMin: +e.target.value })}
                                            className="w-14 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none" />
                                        <input value={field.minLabel || ''} onChange={e => updateField(field.id, { minLabel: e.target.value })} placeholder="Min label"
                                            className="w-28 border-b border-gray-200 dark:border-gray-600 bg-transparent outline-none py-1 text-gray-500 dark:text-gray-400 focus:border-blue-500" />
                                        <span>Max</span>
                                        <input type="number" min={2} max={10} value={field.rateMax ?? 5} onChange={e => updateField(field.id, { rateMax: +e.target.value })}
                                            className="w-14 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none" />
                                        <input value={field.maxLabel || ''} onChange={e => updateField(field.id, { maxLabel: e.target.value })} placeholder="Max label"
                                            className="w-28 border-b border-gray-200 dark:border-gray-600 bg-transparent outline-none py-1 text-gray-500 dark:text-gray-400 focus:border-blue-500" />
                                    </div>
                                    <div className="flex gap-1 mt-2">
                                        {Array.from({ length: Math.max(0, (field.rateMax ?? 5) - (field.rateMin ?? 1) + 1) }, (_, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs text-gray-500">{(field.rateMin ?? 1) + i}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Field footer */}
                        <div className="flex items-center justify-end gap-1 pt-3 mt-3 border-t border-gray-100 dark:border-gray-700">

                            <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                                <Trash2 size={16} />
                            </button>
                            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
                            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                                Required
                                <div className="relative">
                                    <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 peer-checked:bg-teal-500 rounded-full transition-colors" />
                                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            ))}
            {/* Add question */}
            <div className="flex justify-center my-5 mb-12">
                <button onClick={addField} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-full font-semibold shadow-lg hover:shadow-xl hover:opacity-90 transition-all">
                    <Plus size={18} /> Add Question
                </button>
            </div>
        </div>
    );

    // ─── FILL VIEW ───
    const renderFill = () => {
        if (!activeForm) return null;
        if (submitted) return (
            <div className="mx-auto p-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <CheckCircle2 size={64} className="text-teal-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Response recorded!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Thank you for completing <strong>{activeForm.title}</strong>.</p>
                    <button onClick={() => setViewMode('list')} className="px-5 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                        Back to Forms
                    </button>
                </div>
            </div>
        );
        return (
            <div className="mx-auto p-6">
                <button onClick={() => setViewMode('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4 transition-colors">
                    <ChevronLeft size={16} /> Back to Forms
                </button>
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
                    <div className="h-2 bg-gradient-to-r from-blue-500 to-teal-500" />
                    <div className="p-6 border-l-4 border-teal-500">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{activeForm.title}</h2>
                        {activeForm.description && <p className="text-sm text-gray-500 mt-1">{activeForm.description}</p>}
                        <p className="text-xs text-red-500 mt-2">* Required</p>
                    </div>
                </div>
                {/* Questions */}
                {activeForm.fields.map(field => {
                    const hasError = fillErrors.has(field.id);
                    return (
                        <div key={field.id} className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-3 p-5 transition-all ${hasError ? 'border-l-4 border-l-red-500' : ''}`}>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                {field.label || 'Untitled question'}{field.required && <span className="text-red-500 ml-1">*</span>}
                            </div>
                            {field.type === 'text' && (
                                <input type="text" placeholder="Your answer" value={fillAnswers[field.id] || ''} onChange={e => setAnswer(field.id, e.target.value)}
                                    className="w-full text-sm bg-transparent border-b border-gray-200 dark:border-gray-600 outline-none py-2 text-gray-700 dark:text-gray-300 focus:border-blue-500 transition-colors" />
                            )}
                            {field.type === 'comment' && (
                                <textarea placeholder="Your answer" rows={3} value={fillAnswers[field.id] || ''} onChange={e => setAnswer(field.id, e.target.value)}
                                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 outline-none resize-y focus:border-blue-500 transition-colors" />
                            )}
                            {field.type === 'date' && (
                                <input type="date" value={fillAnswers[field.id] || ''} onChange={e => setAnswer(field.id, e.target.value)}
                                    className="text-sm bg-transparent border-b border-gray-200 dark:border-gray-600 outline-none py-2 text-gray-700 dark:text-gray-300 focus:border-blue-500 transition-colors" />
                            )}
                            {field.type === 'radiogroup' && (field.choices || []).map((c, i) => (
                                <label key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer border border-transparent mb-1 transition-colors ${fillAnswers[field.id] === c ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                    <input type="radio" name={`fill-${field.id}`} value={c} checked={fillAnswers[field.id] === c} onChange={() => setAnswer(field.id, c)} className="accent-blue-500 w-4 h-4" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{c}</span>
                                </label>
                            ))}
                            {field.type === 'checkbox' && (field.choices || []).map((c, i) => (
                                <label key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer border border-transparent mb-1 transition-colors ${(fillAnswers[field.id] || []).includes(c) ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                    <input type="checkbox" value={c} checked={(fillAnswers[field.id] || []).includes(c)} onChange={e => toggleCheckbox(field.id, c, e.target.checked)} className="accent-teal-500 w-4 h-4" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{c}</span>
                                </label>
                            ))}
                            {field.type === 'dropdown' && (
                                <select value={fillAnswers[field.id] || ''} onChange={e => setAnswer(field.id, e.target.value)}
                                    className="text-sm border-b border-gray-200 dark:border-gray-600 bg-transparent outline-none py-2 text-gray-700 dark:text-gray-300 min-w-[200px] cursor-pointer">
                                    <option value="">Select...</option>
                                    {(field.choices || []).map((c, i) => <option key={i} value={c}>{c}</option>)}
                                </select>
                            )}
                            {field.type === 'rating' && (
                                <div>
                                    {(field.minLabel || field.maxLabel) && (
                                        <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
                                            <span>{field.minLabel}</span><span>{field.maxLabel}</span>
                                        </div>
                                    )}
                                    <div className="flex gap-2 flex-wrap">
                                        {Array.from({ length: Math.max(0, (field.rateMax ?? 5) - (field.rateMin ?? 1) + 1) }, (_, i) => {
                                            const v = (field.rateMin ?? 1) + i;
                                            return (
                                                <button key={v} onClick={() => setAnswer(field.id, v)}
                                                    className={`w-10 h-10 rounded-full border text-sm font-semibold transition-colors ${fillAnswers[field.id] === v ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-blue-400 hover:text-blue-500'}`}>
                                                    {v}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {hasError && <p className="text-xs text-red-500 mt-2">This question is required.</p>}
                        </div>
                    );
                })}
                <div className="flex items-center gap-3 mt-4">
                    <button onClick={submitFill} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:opacity-90 transition-all flex items-center gap-2">
                        <Send size={16} /> {userResponses[activeForm.id] ? 'Update Response' : 'Submit'}
                    </button>
                </div>
            </div>
        );
    };

    // ─── RESULTS VIEW ───
    const renderResults = () => {
        if (!activeForm) return null;
        return (
            <div className="mx-auto p-6">
                <button onClick={() => setViewMode('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4 transition-colors">
                    <ChevronLeft size={16} /> Back to Forms
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Results - {activeForm.title}</h2>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Users size={20} className="text-blue-500" /></div>
                        <div><div className="text-xs font-semibold text-gray-400 uppercase">Attendees / Responses</div><div className="text-xl font-bold text-gray-900 dark:text-white">{responses.length}</div></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center"><AlertCircle size={20} className="text-teal-500" /></div>
                        <div><div className="text-xs font-semibold text-gray-400 uppercase">Questions</div><div className="text-xl font-bold text-gray-900 dark:text-white">{activeForm.fields.length}</div></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Calendar size={20} className="text-green-500" /></div>
                        <div><div className="text-xs font-semibold text-gray-400 uppercase">Last Response</div><div className="text-sm font-bold text-gray-900 dark:text-white mt-1">{responses.length ? new Date(responses[0].submittedAt).toLocaleString() : '—'}</div></div>
                    </div>
                </div>
                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button onClick={() => setResTab('summary')} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${resTab === 'summary' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Summary</button>
                    <button onClick={() => setResTab('individual')} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${resTab === 'individual' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Individual Responses</button>
                </div>
                {responses.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-400">
                        <Inbox size={48} className="mx-auto mb-3 stroke-1" /><p>No responses yet.</p>
                    </div>
                ) : resTab === 'summary' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeForm.fields.map(field => {
                            const answers = responses.map(r => r.answers[field.id]).filter(a => a != null && a !== '');
                            return (
                                <div key={field.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{field.label || 'Untitled question'}</h3>
                                    <p className="text-xs text-gray-400 mb-3">{answers.length} of {responses.length} responded</p>
                                    {['radiogroup', 'dropdown', 'rating'].includes(field.type) ? (() => {
                                        const counts: Record<string, number> = {};
                                        const keys = field.type === 'rating' ? Array.from({ length: (field.rateMax ?? 5) - (field.rateMin ?? 1) + 1 }, (_, i) => String((field.rateMin ?? 1) + i)) : (field.choices || []);
                                        answers.forEach(a => { const k = String(a); counts[k] = (counts[k] || 0) + 1; });
                                        return [...new Set([...keys, ...Object.keys(counts)])].map(k => {
                                            const n = counts[k] || 0; const p = answers.length ? Math.round(n / answers.length * 100) : 0;
                                            return (
                                                <div key={k} className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-xs text-gray-500 w-28 truncate" title={k}>{k}</span>
                                                    <div className="flex-1 h-2.5 bg-blue-50 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full transition-all" style={{ width: `${p}%` }} /></div>
                                                    <span className="text-xs font-semibold text-blue-600 w-16 text-right whitespace-nowrap">{n} ({p}%)</span>
                                                </div>
                                            );
                                        });
                                    })() : field.type === 'checkbox' ? (() => {
                                        const counts: Record<string, number> = {};
                                        answers.forEach(a => (Array.isArray(a) ? a : [a]).forEach(v => { counts[v] = (counts[v] || 0) + 1; }));
                                        return [...new Set([...(field.choices || []), ...Object.keys(counts)])].map(k => {
                                            const n = counts[k] || 0; const p = answers.length ? Math.round(n / answers.length * 100) : 0;
                                            return (
                                                <div key={k} className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-xs text-gray-500 w-28 truncate" title={k}>{k}</span>
                                                    <div className="flex-1 h-2.5 bg-teal-50 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-teal-500 to-blue-500 rounded-full transition-all" style={{ width: `${p}%` }} /></div>
                                                    <span className="text-xs font-semibold text-teal-600 w-16 text-right whitespace-nowrap">{n} ({p}%)</span>
                                                </div>
                                            );
                                        });
                                    })() : (
                                        answers.slice().reverse().map((a, i) => (
                                            <div key={i} className="text-sm text-gray-700 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-1 border-l-3 border-teal-400">{String(a)}</div>
                                        ))
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[500px]">
                                <thead>
                                    <tr className="bg-blue-50 dark:bg-blue-900/20">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-600 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-600 uppercase">Respondent</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-600 uppercase">Submitted</th>
                                        {activeForm.fields.map(f => <th key={f.id} className="px-4 py-3 text-left text-xs font-bold text-blue-600 uppercase whitespace-nowrap">{f.label || 'Untitled'}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {responses.map((r, i) => (
                                        <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                {users.find(u => u.id === r.respondentId)?.name || 'Unknown User'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(r.submittedAt).toLocaleString()}</td>
                                            {activeForm.fields.map(f => {
                                                const v = r.answers[f.id];
                                                return <td key={f.id} className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] break-words">{Array.isArray(v) ? v.join(', ') : (v ?? '—')}</td>;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return (
        <div className="mx-auto p-6 flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
    );

    return (
        <div className="h-full overflow-auto">
            {viewMode === 'list' && renderList()}
            {viewMode === 'builder' && renderBuilder()}
            {viewMode === 'fill' && renderFill()}
            {viewMode === 'results' && renderResults()}
            {toast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-lg text-sm font-medium shadow-xl z-50 animate-[fadeUp_0.3s_ease]">
                    {toast}
                </div>
            )}
        </div>
    );
}

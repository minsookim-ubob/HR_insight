import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, GripVertical, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, FolderPlus, List, Search } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Category {
  id: string;
  name: string;
  isExpanded: boolean;
}

export type ScaleType = '5pt' | '7pt' | 'text';

interface Question {
  id: string;
  categoryId: string;
  text: string;
  isActive: boolean;
  scaleType: ScaleType;
}

export interface QuestionPool {
  id: string;
  title: string;
  categories: Category[];
  questions: Question[];
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', name: '팀워크 (Teamwork)', isExpanded: true },
  { id: 'c2', name: '직무 전문성 (Expertise)', isExpanded: true },
  { id: 'c3', name: '자기주도성 및 성과 지향 (Self-Initiative)', isExpanded: true },
  { id: 'c4', name: '대인관계 및 프로페셔널리즘 (Interpersonal)', isExpanded: true }
];

const INITIAL_QUESTIONS: Question[] = [
  { id: 'q1', categoryId: 'c1', text: '동료들과 원활한 의사소통을 유지하며 정보 공유에 적극적인가?', isActive: true, scaleType: '5pt' },
  { id: 'q2', categoryId: 'c1', text: '공동의 목표 달성을 위해 타인에 대한 배려와 지원을 실천하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q3', categoryId: 'c1', text: '팀 내 갈등 상황에서 건설적인 의견을 제시하고 해결하려 노력하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q4', categoryId: 'c1', text: '자신의 역할 외에도 팀 전체의 상호 협력을 위해 기여하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q5', categoryId: 'c1', text: '회사의 비전과 팀의 방향성을 이해하고 팀원들과 싱크를 맞추는가?', isActive: true, scaleType: '5pt' },

  { id: 'q6', categoryId: 'c2', text: '해당 직무에 필요한 전공 지식과 실무 숙련도를 충분히 갖추었는가?', isActive: true, scaleType: '5pt' },
  { id: 'q7', categoryId: 'c2', text: '결과물의 품질이 우수하며 사내 가이드라인과 원칙을 준수하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q8', categoryId: 'c2', text: '최신 트렌드나 기술을 업무에 적용하여 생산성을 높이려 노력하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q9', categoryId: 'c2', text: '주어진 자원(시간, 인력 등)을 효율적으로 활용하여 성과를 내는가?', isActive: true, scaleType: '5pt' },
  { id: 'q10', categoryId: 'c2', text: '문제 발생 시 근본 원인을 분석하고 효율적인 해결책을 도출하는가?', isActive: true, scaleType: '5pt' },

  { id: 'q11', categoryId: 'c3', text: '업무의 우선순위를 명확히 설정하고 기한 내 성과를 달성하기 위해 최선을 다하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q12', categoryId: 'c3', text: '주어진 환경에 안주하지 않고 스스로 개선 기회를 찾아 주도적으로 실행하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q13', categoryId: 'c3', text: '예상치 못한 문제 발생 시 당황하지 않고 대안을 찾아 해결책을 모니터링하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q14', categoryId: 'c3', text: '성과 달성을 위해 필요한 자원을 효율적으로 배분하고 관리하는 역량을 갖추었는가?', isActive: true, scaleType: '5pt' },
  { id: 'q15', categoryId: 'c3', text: '개인의 목표 달성뿐만 아니라 조직의 목표 달성에 기여하려는 의지가 뚜렷한가?', isActive: true, scaleType: '5pt' },

  { id: 'q16', categoryId: 'c4', text: '동료의 의견이 본인의 생각과 다르더라도 경청하고 존중하는 태도를 유지하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q17', categoryId: 'c4', text: '피드백을 받았을 때 방어적인 태도보다는 발전을 위한 기회로 수용하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q18', categoryId: 'c4', text: '조직 내 보안, 정직성 등 윤리적 가이드라인을 철저히 준수하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q19', categoryId: 'c4', text: '압박감이 높은 상황에서도 감정을 조절하며 전문적인 태도를 유지하는가?', isActive: true, scaleType: '5pt' },
  { id: 'q20', categoryId: 'c4', text: '상대방의 상황을 배려한 매너 있는 소통으로 협업자들의 신뢰를 얻고 있는가?', isActive: true, scaleType: '5pt' },
];

export const INITIAL_POOLS: QuestionPool[] = [
  {
    id: 'pool_1',
    title: '글로벌 리더십 다면진단 (공통)',
    categories: INITIAL_CATEGORIES,
    questions: INITIAL_QUESTIONS,
  },
  {
    id: 'pool_2',
    title: '신규 입사자 수습 통과 진단지',
    categories: [
      { id: 'c1', name: '핵심 가치 적합성', isExpanded: true },
      { id: 'c2', name: '초기 직무 수행 능력', isExpanded: true }
    ],
    questions: [
      { id: 'q1', categoryId: 'c1', text: '회사의 핵심가치와 인재상에 부합하는 행동을 보이고 있는가?', isActive: true, scaleType: '5pt' },
      { id: 'q2', categoryId: 'c2', text: '포지션에 요구되는 기본 직무 역량을 충분히 발휘하고 있는가?', isActive: true, scaleType: '5pt' }
    ],
  }
];

function SortableQuestionItem({ question, onToggle, onEdit, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={`p-4 flex gap-4 items-start border-b border-[#E2E8F0] last:border-0 ${!question.isActive ? 'bg-gray-50 opacity-75' : 'bg-white hover:bg-[#F8FAFC]'} transition-colors`}>
      <div {...attributes} {...listeners} className="pt-1 cursor-grab active:cursor-grabbing text-[#CBD5E1] hover:text-[#94A3B8] focus:outline-none touch-none">
        <GripVertical size={18} />
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EEF2FF] text-[#6366F1]">
            {question.scaleType === 'text' ? '주관식' : (question.scaleType === '7pt' ? '7점 척도' : '5점 척도')}
          </span>
        </div>
        <p className={`text-[14px] font-medium leading-relaxed ${!question.isActive ? 'text-[#94A3B8] line-through decoration-[#94A3B8]/30' : 'text-[#0F172A]'}`}>
          {question.text}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <button 
          onClick={onToggle}
          className={`flex items-center gap-1.5 text-xs font-bold ${question.isActive ? 'text-[#14B8A6]' : 'text-[#94A3B8]'}`}
        >
          {question.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          {question.isActive ? '사용중' : '미사용'}
        </button>
        <div className="w-px h-4 bg-[#E2E8F0]"></div>
        <button onClick={onEdit} className="text-[#94A3B8] hover:text-[#0F172A] transition-colors" title="수정">
          <Edit2 size={16} />
        </button>
        <button onClick={onDelete} className="text-[#94A3B8] hover:text-[#DC2626] transition-colors" title="삭제">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default function SurveyQuestionPools() {
  const [pools, setPools] = useState<QuestionPool[]>(() => {
    const stored = localStorage.getItem('master_survey_pools');
    return stored ? JSON.parse(stored) : INITIAL_POOLS;
  });

  const [activePoolId, setActivePoolId] = useState<string | null>(null);

  // Pool editing states
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catNameInput, setCatNameInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [addingQuestionToCat, setAddingQuestionToCat] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState('');
  const [questionScaleTypeInput, setQuestionScaleTypeInput] = useState<ScaleType>('5pt');

  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  const requestConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  // Save changes
  const savePools = (newPools: QuestionPool[]) => {
    setPools(newPools);
    localStorage.setItem('master_survey_pools', JSON.stringify(newPools));
  };

  const handleAddPool = () => {
    const newPool: QuestionPool = {
      id: `pool_${Date.now()}`,
      title: '새 진단지 이름',
      categories: [],
      questions: []
    };
    savePools([...pools, newPool]);
    setActivePoolId(newPool.id);
  };

  const activePool = pools.find(p => p.id === activePoolId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Update specific pool detail
  const updateActivePool = (updates: Partial<QuestionPool>) => {
    if (!activePoolId) return;
    const newPools = pools.map(p => p.id === activePoolId ? { ...p, ...updates } : p);
    savePools(newPools);
  };

  // Handlers for Category
  const handleToggleCategory = (id: string) => {
    if (!activePool) return;
    updateActivePool({
      categories: activePool.categories.map(c => c.id === id ? { ...c, isExpanded: !c.isExpanded } : c)
    });
  };

  const handleAddCategory = () => {
    if (!activePool || !catNameInput.trim()) {
      setIsAddingCat(false);
      return;
    }
    updateActivePool({
      categories: [...activePool.categories, { id: 'c' + Date.now(), name: catNameInput, isExpanded: true }]
    });
    setCatNameInput('');
    setIsAddingCat(false);
  };

  const handleDeleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePool) return;
    requestConfirm('카테고리를 삭제하면 속한 모든 문항이 함께 삭제됩니다. 삭제하시겠습니까?', () => {
      updateActivePool({
        categories: activePool.categories.filter(c => c.id !== id),
        questions: activePool.questions.filter(q => q.categoryId !== id)
      });
    });
  };

  const startEditCategory = (c: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCatId(c.id);
    setCatNameInput(c.name);
  };

  const saveCategoryEdit = () => {
    if (!activePool) return;
    if (catNameInput.trim()) {
      updateActivePool({
        categories: activePool.categories.map(c => c.id === editingCatId ? { ...c, name: catNameInput } : c)
      });
    }
    setEditingCatId(null);
  };

  // Handlers for Question
  const handleToggleQuestionActive = (id: string) => {
    if (!activePool) return;
    updateActivePool({
        questions: activePool.questions.map(q => q.id === id ? { ...q, isActive: !q.isActive } : q)
    });
  };

  const handleDeleteQuestion = (id: string) => {
    if (!activePool) return;
    requestConfirm('이 문항을 삭제하시겠습니까?', () => {
      updateActivePool({
        questions: activePool.questions.filter(q => q.id !== id)
      });
    });
  };

  const handleAddQuestion = (catId: string) => {
    if (!activePool) return;
    if (!questionInput.trim()) {
      setAddingQuestionToCat(null);
      return;
    }
    updateActivePool({
        questions: [...activePool.questions, {
        id: 'q' + Date.now(),
        categoryId: catId,
        text: questionInput,
        isActive: true,
        scaleType: questionScaleTypeInput
      }]
    });
    setQuestionInput('');
    setAddingQuestionToCat(null);
  };

  const startEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setQuestionInput(q.text);
    setQuestionScaleTypeInput(q.scaleType || '5pt');
  };

  const saveQuestionEdit = () => {
     if (!activePool) return;
    if (questionInput.trim()) {
      updateActivePool({
          questions: activePool.questions.map(q => q.id === editingQuestionId ? { ...q, text: questionInput, scaleType: questionScaleTypeInput } : q)
      });
    }
    setEditingQuestionId(null);
  };

  const handleBulkScaleType = (type: ScaleType) => {
    if (!activePool) return;
    requestConfirm(`모든 문항의 채점 기준을 '${type === '5pt' ? '5점 척도' : type === '7pt' ? '7점 척도' : '주관식'}'(으)로 일괄 변경하시겠습니까?`, () => {
      updateActivePool({
        questions: activePool.questions.map(q => ({...q, scaleType: type}))
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!activePool) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
       const oldIndex = activePool.questions.findIndex((i) => i.id === active.id);
       const newIndex = activePool.questions.findIndex((i) => i.id === over.id);
       if (oldIndex !== -1 && newIndex !== -1 && activePool.questions[oldIndex].categoryId === activePool.questions[newIndex].categoryId) {
         updateActivePool({
             questions: arrayMove(activePool.questions, oldIndex, newIndex)
         });
       }
    }
  };

  const handleDeletePool = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      requestConfirm('이 진단지를 완전히 삭제하시겠습니까?', () => {
          savePools(pools.filter(p => p.id !== id));
          if (activePoolId === id) setActivePoolId(null);
      });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">진단 문항 관리</h2>
          <p className="text-sm text-[#94A3B8] mt-1">대상자와 목적에 맞는 다양한 진단(Question Pool)을 만들고, 문항을 구성할 수 있습니다.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel: Pool List */}
          <div className="w-full lg:w-1/3 space-y-4">
            <div className="bg-white border text-sm border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col h-fit">
                <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                   <h3 className="font-bold flex items-center gap-2"><List size={18}/> 운영 중인 진단지 목록</h3>
                   <button onClick={handleAddPool} className="p-1 hover:bg-[#E2E8F0] text-[#6366F1] rounded transition-colors tooltip" title="새 진단지 만들기">
                       <Plus size={20} />
                   </button>
                </div>
                <div className="divide-y divide-[#E2E8F0] overflow-y-auto max-h-[600px]">
                    {pools.length === 0 && (
                        <div className="p-4 text-center text-[#94A3B8]">등록된 진단지가 없습니다.</div>
                    )}
                    {pools.map(pool => (
                        <div 
                         key={pool.id} 
                         onClick={() => setActivePoolId(pool.id)}
                         className={`p-4 flex flex-col gap-1 cursor-pointer transition-colors ${activePoolId === pool.id ? 'bg-indigo-50 border-l-4 border-l-[#6366F1]' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-[#0F172A] break-keep">{pool.title}</span>
                                <button onClick={(e) => handleDeletePool(pool.id, e)} className="text-[#94A3B8] hover:text-red-500 transition-colors p-1" title="삭제">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <span className="text-[12px] text-[#64748B]">{pool.categories.length}개 유형 / {pool.questions.length}문항</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* Right panel: Pool Detail / Builder */}
          <div className="w-full lg:w-2/3">
             {!activePool ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white border border-[#E2E8F0] border-dashed rounded-xl h-[400px]">
                    <List size={48} className="text-[#CBD5E1] mb-4" />
                    <p className="text-[#64748B] font-bold">진단지를 선택하거나 새로 만들어주세요.</p>
                </div>
             ) : (
                <div className="space-y-6">
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-[#0F172A] mb-1">진단지 제목</label>
                            <input
                             type="text"
                             value={activePool.title}
                             onChange={e => updateActivePool({ title: e.target.value })}
                             className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-[15px] font-bold text-[#0F172A] bg-[#F8FAFC]"
                             placeholder="진단지 이름을 입력하세요"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-6 mb-2">
                        <div className="flex items-center gap-4">
                            <h4 className="font-bold text-[#0F172A]">평가 유형 및 문항 구성</h4>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-[#64748B]">일괄 변경:</span>
                                <select 
                                    className="bg-white border border-[#E2E8F0] rounded px-2 py-1 focus:outline-none focus:border-[#6366F1]"
                                    onChange={(e) => {
                                        if(e.target.value) {
                                            handleBulkScaleType(e.target.value as ScaleType);
                                            e.target.value = "";
                                        }
                                    }}
                                >
                                    <option value="">선택...</option>
                                    <option value="5pt">5점 척도</option>
                                    <option value="7pt">7점 척도</option>
                                    <option value="text">주관식</option>
                                </select>
                            </div>
                        </div>
                        <button 
                            onClick={() => { setIsAddingCat(true); setCatNameInput(''); }}
                            className="flex items-center gap-1.5 text-xs font-bold text-[#6366F1] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <FolderPlus size={16} /> 새 유형 추가
                        </button>
                    </div>

                    {isAddingCat && (
                        <div className="bg-white border-2 border-[#6366F1] p-4 rounded-xl flex flex-col sm:flex-row items-center gap-3 shadow-sm mb-4">
                        <input 
                            type="text" 
                            value={catNameInput}
                            onChange={(e) => setCatNameInput(e.target.value)}
                            placeholder="새 유형(카테고리) 이름을 입력하세요..." 
                            className="flex-1 w-full bg-white border border-[#E2E8F0] text-sm font-bold rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                            autoFocus
                            onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddCategory();
                            if (e.key === 'Escape') setIsAddingCat(false);
                            }}
                        />
                        <div className="flex w-full sm:w-auto gap-2">
                            <button onClick={handleAddCategory} className="flex-1 px-4 py-2 bg-[#6366F1] text-white text-sm font-bold rounded-lg hover:bg-[#4F46E5] transition-colors">추가</button>
                            <button onClick={() => setIsAddingCat(false)} className="flex-1 px-4 py-2 bg-gray-100 text-[#475569] text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors">취소</button>
                        </div>
                        </div>
                    )}

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <div className="space-y-4">
                        {activePool.categories.length === 0 && !isAddingCat && (
                            <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-xl text-[#94A3B8] text-sm font-medium">
                                등록된 유형 카테고리가 없습니다. 유형을 먼저 추가하세요.
                            </div>
                        )}
                        {activePool.categories.map((cat) => {
                            const catQuestions = activePool.questions.filter(q => q.categoryId === cat.id);
                            return (
                            <div key={cat.id} className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                                {/* Category Header */}
                                <div 
                                className={`px-5 py-4 ${cat.isExpanded ? 'bg-[#F8FAFC] border-b border-[#E2E8F0]' : 'bg-white'} flex justify-between items-center cursor-pointer hover:bg-[#F1F5F9] transition-colors`}
                                onClick={() => handleToggleCategory(cat.id)}
                                >
                                <div className="flex items-center gap-3 flex-1">
                                    <button className="text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                                    {cat.isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                                    </button>
                                    
                                    {editingCatId === cat.id ? (
                                    <div className="flex items-center gap-2 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                                        <input 
                                        type="text"
                                        value={catNameInput}
                                        onChange={e => setCatNameInput(e.target.value)}
                                        className="w-full bg-white border border-[#E2E8F0] text-sm font-bold rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveCategoryEdit();
                                            if (e.key === 'Escape') setEditingCatId(null);
                                        }}
                                        />
                                        <button onClick={saveCategoryEdit} className="p-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded transition-colors"><Check size={16} /></button>
                                        <button onClick={() => setEditingCatId(null)} className="p-1.5 bg-gray-100 hover:bg-gray-200 text-[#475569] rounded transition-colors"><X size={16} /></button>
                                    </div>
                                    ) : (
                                    <h3 className="font-bold text-[#0F172A] text-[15px]">{cat.name} <span className="text-xs font-normal text-[#94A3B8] ml-2">총 {catQuestions.length}문항</span></h3>
                                    )}
                                </div>
                                
                                {editingCatId !== cat.id && (
                                    <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setAddingQuestionToCat(cat.id); 
                                        setQuestionInput(''); 
                                        if (!cat.isExpanded) handleToggleCategory(cat.id); 
                                        }}
                                        className="flex items-center gap-1 text-[11px] font-bold text-[#0F172A] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
                                    >
                                        <Plus size={14} /> 문항 추가
                                    </button>
                                    <div className="w-px h-4 bg-[#E2E8F0] mx-1"></div>
                                    <button onClick={(e) => startEditCategory(cat, e)} className="text-[#94A3B8] hover:text-[#0F172A] p-1 transition-colors" title="유형 이름 수정"><Edit2 size={16} /></button>
                                    <button onClick={(e) => handleDeleteCategory(cat.id, e)} className="text-[#94A3B8] hover:text-[#DC2626] p-1 transition-colors" title="유형 전체 삭제"><Trash2 size={16} /></button>
                                    </div>
                                )}
                                </div>

                                {/* Category Body / Questions */}
                                {cat.isExpanded && (
                                <div>
                                    {addingQuestionToCat === cat.id && (
                                    <div className="p-4 bg-blue-50 border-b border-[#E2E8F0] flex flex-col md:flex-row items-center gap-3">
                                        <div className="flex-none">
                                            <select 
                                                value={questionScaleTypeInput}
                                                onChange={(e) => setQuestionScaleTypeInput(e.target.value as ScaleType)}
                                                className="bg-white border border-[#E2E8F0] text-sm rounded-lg px-3 py-2 w-28 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                                            >
                                                <option value="5pt">5점 척도</option>
                                                <option value="7pt">7점 척도</option>
                                                <option value="text">주관식</option>
                                            </select>
                                        </div>
                                        <div className="flex-1 w-full">
                                        <input 
                                            type="text"
                                            value={questionInput}
                                            onChange={e => setQuestionInput(e.target.value)}
                                            placeholder="새 진단 문항을 입력하세요..."
                                            className="w-full bg-white border border-[#E2E8F0] text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                                            autoFocus
                                            onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddQuestion(cat.id);
                                            if (e.key === 'Escape') setAddingQuestionToCat(null);
                                            }}
                                        />
                                        </div>
                                        <div className="flex w-full md:w-auto gap-2">
                                        <button onClick={() => handleAddQuestion(cat.id)} className="flex-1 md:flex-none px-4 py-2 bg-[#6366F1] text-white text-sm font-bold rounded-lg hover:bg-[#4F46E5] transition-colors">저장</button>
                                        <button onClick={() => setAddingQuestionToCat(null)} className="flex-1 md:flex-none px-4 py-2 bg-white border border-[#E2E8F0] text-[#475569] text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors">취소</button>
                                        </div>
                                    </div>
                                    )}
                                    
                                    <SortableContext items={catQuestions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                    {catQuestions.map(q => (
                                        editingQuestionId === q.id ? (
                                        <div key={q.id} className="p-4 border-b border-[#E2E8F0] bg-gray-50 flex flex-col md:flex-row items-center gap-3 last:border-0">
                                            <div className="flex-none">
                                                <select 
                                                    value={questionScaleTypeInput}
                                                    onChange={(e) => setQuestionScaleTypeInput(e.target.value as ScaleType)}
                                                    className="bg-white border border-[#E2E8F0] text-sm rounded-lg px-3 py-2 w-28 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                                                >
                                                    <option value="5pt">5점 척도</option>
                                                    <option value="7pt">7점 척도</option>
                                                    <option value="text">주관식</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 w-full">
                                            <input 
                                                type="text"
                                                value={questionInput}
                                                onChange={e => setQuestionInput(e.target.value)}
                                                className="w-full bg-white border border-[#E2E8F0] text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveQuestionEdit();
                                                if (e.key === 'Escape') setEditingQuestionId(null);
                                                }}
                                            />
                                            </div>
                                            <div className="flex w-full md:w-auto gap-2">
                                            <button onClick={saveQuestionEdit} className="p-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"><Check size={16} /></button>
                                            <button onClick={() => setEditingQuestionId(null)} className="p-2 bg-white border border-[#E2E8F0] text-[#475569] rounded-lg hover:bg-gray-50 transition-colors"><X size={16} /></button>
                                            </div>
                                        </div>
                                        ) : (
                                        <SortableQuestionItem 
                                            key={q.id} 
                                            question={q} 
                                            onToggle={() => handleToggleQuestionActive(q.id)}
                                            onEdit={() => startEditQuestion(q)}
                                            onDelete={() => handleDeleteQuestion(q.id)}
                                        />
                                        )
                                    ))}
                                    </SortableContext>

                                    {catQuestions.length === 0 && addingQuestionToCat !== cat.id && (
                                    <div className="p-8 text-center text-[#94A3B8] text-sm font-medium bg-[#FAFAF9]">
                                        등록된 문항이 없습니다. 문항 추가 버튼을 눌러 새 문항을 등록하세요.
                                    </div>
                                    )}
                                </div>
                                )}
                            </div>
                            );
                        })}
                        </div>
                    </DndContext>
                </div>
             )}
          </div>
      </div>
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
               <p className="text-[#0F172A] font-bold text-[15px] mb-6 leading-relaxed whitespace-pre-wrap text-center">{confirmDialog.message}</p>
               <div className="flex justify-center gap-3">
                   <button 
                     onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} 
                     className="px-5 py-2.5 bg-[#F1F5F9] text-[#475569] font-bold text-sm rounded-lg hover:bg-[#E2E8F0] transition-colors focus:outline-none"
                   >
                     취소
                   </button>
                   <button 
                     onClick={() => { 
                       confirmDialog.onConfirm(); 
                       setConfirmDialog({ ...confirmDialog, isOpen: false }); 
                     }} 
                     className="px-5 py-2.5 bg-[#6366F1] text-white font-bold text-sm rounded-lg hover:bg-[#4F46E5] transition-colors shadow-sm focus:outline-none"
                   >
                     확인
                   </button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}

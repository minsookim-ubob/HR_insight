import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Info } from 'lucide-react';

interface SkillsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: any;
  onSave: (data: any) => void;
}

export default function SkillsEditModal({ isOpen, onClose, initialData, onSave }: SkillsEditModalProps) {
  const [workSkills, setWorkSkills] = useState<any[]>([]);
  const [languageSkills, setLanguageSkills] = useState<any[]>([]);
  const [oaSkills, setOaSkills] = useState<any[]>([]);
  const [techSkills, setTechSkills] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && initialData) {
      // Map existing string[] to object formats if needed
      setWorkSkills(
        (initialData.workSkills || []).map((s: any, idx: number) => 
          typeof s === 'string' ? { id: `ws_${Date.now()}_${idx}`, year: '', institution: '', name: s, notes: '' } : s
        )
      );
      setLanguageSkills(
        (initialData.languageSkills || []).map((s: any, idx: number) => 
          typeof s === 'string' ? { id: `ls_${Date.now()}_${idx}`, language: s, level: '중', testName: '', score: '' } : s
        )
      );
      setOaSkills(initialData.oaSkills || []);
      setTechSkills(initialData.techSkills || []);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      workSkills,
      languageSkills,
      oaSkills,
      techSkills
    });
  };

  const moveItem = (list: any[], setList: any, index: number, direction: 'up' | 'down') => {
    const newList = [...list];
    if (direction === 'up' && index > 0) {
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    } else if (direction === 'down' && index < newList.length - 1) {
      [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
    }
    setList(newList);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-[#0F172A]">보유 스킬 상세 관리</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 bg-white rounded-lg border border-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
          {/* 주요 업무 스킬 / 자격사항 */}
          <section>
            <div className="flex justify-between items-end mb-4">
               <div>
                 <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">주요 업무 스킬 (자격 사항)</h3>
                 <p className="text-sm text-gray-500 mt-1">자격증 취득 연도, 기관명, 자격명 등의 주요 보유 스킬 내용을 기입합니다.</p>
               </div>
               <button onClick={() => setWorkSkills([...workSkills, { id: `ws_${Date.now()}`, year: '', institution: '', name: '', notes: '' }])} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold flex items-center gap-1">
                 <Plus size={16} /> 추가
               </button>
            </div>
            
            <div className="space-y-3">
              {workSkills.map((sk, idx) => (
                <div key={sk.id} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveItem(workSkills, setWorkSkills, idx, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowUp size={16} /></button>
                    <button onClick={() => moveItem(workSkills, setWorkSkills, idx, 'down')} disabled={idx === workSkills.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowDown size={16} /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-3 flex-1 ml-2">
                    <input type="text" placeholder="취득 연도 (예: 2023)" value={sk.year} onChange={e => { const n = [...workSkills]; n[idx].year = e.target.value; setWorkSkills(n); }} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="기관명 (예: 한국산업인력공단)" value={sk.institution} onChange={e => { const n = [...workSkills]; n[idx].institution = e.target.value; setWorkSkills(n); }} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="자격/스킬명 (예: 정보처리기사)" value={sk.name} onChange={e => { const n = [...workSkills]; n[idx].name = e.target.value; setWorkSkills(n); }} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="비고" value={sk.notes} onChange={e => { const n = [...workSkills]; n[idx].notes = e.target.value; setWorkSkills(n); }} className="px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <button onClick={() => setWorkSkills(workSkills.filter((_, i) => i !== idx))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-1"><Trash2 size={18} /></button>
                </div>
              ))}
              {workSkills.length === 0 && <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">등록된 자격/스킬이 없습니다.</div>}
            </div>
          </section>

          {/* 어학 역량 */}
          <section>
            <div className="flex justify-between items-end mb-4">
               <div>
                 <h3 className="text-lg font-bold text-[#0F172A]">어학 역량</h3>
                 <p className="text-sm text-gray-500 mt-1">영어, 중국어, 일본어 등의 언어 수준 및 공인 어학 점수를 기재합니다.</p>
               </div>
               <button onClick={() => setLanguageSkills([...languageSkills, { id: `ls_${Date.now()}`, language: '영어', level: '중', testName: '', score: '' }])} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-bold flex items-center gap-1">
                 <Plus size={16} /> 추가
               </button>
            </div>
            
            <div className="space-y-3">
              {languageSkills.map((sk, idx) => (
                <div key={sk.id} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-4 gap-3 flex-1">
                    <select value={sk.language} onChange={e => { const n = [...languageSkills]; n[idx].language = e.target.value; setLanguageSkills(n); }} className="px-3 py-2 border rounded-lg text-sm bg-white">
                       <option value="영어">영어</option>
                       <option value="중국어">중국어</option>
                       <option value="일본어">일본어</option>
                       <option value="스페인어">스페인어</option>
                       <option value="기타">기타</option>
                    </select>
                    <select value={sk.level} onChange={e => { const n = [...languageSkills]; n[idx].level = e.target.value; setLanguageSkills(n); }} className="px-3 py-2 border rounded-lg text-sm bg-white">
                       <option value="상">수준: 상 (비즈니스 회화 능통)</option>
                       <option value="중">수준: 중 (업무상 소통 가능)</option>
                       <option value="하">수준: 하 (기초 회화 가능)</option>
                    </select>
                    <input type="text" placeholder="공인인증 (예: TOEIC, OPIc)" value={sk.testName} onChange={e => { const n = [...languageSkills]; n[idx].testName = e.target.value; setLanguageSkills(n); }} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="점수/등급 (예: 900, IH)" value={sk.score} onChange={e => { const n = [...languageSkills]; n[idx].score = e.target.value; setLanguageSkills(n); }} className="px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <button onClick={() => setLanguageSkills(languageSkills.filter((_, i) => i !== idx))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-1"><Trash2 size={18} /></button>
                </div>
              ))}
              {languageSkills.length === 0 && <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">등록된 어학 역량이 없습니다.</div>}
            </div>
          </section>

          {/* OA 역량 */}
          <section>
            <div className="flex justify-between items-end mb-4">
               <div>
                 <h3 className="text-lg font-bold text-[#0F172A]">OA 역량</h3>
                 <p className="text-sm text-gray-500 mt-1">Word, Excel, PowerPoint, 한글 등의 오피스 활용 능력을 수준별로 평가합니다.</p>
               </div>
               <button onClick={() => setOaSkills([...oaSkills, { id: `oa_${Date.now()}`, category: 'Excel', level: '중' }])} className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-sm font-bold flex items-center gap-1">
                 <Plus size={16} /> 추가
               </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {oaSkills.map((sk, idx) => (
                <div key={sk.id} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <select value={sk.category} onChange={e => { const n = [...oaSkills]; n[idx].category = e.target.value; setOaSkills(n); }} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white">
                      <option value="Excel">MS Excel</option>
                      <option value="PowerPoint">MS PowerPoint</option>
                      <option value="Word">MS Word</option>
                      <option value="한글">한글 (HWP)</option>
                      <option value="기타">기타 OA (주관식)</option>
                  </select>
                  <select value={sk.level} onChange={e => { const n = [...oaSkills]; n[idx].level = e.target.value; setOaSkills(n); }} className="w-24 px-3 py-2 border rounded-lg text-sm bg-white">
                      <option value="상">상</option>
                      <option value="중">중</option>
                      <option value="하">하</option>
                  </select>
                  <button onClick={() => setOaSkills(oaSkills.filter((_, i) => i !== idx))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
              {oaSkills.length === 0 && <div className="col-span-2 text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">등록된 OA 역량이 없습니다.</div>}
            </div>
          </section>

          {/* 시스템/직무 기타 특화 스킬 (제안 반영) */}
          <section>
            <div className="flex justify-between items-end mb-4">
               <div>
                 <h3 className="text-lg font-bold text-[#0F172A]">기타 보유 직무 스킬</h3>
                 <p className="text-sm text-gray-500 mt-1">시스템, 기술, 협업 툴(Jira, Notion), 또는 소프트스킬(리더십, 협상) 등을 기재하세요.</p>
               </div>
               <button onClick={() => setTechSkills([...techSkills, { id: `ts_${Date.now()}`, skillName: '', proficiency: '우수' }])} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold flex items-center gap-1">
                 <Plus size={16} /> 추가
               </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {techSkills.map((sk, idx) => (
                <div key={sk.id} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input type="text" placeholder="예: B2B 세일즈, React, Jira 등" value={sk.skillName} onChange={e => { const n = [...techSkills]; n[idx].skillName = e.target.value; setTechSkills(n); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                  <select value={sk.proficiency} onChange={e => { const n = [...techSkills]; n[idx].proficiency = e.target.value; setTechSkills(n); }} className="w-24 px-3 py-2 border rounded-lg text-sm bg-white">
                      <option value="전문가">전문가</option>
                      <option value="우수">우수</option>
                      <option value="보통">보통</option>
                      <option value="기초">기초</option>
                  </select>
                  <button onClick={() => setTechSkills(techSkills.filter((_, i) => i !== idx))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
              {techSkills.length === 0 && <div className="col-span-2 text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">등록된 기타 스킬이 없습니다.</div>}
            </div>
          </section>

        </div>

        <div className="p-6 border-t border-[#E2E8F0] bg-gray-50 flex justify-end gap-3 rounded-b-2xl mt-auto">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors">
            취소
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm">
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}

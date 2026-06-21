import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Calculator } from 'lucide-react';

interface CareerHistoryItem {
  id: string;
  companyName: string;
  teamName: string;
  role: string;
  rank?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

interface CareerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: CareerHistoryItem[];
  onSave: (data: CareerHistoryItem[]) => void;
}

export default function CareerEditModal({ isOpen, onClose, initialData, onSave }: CareerEditModalProps) {
  const [history, setHistory] = useState<CareerHistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Create a deep copy to allow editing without affecting the original immediately
      setHistory(JSON.parse(JSON.stringify(initialData || [])));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(history);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newList = [...history];
    if (direction === 'up' && index > 0) {
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    } else if (direction === 'down' && index < newList.length - 1) {
      [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
    }
    setHistory(newList);
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start) return '';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '';

    let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
    if (endDate.getDate() < startDate.getDate()) {
        months--;
    }
    
    if (months < 0) return '';
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) return `${remainingMonths}개월`;
    if (remainingMonths === 0) return `${years}년`;
    return `${years}년 ${remainingMonths}개월`;
  };

  const updateItem = (index: number, field: keyof CareerHistoryItem, value: string) => {
    const newList = [...history];
    newList[index] = { ...newList[index], [field]: value };
    setHistory(newList);
  };

  const addItem = () => {
    setHistory([...history, {
      id: `ch_${Date.now()}`,
      companyName: '',
      teamName: '',
      role: '',
      rank: '',
      startDate: '',
      endDate: '',
      notes: ''
    }]);
  };

  const deleteItem = (index: number) => {
    setHistory(history.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">경력 사항 상세 관리</h2>
            <p className="text-sm text-gray-500 mt-1">이전 직장 및 현 직장 내 전보/부서 이동 이력을 관리합니다.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 bg-white rounded-lg border border-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          <div className="flex justify-end">
            <button onClick={addItem} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm">
              <Plus size={16} /> 행 추가
            </button>
          </div>

          <div className="space-y-4">
            {history.map((item, idx) => (
              <div key={item.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm flex gap-3">
                <div className="flex flex-col gap-1 pt-2">
                  <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1"><ArrowUp size={16} /></button>
                  <button onClick={() => moveItem(idx, 'down')} disabled={idx === history.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1"><ArrowDown size={16} /></button>
                </div>
                
                <div className="flex-1 grid grid-cols-12 gap-4">
                  {/* Row 1 */}
                  <div className="col-span-4">
                    <label className="block text-xs font-bold text-gray-600 mb-1">회사명 <span className="text-rose-500">*</span></label>
                    <input type="text" placeholder="예: (주)A시스템, 현재 회사명" value={item.companyName} onChange={e => updateItem(idx, 'companyName', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-bold text-gray-600 mb-1">부서/팀명</label>
                    <input type="text" placeholder="예: 영업총괄본부 영업1팀" value={item.teamName} onChange={e => updateItem(idx, 'teamName', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">직무</label>
                    <input type="text" placeholder="예: B2B 영업" value={item.role} onChange={e => updateItem(idx, 'role', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">직급</label>
                    <input type="text" placeholder="예: 대리, 과장" value={item.rank || ''} onChange={e => updateItem(idx, 'rank', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>

                  {/* Row 2 */}
                  <div className="col-span-6 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-600 mb-1">시작일</label>
                      <input type="date" value={item.startDate} onChange={e => updateItem(idx, 'startDate', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-600 mb-1">종료일 (공란 시 현재재직)</label>
                      <input type="date" value={item.endDate} onChange={e => updateItem(idx, 'endDate', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div className="w-[120px] bg-blue-50 border border-blue-100 rounded-lg h-[38px] flex items-center justify-center text-xs font-bold text-blue-700 shadow-sm" title="경력 기간">
                       {calculateDuration(item.startDate, item.endDate) || '-'}
                    </div>
                  </div>
                  <div className="col-span-6">
                    <label className="block text-xs font-bold text-gray-600 mb-1">비고 (전보 이력 등)</label>
                    <input type="text" placeholder="예: 당사 입사, 본사 영업1팀 발령, OOO 프로젝트 참여 등" value={item.notes} onChange={e => updateItem(idx, 'notes', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>

                <div className="pt-6 ml-2">
                  <button onClick={() => deleteItem(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200">
                     <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                등록된 경력 사항이 없습니다.<br/>우측 상단의 '행 추가' 버튼을 눌러 내역을 작성해주세요.
              </div>
            )}
          </div>
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

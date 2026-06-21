import React, { useState, useEffect } from 'react';
import { Mail, Clock, Users, Save, Sparkles, Plus, Trash2, Send } from 'lucide-react';

interface InsightSetting {
  time: string;
  recipients: string[];
  isActive: boolean;
}

export default function HrInsightSettings() {
  const [setting, setSetting] = useState<InsightSetting>({
    time: '19:00',
    recipients: ['hskim@ubob.com'],
    isActive: true
  });
  
  const [newEmail, setNewEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('hr_insight_settings');
    if (saved) {
      setSetting(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('hr_insight_settings', JSON.stringify(setting));
    alert('HR 인사이트 발송 설정이 저장되었습니다.');
  };

  const handleAddRecipient = () => {
    if (newEmail && !setting.recipients.includes(newEmail)) {
      setSetting({ ...setting, recipients: [...setting.recipients, newEmail] });
      setNewEmail('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setSetting({ ...setting, recipients: setting.recipients.filter(e => e !== email) });
  };

  const handleSendTest = async () => {
    setIsGenerating(true);
    setPreviewContent(null);
    try {
      const response = await fetch('/api/gemini/generate-hr-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptData: {
            "다면진단_자가진단_등_액션": [
              "홍길동: 자가진단 완료",
              "김철수: KPI 승인 요청"
            ],
            "면담_예약_및_ToDoList": [
              "이영희: 내일 14:00 김대리 면담 예정",
              "박지민: 역량강화 계획서 제출 D-1"
            ],
            "이상징후": [
              "최민호: KPI 진척률 전월 대비 10% 미달, 동기부여 면담 필요"
            ]
          }
        })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setPreviewContent(data.text);
    } catch (error) {
      console.error(error);
      alert('AI 인사이트를 생성하는 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Card */}
        <div className="flex-1 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-slate-50 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
             <div>
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                   <Sparkles className="text-indigo-500" size={18}/> 일일 HR 인사이트 발송 설정
                </h2>
                <p className="text-xs text-slate-500 mt-1">AI가 시스템 주요 현황을 분석하여 메일로 요약 보고합니다.</p>
             </div>
             <div className="flex items-center gap-2">
                 <span className="text-xs font-bold text-slate-600 tracking-tight">발송 활성화</span>
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input type="checkbox" className="sr-only peer" checked={setting.isActive} onChange={e => setSetting({...setting, isActive: e.target.checked})} />
                   <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                 </label>
             </div>
          </div>
          
          <div className="p-6 space-y-6 flex-1">
             <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-800 tracking-tight mb-2">
                   <Clock className="text-slate-400" size={16}/> 발송 시간 (매일)
                </label>
                <input 
                   type="time" 
                   value={setting.time}
                   onChange={e => setSetting({...setting, time: e.target.value})}
                   className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-indigo-700 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">지정한 시간에 MASTER 임원진에게 메일이 발송됩니다. (예: 19:00)</p>
             </div>

             <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-800 tracking-tight mb-2">
                   <Users className="text-slate-400" size={16}/> 수신자 관리
                </label>
                <div className="flex gap-2 w-full max-w-sm mb-3">
                   <input 
                      type="email" 
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddRecipient()}
                      placeholder="master@company.com"
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                   />
                   <button 
                      onClick={handleAddRecipient}
                      className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg shrink-0 hover:bg-slate-200 transition text-slate-700"
                   >
                      <Plus size={16}/>
                   </button>
                </div>
                
                <ul className="space-y-2">
                   {setting.recipients.map((email, idx) => (
                      <li key={idx} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                         <div className="flex items-center gap-2 text-sm text-slate-700">
                             <Mail size={14} className="text-slate-400"/> {email}
                         </div>
                         <button onClick={() => handleRemoveRecipient(email)} className="p-1 text-slate-400 hover:text-red-500 transition">
                            <Trash2 size={14}/>
                         </button>
                      </li>
                   ))}
                   {setting.recipients.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                         수신자로 지정된 이메일이 없습니다.
                      </div>
                   )}
                </ul>
             </div>
          </div>
          
          <div className="border-t border-[#E2E8F0] px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
             <button onClick={handleSendTest} disabled={isGenerating} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg shadow-sm hover:bg-slate-50 flex items-center gap-2 transition focus:outline-none disabled:opacity-50">
               {isGenerating ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <Send size={16}/>}
               미리보기(테스트)
             </button>
             <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2 transition focus:outline-none flex-1 md:flex-none justify-center">
               <Save size={16}/> 설정 저장
             </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-[1.5] bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm flex flex-col">
           <div className="border-b border-[#E2E8F0] px-6 py-4 bg-slate-800 text-white">
              <h2 className="font-bold text-sm tracking-wide text-indigo-200">HR INSIGHT PREVIEW</h2>
              <div className="flex gap-2 items-center text-xs text-slate-400 mt-1">
                 <span>{new Date().toLocaleDateString('ko-KR')}</span>
                 <span>(AI 요약본)</span>
              </div>
           </div>
           <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
              {!previewContent && !isGenerating && (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-3 py-20">
                    <Sparkles size={32} className="opacity-20"/>
                    <p>미리보기 버튼을 클릭하면 AI 분석 결과가 표시됩니다.</p>
                 </div>
              )}
              {isGenerating && (
                 <div className="flex flex-col items-center justify-center h-full text-indigo-400 text-sm gap-3 py-20">
                    <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="animate-pulse tracking-tight font-bold">SalesIQ AI 분석 중...</p>
                 </div>
              )}
              {previewContent && !isGenerating && (
                 <div className="prose prose-sm prose-slate max-w-none text-[13px] leading-relaxed markdown-body">
                    <div style={{ whiteSpace: 'pre-wrap' }}>{previewContent}</div>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

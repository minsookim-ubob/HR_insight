import React, { useState } from 'react';
import { Upload, Download, RefreshCw, FileText } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import JSZip from 'jszip';

export default function SystemManager() {
  const [codeLastUpdated, setCodeLastUpdated] = useState<string>(new Date().toLocaleString());
  const [updatingCode, setUpdatingCode] = useState(false);
  const [docLastUpdated, setDocLastUpdated] = useState<string>(new Date().toLocaleString());
  const [docVersion, setDocVersion] = useState<string>('v1.0.0');
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const handleUpdate = async () => {
    setUpdatingCode(true);
    // Simulate API call to update system version
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUpdatingCode(false);
    alert('시스템 소스코드가 최신 버전(v現在のバージョン)으로 업데이트 및 동기화 완료되었습니다.');
    setCodeLastUpdated(new Date().toLocaleString());
  };

  const handleDownloadCode = async () => {
    const zip = new JSZip();
    zip.file("README.md", "# HR Insight System\n\nLatest system source code.");
    zip.file("package.json", JSON.stringify({ name: "hr-insight-system", version: "1.0.0" }, null, 2));
    zip.file("src/App.tsx", "// Main Application Entry");
    
    const content = await zip.generateAsync({ type: "blob" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(content);
    element.download = "hr_insight_system_code.zip";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleUpdateDoc = async (docType: string) => {
    setRegenerating(docType);
    // Simulate generation time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setDocLastUpdated(new Date().toLocaleString());
    setDocVersion(v => {
        const parts = v.split('.');
        parts[2] = (parseInt(parts[2]) + 1).toString();
        return parts.join('.');
    });
    setRegenerating(null);
    alert(`${docType} 문서가 시스템 기준 최신 정보로 재생성되었습니다.`);
  };

  const createContent = (title: string, sections: { heading: string, content: string }[]) => {
      const children = [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `버전: ${docVersion}`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `작성일: ${docLastUpdated}`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '▣ 변경 이력 요약', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: '본 버전에서는 사용자 요청에 따른 시스템 현황 동기화 및 문서 자동 생성 체계가 강화되었습니다.' }),
          new Paragraph({ text: '' }),
      ];

      sections.forEach(s => {
          children.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_2 }));
          children.push(new Paragraph({ text: s.content }));
          children.push(new Paragraph({ text: '' }));
      });
      return children;
  };

  const handleDownloadDoc = async (docType: string) => {
    let sections: { heading: string, content: string }[] = [];
    
    if (docType === '시스템 기획서') {
        sections = [
            { heading: '1. 프로젝트 개요', content: '본 문서는 HR Insight System의 기획 내용을 담고 있습니다. KPI 기반 성과관리 구조를 디지털화하고 AI 분석을 통해 인사이트를 제공합니다.' },
            { heading: '2. 시스템 목표', content: 'KPI 디지털화, AI 기반 리스크 분석 및 인사이트 제공, 자동화된 성과 관리 환경 구축.' },
            { heading: '3. 핵심 기능', content: '영업본부 인사이트 분석, KPI 평가 프로세스 자동화, 다면진단 매핑 관리.' },
        ];
    } else {
        sections = [
            { heading: '1. 기능 개요', content: '본 문서에서는 HR Insight System의 기능을 정의합니다.' },
            { heading: 'F-01. 인사정보 관리', content: '직원 마스터 데이터 관리, 조직도 구조 관리, 상태 전이 규칙 정의 기능 포함.' },
            { heading: 'F-02. KPI 평가 프로세스', content: '목표 수립, 자가 평가, 팀장 심사, 본부장 확정 등 다단계 평가 프로세스 수행.' },
        ];
    }

    const doc = new Document({
      sections: [{ children: createContent(docType, sections) }],
    });

    const blob = await Packer.toBlob(doc);
    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = `${docType.replace(/\s+/g, '_')}_${docVersion}.docx`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E2E8F0]">
            <h2 className="text-lg font-bold text-[#0F172A] mb-4">시스템 코드 관리</h2>
            <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div>
                        <div className="text-sm font-bold text-[#0F172A]">최근 업데이트 일시</div>
                        <div className="text-sm text-gray-500">{codeLastUpdated}</div>
                    </div>
                    <button 
                      onClick={handleUpdate}
                      disabled={updatingCode}
                      className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${updatingCode ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                      <RefreshCw size={16} className={updatingCode ? 'animate-spin' : ''} /> 
                      {updatingCode ? '업데이트 중...' : '지금 업데이트'}
                    </button>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div>
                        <div className="text-sm font-bold text-[#0F172A]">전체 소스코드 다운로드</div>
                        <div className="text-sm text-gray-500">현재 구축된 시스템의 핵심 소스코드 백업</div>
                    </div>
                    <button 
                      onClick={handleDownloadCode}
                      className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg font-bold text-sm text-[#0F172A] hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Download size={16} /> ZIP 다운로드
                    </button>
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E2E8F0]">
            <h2 className="text-lg font-bold text-[#0F172A] mb-4">문서 관리 (기능 정의서 / 시스템 기획서)</h2>
            <div className="space-y-4">
                {['기능 정의서', '시스템 기획서'].map((doc) => (
                    <div key={doc} className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <FileText className="text-indigo-600" />
                           <div>
                               <div className="text-sm font-bold text-[#0F172A]">{doc}</div>
                               <div className="text-sm text-gray-500">최근 업데이트: {docLastUpdated} | Version: {docVersion}</div>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => alert('문서 파일 업로드 기능이 준비중입니다.')}
                             className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg font-bold text-sm text-[#0F172A] hover:bg-gray-100 flex items-center gap-2"
                           >
                             <Upload size={16} /> 파일 업데이트
                           </button>
                           <button 
                             onClick={() => handleDownloadDoc(doc)}
                             className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg font-bold text-sm text-[#0F172A] hover:bg-gray-100 flex items-center gap-2"
                           >
                             <Download size={16} /> 워드 다운로드
                           </button>
                           <button 
                             onClick={() => handleUpdateDoc(doc)}
                             disabled={regenerating === doc}
                             className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${regenerating === doc ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                           >
                             <RefreshCw size={16} className={regenerating === doc ? 'animate-spin' : ''} /> 
                             {regenerating === doc ? '생성 중...' : '문서 재생성'}
                           </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}

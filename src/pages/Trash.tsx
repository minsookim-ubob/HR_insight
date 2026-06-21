import React, { useState, useEffect } from 'react';
import { getTrashItems, deletePermanently, restoreItem, TrashItem } from '../utils/trashUtils';
import { RefreshCw, Trash2 } from 'lucide-react';

export default function Trash() {
  const [items, setItems] = useState<TrashItem[]>([]);

  useEffect(() => {
    setItems(getTrashItems());
  }, []);

  const handleRestore = (id: string) => {
    restoreItem(id);
    setItems(getTrashItems());
    alert('항목이 복구되었습니다.');
  };

  const handlePermanentDelete = (id: string) => {
    if (window.confirm('정말 영구 삭제하시겠습니까?')) {
        deletePermanently(id);
        setItems(getTrashItems());
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">휴지통</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                    <th className="px-6 py-4 text-left">항목명</th>
                    <th className="px-6 py-4 text-left">유형</th>
                    <th className="px-6 py-4 text-left">삭제일</th>
                    <th className="px-6 py-4 text-right">작업</th>
                </tr>
            </thead>
            <tbody>
                {items.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-gray-500">휴지통이 비어있습니다.</td>
                    </tr>
                ) : (
                    items.map(item => (
                        <tr key={item.id} className="border-b border-gray-100">
                            <td className="px-6 py-4">{item.originalName}</td>
                            <td className="px-6 py-4 capitalize">{item.type}</td>
                            <td className="px-6 py-4">{new Date(item.deletedAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => handleRestore(item.id)} className="text-blue-600 hover:text-blue-800 mr-4">
                                    <RefreshCw size={16} />
                                </button>
                                <button onClick={() => handlePermanentDelete(item.id)} className="text-red-600 hover:text-red-800">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}

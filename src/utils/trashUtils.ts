export interface TrashItem {
  id: string; // The ID in the trash
  originalId: string;
  type: 'interview' | 'kpi' | 'survey' | 'other';
  data: any;
  deletedAt: string;
  originalName: string;
}

const TRASH_KEY = 'unified_trash_storage';

export const trashItem = (item: any, type: TrashItem['type'], originalName: string) => {
  const trash = getTrashItems();
  const newItem: TrashItem = {
    id: `trash_${Date.now()}`,
    originalId: item.id,
    type,
    data: item,
    deletedAt: new Date().toISOString(),
    originalName
  };
  trash.push(newItem);
  localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
};

export const getTrashItems = (): TrashItem[] => {
  const stored = localStorage.getItem(TRASH_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const deletePermanently = (trashId: string) => {
  const trash = getTrashItems();
  localStorage.setItem(TRASH_KEY, JSON.stringify(trash.filter(i => i.id !== trashId)));
};

export const restoreItem = (trashId: string) => {
  const trash = getTrashItems();
  const item = trash.find(i => i.id === trashId);
  if (!item) return;

  // Restore logic depends on type
  if (item.type === 'interview') {
      const stored = localStorage.getItem('master_interviews');
      const parsed = stored ? JSON.parse(stored) : [];
      parsed.push(item.data);
      localStorage.setItem('master_interviews', JSON.stringify(parsed));
  }
  // Add other types as needed
  
  deletePermanently(trashId);
};

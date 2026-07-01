type Identified = {
  id: string;
};

export function isLocalOnlyItem(item: Identified) {
  return item.id.startsWith("local-");
}

export function getLocalOnlyItems<T extends Identified>(items: T[]) {
  return items.filter(isLocalOnlyItem);
}

export function mergeRemoteAndLocal<T extends Identified>(remoteItems: T[], localItems: T[]) {
  const remoteIds = new Set(remoteItems.map((item) => item.id));
  return [...remoteItems, ...localItems.filter((item) => !remoteIds.has(item.id))];
}

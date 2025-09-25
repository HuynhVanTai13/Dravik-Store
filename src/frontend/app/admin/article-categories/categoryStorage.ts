// frontend/app/admin/article-categories/categoryStorage.ts
export const CAT_LS_KEY = "app_article_categories";

export type LocalCategory = { id: string; name: string };

// Lấy từ localStorage, chuẩn hoá về [{id,name}, ...]
export function getCategoriesFromLocalStorage(): LocalCategory[] {
  try {
    const raw = localStorage.getItem(CAT_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: any) => ({
      id: String(c.id ?? c._id ?? c.slug ?? c.name),
      name: String(c.name ?? c.title ?? c.label ?? c.id),
    }));
  } catch (err) {
    console.warn("getCategoriesFromLocalStorage error", err);
    return [];
  }
}

export function setCategoriesToLocalStorage(categories: LocalCategory[]) {
  try {
    localStorage.setItem(CAT_LS_KEY, JSON.stringify(categories));
    // phát event custom để cập nhật trong cùng tab
    window.dispatchEvent(new CustomEvent("categoriesUpdated", { detail: { action: "set", categories } }));
  } catch (err) {
    console.warn("setCategoriesToLocalStorage error", err);
  }
}

export function addCategoryToLocalStorage(cat: { id?: string; _id?: string; name: string }) {
  try {
    const list = getCategoriesFromLocalStorage();
    const id = String(cat._id ?? cat.id ?? cat.name ?? Date.now());
    const name = String(cat.name);
    const exists = list.find((c) => c.id === id || c.name === name);
    if (!exists) {
      list.push({ id, name });
      setCategoriesToLocalStorage(list);
      window.dispatchEvent(new CustomEvent("categoriesUpdated", { detail: { action: "add", category: { id, name } } }));
    }
  } catch (err) {
    console.warn("addCategoryToLocalStorage error", err);
  }
}

export function removeCategoryFromLocalStorage(idOrName: string) {
  try {
    const list = getCategoriesFromLocalStorage();
    const newList = list.filter((c) => c.id !== String(idOrName) && c.name !== String(idOrName));
    setCategoriesToLocalStorage(newList);
    window.dispatchEvent(new CustomEvent("categoriesUpdated", { detail: { action: "remove", id: String(idOrName) } }));
  } catch (err) {
    console.warn("removeCategoryFromLocalStorage error", err);
  }
}

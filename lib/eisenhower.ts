export type MatrixQuadrant = "0. 🤪 For Funsies" | "1. 🔥 Do First" | "2. 👉 Do Fast" | "3. 🗓️ Do ASAP" | "4. 🗑️ ONLY for fun";

export function calculateQuadrant(isForFunsies: boolean, isUrgent: boolean, isImportant: boolean): MatrixQuadrant {
  if (isForFunsies) return "0. 🤪 For Funsies";
  if (isUrgent && isImportant) return "1. 🔥 Do First";
  if (isUrgent) return "2. 👉 Do Fast";
  if (isImportant) return "3. 🗓️ Do ASAP";
  return "4. 🗑️ ONLY for fun";
}
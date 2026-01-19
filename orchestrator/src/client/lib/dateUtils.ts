export const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return null;
  try {
    const normalized = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return null;
  try {
    const normalized = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    const date = parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const time = parsed.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date} ${time}`;
  } catch {
    return dateStr;
  }
};

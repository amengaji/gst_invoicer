export const formatNumber = (value, format = "IN") => {
  if (value == null || value === "") return "0";

  const num = Number(value);
  if (isNaN(num)) return value;

  const locale = format === "US" ? "en-US" : "en-IN";

  return num.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

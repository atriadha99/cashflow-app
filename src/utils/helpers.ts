// src/utils/helpers.ts

export const formatRupiah = (num: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
};

export const parseAmount = (val: string): number => {
  if (!val) return 0;
  const clean = val.replace(/[^0-9-]/g, "");
  const num = Number(clean);
  return isNaN(num) ? 0 : num;
};

export const detectCategory = (text: string): string => {
  const s = text.toLowerCase();
  if (s.includes("ayam") || s.includes("nasi") || s.includes("kopi") || s.includes("makan")) return "Makan";
  if (s.includes("gojek") || s.includes("grab") || s.includes("bensin") || s.includes("parkir")) return "Transport";
  if (s.includes("token") || s.includes("listrik") || s.includes("air") || s.includes("wifi")) return "Tagihan";
  if (s.includes("gaji") || s.includes("bonus") || s.includes("thr")) return "Gaji";
  if (s.includes("indomaret") || s.includes("alfamart") || s.includes("superindo")) return "Belanja";
  return "Lainnya";
};

export const calculateForecast = (transactions: any[]) => {
  if (transactions.length === 0) return { dailyAvg: 0, nextMonthPrediction: 0 };
  const expenses = transactions.filter(t => t.amount < 0);
  const totalExpense = expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const today = new Date().getDate();
  const dailyAvg = totalExpense / (today || 1);
  return { dailyAvg, nextMonthPrediction: dailyAvg * 30 };
};

// Helper baru untuk konversi file
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1]; 
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
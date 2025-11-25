// src/lib/whatsapp.ts
export async function sendWhatsAppNotification(phone: string, message: string) {
  const formData = new FormData();
  formData.append('target', phone);
  formData.append('message', message);
  
  try {
    await fetch('[https://api.fonnte.com/send](https://api.fonnte.com/send)', {
      method: 'POST',
      headers: {
        Authorization: process.env.FONNTE_TOKEN!,
      },
      body: formData,
    });
  } catch (error) {
    console.error("Gagal kirim WA", error);
  }
}
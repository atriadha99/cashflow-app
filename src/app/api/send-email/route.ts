import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, fileBase64, fileName, period } = await req.json();

    if (!email || !fileBase64) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Kirim Email via Resend
    const { data, error } = await resend.emails.send({
      from: 'TemuCashflow <onboarding@resend.dev>', // Gunakan domain default Resend dulu (gratis)
      to: [email], // Kirim ke email user
      subject: `Laporan Keuangan - ${period}`,
      html: `
        <h1>Halo! 👋</h1>
        <p>Berikut adalah laporan keuangan Anda untuk periode <strong>${period}</strong>.</p>
        <p>Silakan unduh lampiran di bawah ini.</p>
        <br/>
        <p><em>Terima kasih telah menggunakan TemuCashflow.</em></p>
      `,
      attachments: [
        {
          content: fileBase64,
          filename: fileName,
        },
      ],
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Email berhasil dikirim!", data });

  } catch (err: any) {
    console.error("Server Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, roomType, style, packageType } = body;

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'perchekliialexei@gmail.com',
      subject: `Новая заявка от ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #7c3aed;">Новая заявка — Interior AI Studio</h2>
          <p><b>Имя:</b> ${name}</p>
          <p><b>Email клиента:</b> ${email}</p>
          <p><b>Тип комнаты:</b> ${roomType}</p>
          <p><b>Стиль:</b> ${style}</p>
          <p><b>Пакет:</b> ${packageType}</p>
        </div>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}
import { getAccessToken } from './workspaceAuth';

export async function sendEmailViaGmail(to: string, subject: string, bodyText: string, providedToken?: string) {
  let token = providedToken || (await getAccessToken());
  
  if (!token) {
    throw new Error("메일 발송을 위해서는 Google 계정 연동 및 권한 승인이 필요합니다.");
  }

  // Properly encode the subject for non-ASCII characters
  const encodedSubject = btoa(unescape(encodeURIComponent(subject)));

  const emailLines = [
    `To: ${to}`,
    'Content-type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${encodedSubject}?=`,
    '',
    bodyText,
  ];

  const emailRaw = emailLines.join('\r\n');
  
  // Base64URL encode the email payload
  const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailRaw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64EncodedEmail,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Failed to send email:', errorData);
    throw new Error(`${response.status}: ${errorData.error?.message || '발송 실패'}`);
  }

  return response.json();
}

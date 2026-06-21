import { getAccessToken, googleSignIn } from '../lib/workspaceAuth';
import { sendEmailViaGmail } from '../lib/gmailApi';

export interface EmailTarget {
  email: string;
  name: string;
  [key: string]: any;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export class EmailOrchestrator {
  private static token: string | null = null;
  
  static async ensureAuthenticated(): Promise<string> {
    if (!this.token) {
        this.token = await getAccessToken();
    }
    
    if (!this.token) {
        const result = await googleSignIn();
        if (!result) throw new Error("Google 연동 실패");
        this.token = result.accessToken;
    }
    return this.token!;
  }
  
  static async sendBatch(
      targets: EmailTarget[], 
      templateFactory: (target: EmailTarget) => EmailTemplate,
      onProgress: (success: number, fail: number, total: number) => void
  ) {
    const token = await this.ensureAuthenticated();
    let success = 0;
    let fail = 0;
    
    for (const target of targets) {
        try {
            const {subject, body} = templateFactory(target);
            await sendEmailViaGmail(target.email, subject, body, token);
            success++;
        } catch (e) {
            fail++;
            console.error('Failed to send email to', target.email, e);
        }
        onProgress(success, fail, targets.length);
    }
  }
}

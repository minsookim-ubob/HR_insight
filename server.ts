import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to send email
  app.post("/api/send-update-email", async (req, res) => {
    const { to, url } = req.body;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Sales HR System" <hr@company.com>',
          to,
          subject: "개인 정보 업데이트 요청",
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px;">
                <h2 style="color: #6366F1;">개인 정보 업데이트 요청</h2>
                <p>안녕하세요,</p>
                <p>시스템에 등록된 귀하의 개인 정보를 최신 상태로 유지하기 위해 업데이트를 부탁드립니다.</p>
                <p>아래 버튼을 클릭하여 정보를 업데이트해 주세요.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">업데이트 페이지 접속</a>
                </div>
                <p>감사합니다.</p>
            </div>
          `,
        });
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: "Email failed" });
    }
  });

  // API to generate HR Insight using Gemini
  app.post("/api/gemini/generate-hr-insight", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set." });
      }

      const { promptData } = req.body;
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `
당신은 HR 전문가입니다. 아래의 데이터를 바탕으로 MASTER 권한자에게 보낼 '일일 HR 인사이트' 메일 내용을 2000자 이하로 작성해주세요.
[요청 조건]
1. 다면진단, 자가진단, KPI 승인 요청 등 액션이 있는 경우 누가 어떤 액션을 했는지 카테고리별 정리
2. 면담기록에서 다음날 예약이 있거나, TO DO LIST 등 D-DAY가 다가올 경우 누가/무엇을/언제까지 하기로 했는지, 그리고 어떻게 역량 가이드/코칭하면 좋을지 조언
3. 이상 징후 (예: KPI 진척률 미진 등)가 포착된 인원의 경우 누가 어떤 상황인지, 누구에게 어떤 가이드/코칭을 하면 좋을지 조언

[데이터 요약 패턴]
${JSON.stringify(promptData, null, 2)}

위 데이터를 자연스럽고 전문적인 리포트 형태로 작성해주세요.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API to analyze survey result
  app.post("/api/gemini/analyze-survey", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set." });
      }

      const { data, type, name } = req.body;
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `
당신은 인사 평가 전문가(HR 전문 AI)입니다. 다음 데이터는 ${name}의 ${type === 'individual' ? '개인 평가 결과' : '평가 평균 데이터'}입니다.

[요청사항]
1. 위 데이터 기반으로 최고 강점 1개와 보완점 1개를 도출하세요.
2. 결과에 대한 AI 종합 코칭/인사이트를 제공해 리더상(본부장 등)이 조직 관리에 참고할 수 있게 작성해주세요.
3. 결과를 명확하게 HTML (div, p, ul, li 태그 이용, 클래스 포함 금지) 형태의 구조화된 텍스트로만 응답하세요. 백틱이나 마크다운 코드 블록(\`\`\`html)은 응답에 포함하지 마세요.
4. 분량은 500자 내외로 작성하세요.

[데이터]
${JSON.stringify(data, null, 2)}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      // Remove markdown codeblock artifacts if any
      const cleanedHTML = response.text?.replace(/```html/g, '').replace(/```/g, '') || '';
      
      res.json({ text: cleanedHTML.trim() });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

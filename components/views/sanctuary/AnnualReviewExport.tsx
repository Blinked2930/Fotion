"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Download, FileText } from "lucide-react";

export function AnnualReviewExport({
  periodKey,
  sessionId,
}: {
  periodKey: string;
  sessionId?: string;
}) {
  const data = useQuery(api.annual.getAnnualReviewData, { periodKey, sessionId });

  const handleExportMarkdown = () => {
    if (!data?.review || !data?.template) return;

    const lines: string[] = [];
    lines.push(`# Annual Review — ${periodKey}`);
    lines.push("");

    for (const section of data.template.sections) {
      lines.push(`## ${section.title}`);
      lines.push("");
      for (const prompt of section.prompts) {
        const answer = data.answers.find(a => a.promptId === prompt.id);
        lines.push(`### ${prompt.text}`);
        lines.push("");
        const text = (answer?.text ?? "")
          .replace(/<\/(p|div|h[1-6])>/gi, "\n")
          .replace(/<li>/gi, "- ")
          .replace(/<[^>]*>?/gm, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .trim();
        lines.push(text || "_(no answer)_");
        lines.push("");
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fotion-annual-${periodKey}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!data?.review || !data?.template) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Annual Review — ${periodKey}</title>
          <style>
            body { font-family: Georgia, serif; max-width: 42rem; margin: 2rem auto; padding: 0 2rem; line-height: 1.6; color: #1a1a1a; }
            h1 { font-size: 2rem; margin-top: 3rem; }
            h2 { font-size: 1.4rem; margin-top: 2.5rem; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.5rem; }
            h3 { font-size: 1.05rem; margin-top: 1.8rem; color: #444; font-style: italic; font-weight: normal; }
            p { margin: 0.5rem 0 1rem 0; }
            @media print { body { max-width: none; margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Annual Review — ${periodKey}</h1>
          ${data.template.sections.map(section => `
            <h2>${section.title}</h2>
            ${section.prompts.map(prompt => {
              const answer = data.answers.find(a => a.promptId === prompt.id);
              return `<h3>${prompt.text}</h3>${answer?.text ?? "<p><em>(no answer)</em></p>"}`;
            }).join("")}
          `).join("")}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportMarkdown}
        className="flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-2 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-white dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
      >
        <Download className="h-3.5 w-3.5" /> Markdown
      </button>
      <button
        onClick={handleExportPdf}
        className="flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-2 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-white dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
      >
        <FileText className="h-3.5 w-3.5" /> PDF
      </button>
    </div>
  );
}
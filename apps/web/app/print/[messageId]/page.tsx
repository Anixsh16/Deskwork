"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, FileDown } from "lucide-react";
import { toast } from "sonner";
import { api, download } from "@/lib/api";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/primitives";
import { ErrorNotice } from "@/components/feature-controls";
type Printable = {
  id: string;
  content: string;
  title: string;
  bot: string;
  chat_id: string;
  course_id: string;
  course_name: string;
};
export default function PrintDocument() {
  const { messageId } = useParams<{ messageId: string }>();
  const q = useQuery({
    queryKey: ["print-document", messageId],
    queryFn: () => api<Printable>(`/messages/${messageId}/document`),
  });
  const back = q.data
    ? `/courses/${q.data.course_id}/${q.data.bot}?chat=${q.data.chat_id}`
    : "/dashboard";
  return (
    <main className="print-page min-h-screen bg-white p-5 sm:p-8">
      <div className="print-controls mx-auto mb-7 flex max-w-4xl flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <Link
          href={back}
          className="inline-flex items-center gap-2 text-sm text-brand"
        >
          <ArrowLeft className="size-4" />
          Back to conversation
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!q.data}
            icon={<FileDown className="size-4" />}
            onClick={() =>
              download(`/messages/${messageId}/docx`, "deskwork.docx").catch(
                (e) => toast.error(e.message),
              )
            }
          >
            Word
          </Button>
          <Button
            disabled={!q.data}
            icon={<Printer className="size-4" />}
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </Button>
        </div>
        <p className="w-full text-sm text-muted">
          {q.data?.course_name || "Print preview"} · Select Save as PDF in your
          browser’s print window.
        </p>
      </div>
      <ErrorNotice error={q.error} />
      {q.isLoading ? (
        <Spinner />
      ) : (
        q.data && (
          <article className="print-sheet mx-auto max-w-4xl">
            <Markdown>{q.data.content}</Markdown>
          </article>
        )
      )}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 16mm;
        }
        @media print {
          body,
          .print-page {
            background: white !important;
          }
          .print-controls,
          [data-sonner-toaster] {
            display: none !important;
          }
          .print-page {
            padding: 0 !important;
            min-height: 0 !important;
          }
          .print-sheet {
            max-width: none !important;
          }
          .print-sheet .doc {
            font-size: 11pt;
            line-height: 1.5;
            color: #111;
          }
          .print-sheet .doc h1,
          .print-sheet .doc h2,
          .print-sheet .doc h3 {
            break-after: avoid;
          }
          .print-sheet .doc table {
            width: 100%;
            max-width: 100%;
            font-size: 9pt;
          }
          .print-sheet .doc tr {
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}

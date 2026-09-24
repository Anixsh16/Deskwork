"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { SlideUploader } from "@/components/slide-uploader";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Course } from "@/lib/types";

export function CreateCourseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const empty = { name: "", code: "", semester: "", institution: "", description: "", outcomes: "" };
  const [form, setForm] = useState(empty);
  const [course, setCourse] = useState<Course | null>(null);

  const create = useMutation({
    mutationFn: () => api<Course>("/courses", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: (c) => {
      setCourse(c);
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setTimeout(() => {
        setCourse(null);
        setForm(empty);
      }, 250);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (course) {
    return (
      <Dialog
        open={open}
        onOpenChange={close}
        title="Add lecture slides"
        description={`Upload the slides for ${course.name}. Deskwork reads them so the chatbots can generate from your own material.`}
        className="max-w-xl"
      >
        <SlideUploader courseId={course.id} />
        <div className="mt-6 flex justify-end gap-2">
          <Button
            icon={<ArrowRight className="size-4" />}
            onClick={() => {
              close(false);
              router.push(`/courses/${course.id}`);
            }}
          >
            Open course
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={close} title="Create a course" description="Add your course details. You can upload slides in the next step.">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Field label="Course name" htmlFor="c-name">
          <Input id="c-name" required minLength={2} autoFocus value={form.name} onChange={set("name")} placeholder="Computer Networks & Internet of Things" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Course code" htmlFor="c-code">
            <Input id="c-code" value={form.code} onChange={set("code")} placeholder="18B11CS311" />
          </Field>
          <Field label="Semester" htmlFor="c-sem">
            <Input id="c-sem" value={form.semester} onChange={set("semester")} placeholder="Even 2026" />
          </Field>
        </div>
        <Field label="Institution (optional)" htmlFor="c-inst" hint="Printed on generated question papers.">
          <Input id="c-inst" value={form.institution} onChange={set("institution")} placeholder="Jaypee Institute of Information Technology, Noida" />
        </Field>
        <Field label="Description (optional)" htmlFor="c-desc">
          <Textarea id="c-desc" rows={2} value={form.description} onChange={set("description")} placeholder="B.Tech 6th semester core course" />
        </Field>
        <Field label="Course outcomes (optional)" htmlFor="c-co" hint="One per line, e.g. CO1: ... They are used when generating question papers.">
          <Textarea id="c-co" rows={3} value={form.outcomes} onChange={set("outcomes")} placeholder="CO1: Defining the basics of networking..." />
        </Field>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending} disabled={form.name.trim().length < 2}>
            Create course
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

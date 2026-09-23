import { redirect } from "next/navigation";

export default function ExamsRedirectPage() {
  redirect("/dashboard#recent-exams");
}

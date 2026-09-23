import { redirect } from "next/navigation";

export default function CoursesRedirectPage() {
  redirect("/dashboard#courses");
}

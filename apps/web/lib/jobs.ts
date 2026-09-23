import { SupabaseClient } from "@supabase/supabase-js";
import { Job, JobKind } from "./types";

export async function enqueueJob(
  supabase: SupabaseClient,
  kind: JobKind,
  payload: Record<string, unknown>
): Promise<Job> {
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      kind,
      payload,
      status: "queued"
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to enqueue ${kind} job: ${error.message}`);
  }

  return data as Job;
}

export async function getJob(
  supabase: SupabaseClient,
  jobId: number
): Promise<Job | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch job ${jobId}: ${error.message}`);
  }

  return data as Job;
}

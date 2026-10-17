-- Maximum late window (minutes) for programs and attendance records.
-- After class_start_time + max_late_minutes, attendance can no longer be edited.

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS max_late_minutes INTEGER NOT NULL DEFAULT 60
  CHECK (max_late_minutes > 0);

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS max_late_minutes INTEGER NOT NULL DEFAULT 60
  CHECK (max_late_minutes > 0);

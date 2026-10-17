-- Attendance System Database Schema for Supabase
-- This schema supports user-based data isolation and multi-device sync

-- Note: JWT secret is managed automatically by Supabase
-- No need to set it manually in hosted environment

-- Create custom types
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent');
CREATE TYPE member_type AS ENUM ('Regular', 'Extension', 'Distant');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'teacher',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table
CREATE TABLE public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members/Students table
CREATE TABLE public.members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    type member_type NOT NULL DEFAULT 'Regular',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Programs table
CREATE TABLE public.programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    max_late_minutes INTEGER NOT NULL DEFAULT 60 CHECK (max_late_minutes > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Program enrollments (many-to-many relationship)
CREATE TABLE public.program_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, member_id)
);

-- Attendance records table
CREATE TABLE public.attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    class_start_time TIME NOT NULL,
    max_late_minutes INTEGER NOT NULL DEFAULT 60 CHECK (max_late_minutes > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual attendance entries
CREATE TABLE public.attendance_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attendance_record_id UUID REFERENCES public.attendance_records(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    status attendance_status NOT NULL,
    arrival_time TIME,
    is_late BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attendance_record_id, member_id)
);

-- Create indexes for better performance
CREATE INDEX idx_classes_user_id ON public.classes(user_id);
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_class_id ON public.members(class_id);
CREATE INDEX idx_members_type ON public.members(type);
CREATE INDEX idx_programs_user_id ON public.programs(user_id);
CREATE INDEX idx_program_enrollments_program_id ON public.program_enrollments(program_id);
CREATE INDEX idx_program_enrollments_member_id ON public.program_enrollments(member_id);
CREATE INDEX idx_attendance_records_user_id ON public.attendance_records(user_id);
CREATE INDEX idx_attendance_records_program_id ON public.attendance_records(program_id);
CREATE INDEX idx_attendance_records_date ON public.attendance_records(date);
CREATE INDEX idx_attendance_entries_record_id ON public.attendance_entries(attendance_record_id);
CREATE INDEX idx_attendance_entries_member_id ON public.attendance_entries(member_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Classes policies
CREATE POLICY "Users can manage own classes" ON public.classes
    FOR ALL USING (auth.uid() = user_id);

-- Members policies
CREATE POLICY "Users can manage own members" ON public.members
    FOR ALL USING (auth.uid() = user_id);

-- Programs policies
CREATE POLICY "Users can manage own programs" ON public.programs
    FOR ALL USING (auth.uid() = user_id);

-- Program enrollments policies
CREATE POLICY "Users can manage own program enrollments" ON public.program_enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.programs 
            WHERE programs.id = program_enrollments.program_id 
            AND programs.user_id = auth.uid()
        )
    );

-- Attendance records policies
CREATE POLICY "Users can manage own attendance records" ON public.attendance_records
    FOR ALL USING (auth.uid() = user_id);

-- Attendance entries policies
CREATE POLICY "Users can manage own attendance entries" ON public.attendance_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.attendance_records 
            WHERE attendance_records.id = attendance_entries.attendance_record_id 
            AND attendance_records.user_id = auth.uid()
        )
    );

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_programs_updated_at
    BEFORE UPDATE ON public.programs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_attendance_entries_updated_at
    BEFORE UPDATE ON public.attendance_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create helpful views
CREATE VIEW public.members_with_class AS
SELECT 
    m.*,
    c.name as class_name
FROM public.members m
LEFT JOIN public.classes c ON m.class_id = c.id;

CREATE VIEW public.program_members AS
SELECT 
    p.id as program_id,
    p.name as program_name,
    p.user_id,
    m.id as member_id,
    m.first_name,
    m.last_name,
    m.type as member_type,
    c.name as class_name
FROM public.programs p
JOIN public.program_enrollments pe ON p.id = pe.program_id
JOIN public.members m ON pe.member_id = m.id
LEFT JOIN public.classes c ON m.class_id = c.id;

CREATE VIEW public.attendance_summary AS
SELECT 
    ar.id as record_id,
    ar.date,
    ar.class_start_time,
    p.name as program_name,
    COUNT(ae.id) as total_students,
    COUNT(CASE WHEN ae.status = 'Present' THEN 1 END) as present_count,
    COUNT(CASE WHEN ae.status = 'Absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN ae.is_late = true THEN 1 END) as late_count
FROM public.attendance_records ar
JOIN public.programs p ON ar.program_id = p.id
LEFT JOIN public.attendance_entries ae ON ar.id = ae.attendance_record_id
GROUP BY ar.id, ar.date, ar.class_start_time, p.name;

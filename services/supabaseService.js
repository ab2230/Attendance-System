import { supabase } from '../supabase-client';

class SupabaseService {
  // Check if supabase is properly initialized
  _checkSupabaseConnection() {
    if (!supabase || !supabase.supabaseUrl || supabase.supabaseUrl === 'YOUR_SUPABASE_URL_HERE') {
      throw new Error('Supabase is not properly configured. Please check your environment variables.');
    }
  }
  // Authentication methods
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signUp(email, password, firstName, lastName) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });
      
      if (error) throw error;
      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getCurrentSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Get current session error:', error);
      return null;
    }
  }

  // Profile methods
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Classes methods
  async getClasses() {
    try {
      this._checkSupabaseConnection();
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get classes error:', error);
      throw error;
    }
  }

  async addClass(name) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('classes')
        .insert([{ name, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Add class error:', error);
      throw error;
    }
  }

  async updateClass(id, updates) {
    try {
      const { data, error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update class error:', error);
      throw error;
    }
  }

  async deleteClass(id) {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Delete class error:', error);
      throw error;
    }
  }

  // Members methods
  async getMembers() {
    try {
      const { data, error } = await supabase
        .from('members_with_class')
        .select('*')
        .order('first_name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get members error:', error);
      throw error;
    }
  }

  async addMember(firstName, lastName, classId, type = 'Regular') {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('members')
        .insert([{
          first_name: firstName,
          last_name: lastName,
          class_id: classId,
          type: type || 'Regular',
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Add member error:', error);
      throw error;
    }
  }

  async updateMember(id, updates) {
    try {
      const { data, error } = await supabase
        .from('members')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          class_id: updates.classId,
          type: updates.type || 'Regular',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update member error:', error);
      throw error;
    }
  }

  async deleteMember(id) {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Delete member error:', error);
      throw error;
    }
  }

  // Programs methods
  async getPrograms() {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get programs error:', error);
      throw error;
    }
  }

  async addProgram(name, maxLateMinutes = 60) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('programs')
        .insert([{
          name,
          max_late_minutes: Number(maxLateMinutes) || 60,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Add program error:', error);
      throw error;
    }
  }

  async updateProgram(id, updates) {
    try {
      const payload = {};
      if (updates.name != null) payload.name = updates.name;
      if (updates.maxLateMinutes != null || updates.max_late_minutes != null) {
        payload.max_late_minutes =
          Number(updates.maxLateMinutes ?? updates.max_late_minutes) || 60;
      }

      const { data, error } = await supabase
        .from('programs')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update program error:', error);
      throw error;
    }
  }

  async deleteProgram(id) {
    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Delete program error:', error);
      throw error;
    }
  }

  // Program enrollment methods
  async getProgramEnrollments(programId) {
    try {
      const { data, error } = await supabase
        .from('program_members')
        .select('*')
        .eq('program_id', programId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get program enrollments error:', error);
      throw error;
    }
  }

  async enrollStudents(programId, memberIds) {
    try {
      // First, remove existing enrollments
      await supabase
        .from('program_enrollments')
        .delete()
        .eq('program_id', programId);

      // Then add new enrollments
      const enrollments = memberIds.map(memberId => ({
        program_id: programId,
        member_id: memberId
      }));

      const { data, error } = await supabase
        .from('program_enrollments')
        .insert(enrollments)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Enroll students error:', error);
      throw error;
    }
  }

  async unenrollStudent(programId, memberId) {
    try {
      const { error } = await supabase
        .from('program_enrollments')
        .delete()
        .eq('program_id', programId)
        .eq('member_id', memberId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Unenroll student error:', error);
      throw error;
    }
  }

  // Attendance methods
  async getAttendanceRecords() {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          programs (name),
          attendance_entries (
            *,
            members (first_name, last_name, class_id)
          )
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get attendance records error:', error);
      throw error;
    }
  }

  async saveAttendanceRecord(attendanceData) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Create attendance record
      const { data: record, error: recordError } = await supabase
        .from('attendance_records')
        .insert([{
          user_id: user.id,
          program_id: attendanceData.programId,
          date: new Date(attendanceData.date).toISOString().split('T')[0],
          class_start_time: attendanceData.classStartTime,
          max_late_minutes: Number(attendanceData.maxLateMinutes) || 60,
        }])
        .select()
        .single();

      if (recordError) throw recordError;

      // Create attendance entries
      const entries = attendanceData.members.map(member => ({
        attendance_record_id: record.id,
        member_id: member.memberId,
        status: member.status,
        arrival_time: member.arrivalTime,
        is_late: member.isLate
      }));

      const { data: entriesData, error: entriesError } = await supabase
        .from('attendance_entries')
        .insert(entries)
        .select();

      if (entriesError) throw entriesError;

      return { record, entries: entriesData };
    } catch (error) {
      console.error('Save attendance record error:', error);
      throw error;
    }
  }

  async updateAttendanceRecord(recordId, attendanceData) {
    try {
      // Update attendance record
      const { data: record, error: recordError } = await supabase
        .from('attendance_records')
        .update({
          date: new Date(attendanceData.date).toISOString().split('T')[0],
          class_start_time: attendanceData.classStartTime,
          ...(attendanceData.maxLateMinutes != null
            ? { max_late_minutes: Number(attendanceData.maxLateMinutes) || 60 }
            : {}),
        })
        .eq('id', recordId)
        .select()
        .single();

      if (recordError) throw recordError;

      // Delete existing entries
      await supabase
        .from('attendance_entries')
        .delete()
        .eq('attendance_record_id', recordId);

      // Create new entries
      const entries = attendanceData.members.map(member => ({
        attendance_record_id: recordId,
        member_id: member.memberId,
        status: member.status,
        arrival_time: member.arrivalTime,
        is_late: member.isLate
      }));

      const { data: entriesData, error: entriesError } = await supabase
        .from('attendance_entries')
        .insert(entries)
        .select();

      if (entriesError) throw entriesError;

      return { record, entries: entriesData };
    } catch (error) {
      console.error('Update attendance record error:', error);
      throw error;
    }
  }

  async deleteAttendanceRecord(recordId) {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', recordId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Delete attendance record error:', error);
      throw error;
    }
  }

  generateRoomOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async createAttendanceRoom(programId, minuteLimit) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const limit = Number(minuteLimit);
      if (!limit || limit <= 0) {
        throw new Error('Minute limit must be greater than zero');
      }

      const enrollments = await this.getProgramEnrollments(programId);
      if (!enrollments.length) {
        throw new Error('No students enrolled in this program');
      }

      const { data: programRow, error: programError } = await supabase
        .from('programs')
        .select('max_late_minutes')
        .eq('id', programId)
        .single();

      if (programError) throw programError;

      const now = new Date();
      const classStartTime = now.toTimeString().slice(0, 8);
      const members = enrollments.map((e) => ({
        memberId: e.member_id,
        status: 'Absent',
        arrivalTime: null,
        isLate: false,
      }));

      const { record } = await this.saveAttendanceRecord({
        programId,
        date: now,
        classStartTime,
        maxLateMinutes: programRow?.max_late_minutes ?? 60,
        members,
      });

      const otpCode = this.generateRoomOtp();
      const expiresAt = new Date(now.getTime() + limit * 60 * 1000).toISOString();

      await supabase
        .from('attendance_rooms')
        .update({ expires_at: now.toISOString() })
        .eq('program_id', programId)
        .gt('expires_at', now.toISOString());

      const { data: room, error: roomError } = await supabase
        .from('attendance_rooms')
        .insert([
          {
            user_id: user.id,
            program_id: programId,
            attendance_record_id: record.id,
            otp_code: otpCode,
            minute_limit: limit,
            expires_at: expiresAt,
          },
        ])
        .select('*, programs(name)')
        .single();

      if (roomError) throw roomError;

      return {
        ...room,
        otpCode,
      };
    } catch (error) {
      console.error('Create attendance room error:', error);
      throw error;
    }
  }

  async getActiveAttendanceRooms() {
    try {
      const { data, error } = await supabase
        .from('attendance_rooms')
        .select('*, programs(name)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get active attendance rooms error:', error);
      throw error;
    }
  }

  async getAttendanceRoomCheckIns(attendanceRecordId) {
    try {
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('member_id, status, arrival_time, members(first_name, last_name)')
        .eq('attendance_record_id', attendanceRecordId)
        .eq('status', 'Present');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get attendance room check-ins error:', error);
      throw error;
    }
  }

  async getAttendanceRoomEntries(attendanceRecordId) {
    try {
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('id, member_id, status, arrival_time, is_late, members(first_name, last_name)')
        .eq('attendance_record_id', attendanceRecordId)
        .order('status', { ascending: true });

      if (error) throw error;
      const rows = data || [];
      return rows.sort((a, b) => {
        const nameA = `${a.members?.first_name || ''} ${a.members?.last_name || ''}`.trim();
        const nameB = `${b.members?.first_name || ''} ${b.members?.last_name || ''}`.trim();
        return nameA.localeCompare(nameB);
      });
    } catch (error) {
      console.error('Get attendance room entries error:', error);
      throw error;
    }
  }

  // Utility methods
  async syncLocalDataToSupabase(localData) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Sync classes
      if (localData.classes && localData.classes.length > 0) {
        for (const cls of localData.classes) {
          await this.addClass(cls.name);
        }
      }

      // Sync members
      if (localData.members && localData.members.length > 0) {
        const classes = await this.getClasses();
        for (const member of localData.members) {
          const matchingClass = classes.find(c => c.name === member.className);
          await this.addMember(
            member.firstName,
            member.lastName,
            matchingClass?.id || null,
            member.type || 'Regular'
          );
        }
      }

      // Sync programs
      if (localData.programs && localData.programs.length > 0) {
        for (const program of localData.programs) {
          await this.addProgram(program.name);
        }
      }

      // Sync attendance records
      if (localData.attendanceRecords && localData.attendanceRecords.length > 0) {
        const programs = await this.getPrograms();
        const members = await this.getMembers();
        
        for (const record of localData.attendanceRecords) {
          const matchingProgram = programs.find(p => p.name === record.programName);
          if (matchingProgram) {
            const mappedMembers = record.members.map(member => {
              const matchingMember = members.find(m => 
                m.first_name === member.firstName && m.last_name === member.lastName
              );
              return {
                memberId: matchingMember?.id,
                status: member.status,
                arrivalTime: member.arrivalTime,
                isLate: member.isLate
              };
            }).filter(m => m.memberId);

            await this.saveAttendanceRecord({
              programId: matchingProgram.id,
              date: record.date,
              classStartTime: record.classStartTime,
              members: mappedMembers
            });
          }
        }
      }

      return { success: true, message: 'Data synced successfully' };
    } catch (error) {
      console.error('Sync local data error:', error);
      throw error;
    }
  }

  // Real-time subscriptions
  subscribeToChanges(table, callback) {
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe();
  }

  unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }
}

export default new SupabaseService();

import React, { createContext, useState, useEffect } from "react";
import supabaseService from "../../services/supabaseService";

export const AttendanceContext = createContext();

// AttendanceContext.js
export const AttendanceProvider = ({ children }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAttendanceRecords();
  }, []);

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await supabaseService.getAttendanceRecords();
      
      // Transform Supabase data to match existing app structure
      const transformedRecords = records.map(record => ({
        id: record.id,
        date: record.date,
        programId: record.program_id,
        programName: record.programs?.name || 'Unknown Program',
        classStartTime: record.class_start_time,
        maxLateMinutes: record.max_late_minutes ?? 60,
        members: record.attendance_entries?.map(entry => ({
          memberId: entry.member_id,
          firstName: entry.members?.first_name || '',
          lastName: entry.members?.last_name || '',
          status: entry.status,
          classId: entry.members?.class_id,
          arrivalTime: entry.arrival_time,
          isLate: entry.is_late
        })) || []
      }));
      
      setAttendanceRecords(transformedRecords);
    } catch (error) {
      console.error("Error loading attendance records:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (newRecord) => {
    try {
      setLoading(true);
      setError(null);
      
      // Transform app data to Supabase format
      const supabaseRecord = {
        programId: newRecord.programId,
        date: newRecord.date,
        classStartTime: newRecord.classStartTime,
        maxLateMinutes: Number(newRecord.maxLateMinutes) || 60,
        members: newRecord.members.map(member => ({
          memberId: member.memberId,
          status: member.status,
          arrivalTime: member.arrivalTime,
          isLate: member.isLate
        }))
      };
      
      await supabaseService.saveAttendanceRecord(supabaseRecord);
      await loadAttendanceRecords(); // Reload to get updated data
    } catch (error) {
      console.error("Error marking attendance:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = async (updatedRecord) => {
    try {
      setLoading(true);
      setError(null);
      
      // Transform app data to Supabase format
      const supabaseRecord = {
        date: updatedRecord.date,
        classStartTime: updatedRecord.classStartTime,
        maxLateMinutes: Number(updatedRecord.maxLateMinutes) || 60,
        members: updatedRecord.members.map(member => ({
          memberId: member.memberId,
          status: member.status,
          arrivalTime: member.arrivalTime,
          isLate: member.isLate
        }))
      };
      
      await supabaseService.updateAttendanceRecord(updatedRecord.id, supabaseRecord);
      await loadAttendanceRecords(); // Reload to get updated data
    } catch (error) {
      console.error("Error updating attendance:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteAttendance = async (recordToDelete) => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.deleteAttendanceRecord(recordToDelete.id);
      await loadAttendanceRecords(); // Reload to get updated data
    } catch (error) {
      console.error("Error deleting attendance:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if a student is late
  const isStudentLate = (arrivalTime, classStartTime) => {
    if (!arrivalTime || !classStartTime) return false;
    
    const arrival = new Date(`2000-01-01T${arrivalTime}`);
    const start = new Date(`2000-01-01T${classStartTime}`);
    
    return arrival > start;
  };

  // Helper function to get late students from a record
  const getLateStudents = (record, classStartTime = null) => {
    if (!record || !record.members) return [];
    
    const startTime = classStartTime || record.classStartTime;
    if (!startTime) return [];

    return record.members.filter(member => 
      member.status === 'Present' && 
      member.arrivalTime && 
      isStudentLate(member.arrivalTime, startTime)
    );
  };

  // Helper function to get on-time students from a record
  const getOnTimeStudents = (record, classStartTime = null) => {
    if (!record || !record.members) return [];
    
    const startTime = classStartTime || record.classStartTime;
    if (!startTime) return record.members.filter(m => m.status === 'Present');

    return record.members.filter(member => 
      member.status === 'Present' && 
      member.arrivalTime && 
      !isStudentLate(member.arrivalTime, startTime)
    );
  };

  // Helper function to calculate attendance statistics
  const getAttendanceStats = (record) => {
    if (!record || !record.members) return null;

    const total = record.members.length;
    const present = record.members.filter(m => m.status === 'Present').length;
    const absent = record.members.filter(m => m.status === 'Absent').length;
    const late = getLateStudents(record).length;
    const onTime = getOnTimeStudents(record).length;

    return {
      total,
      present,
      absent,
      late,
      onTime,
      presentPercentage: total > 0 ? Math.round((present / total) * 100) : 0,
      latePercentage: present > 0 ? Math.round((late / present) * 100) : 0,
    };
  };

  // Sync local data to Supabase (for migration)
  const syncLocalDataToSupabase = async (localData) => {
    try {
      setLoading(true);
      setError(null);
      await supabaseService.syncLocalDataToSupabase(localData);
      await loadAttendanceRecords(); // Reload after sync
      return { success: true, message: 'Data synced successfully' };
    } catch (error) {
      console.error("Error syncing local data:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AttendanceContext.Provider
      value={{ 
        attendanceRecords, 
        loading,
        error,
        markAttendance, 
        updateAttendance, 
        deleteAttendance,
        loadAttendanceRecords,
        syncLocalDataToSupabase,
        isStudentLate,
        getLateStudents,
        getOnTimeStudents,
        getAttendanceStats
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

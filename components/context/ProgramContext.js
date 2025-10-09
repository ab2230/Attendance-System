import React, { createContext, useState, useEffect } from "react";
import supabaseService from "../../services/supabaseService";

export const ProgramContext = createContext();

export const ProgramProvider = ({ children }) => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const programsData = await supabaseService.getPrograms();
      
      // Get enrollment data for each program
      const programsWithEnrollments = await Promise.all(
        programsData.map(async (program) => {
          try {
            const enrollments = await supabaseService.getProgramEnrollments(program.id);
            return {
              id: program.id,
              name: program.name,
              enrolledStudents: enrollments.map(e => e.member_id),
              created_at: program.created_at,
              updated_at: program.updated_at
            };
          } catch (error) {
            console.error(`Error loading enrollments for program ${program.id}:`, error);
            return {
              id: program.id,
              name: program.name,
              enrolledStudents: [],
              created_at: program.created_at,
              updated_at: program.updated_at
            };
          }
        })
      );
      
      setPrograms(programsWithEnrollments);
    } catch (error) {
      console.error("Error loading programs:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addProgram = async (newProgram) => {
    try {
      setLoading(true);
      setError(null);
      
      const programName = typeof newProgram === 'string' ? newProgram : newProgram.name;
      await supabaseService.addProgram(programName);
      await loadPrograms(); // Reload to get updated data
    } catch (error) {
      console.error("Error adding program:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProgram = async (updatedProgram) => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.updateProgram(updatedProgram.id, { name: updatedProgram.name });
      await loadPrograms(); // Reload to get updated data
    } catch (error) {
      console.error("Error updating program:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteProgram = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.deleteProgram(id);
      await loadPrograms(); // Reload to get updated data
    } catch (error) {
      console.error("Error deleting program:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const enrollStudents = async (programId, studentIds) => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.enrollStudents(programId, studentIds);
      await loadPrograms(); // Reload to get updated data
    } catch (error) {
      console.error("Error enrolling students:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const unenrollStudent = async (programId, studentId) => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.unenrollStudent(programId, studentId);
      await loadPrograms(); // Reload to get updated data
    } catch (error) {
      console.error("Error unenrolling student:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProgramContext.Provider value={{ 
      programs, 
      loading, 
      error, 
      addProgram, 
      updateProgram, 
      deleteProgram, 
      enrollStudents, 
      unenrollStudent, 
      loadPrograms 
    }}>
      {children}
    </ProgramContext.Provider>
  );
};
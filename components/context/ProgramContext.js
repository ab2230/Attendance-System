import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ProgramContext = createContext();

export const ProgramProvider = ({ children }) => {
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const storedPrograms = await AsyncStorage.getItem("programs");
      if (storedPrograms) setPrograms(JSON.parse(storedPrograms));
    } catch (error) {
      console.log("Error loading programs:", error);
    }
  };

  const addProgram = async (newProgram) => {
    const updatedPrograms = [...programs, newProgram];
    setPrograms(updatedPrograms);
    await AsyncStorage.setItem("programs", JSON.stringify(updatedPrograms));
  };

  const updateProgram = async (updatedProgram) => {
    const updatedPrograms = programs.map((program) =>
      program.id === updatedProgram.id ? updatedProgram : program
    );
    setPrograms(updatedPrograms);
    await AsyncStorage.setItem("programs", JSON.stringify(updatedPrograms));
  };

  const deleteProgram = async (id) => {
    const updatedPrograms = programs.filter((program) => program.id !== id);
    setPrograms(updatedPrograms);
    await AsyncStorage.setItem("programs", JSON.stringify(updatedPrograms));
  };

  const enrollStudents = async (programId, studentIds) => {
    const updatedPrograms = programs.map((program) =>
      program.id === programId ? { ...program, enrolledStudents: studentIds } : program
    );
    setPrograms(updatedPrograms);
    await AsyncStorage.setItem("programs", JSON.stringify(updatedPrograms));
  };
  const unenrollStudent = async (programId, studentId) => {
    const updatedPrograms = programs.map((program) =>
      program.id === programId
        ? { ...program, enrolledStudents: program.enrolledStudents.filter((id) => id !== studentId) }
        : program
    );
    setPrograms(updatedPrograms);
    await AsyncStorage.setItem("programs", JSON.stringify(updatedPrograms));
  };
  return (
    <ProgramContext.Provider value={{ programs, addProgram, updateProgram, deleteProgram, enrollStudents, unenrollStudent }}>
      {children}
    </ProgramContext.Provider>
  );
};
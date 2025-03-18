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

  return (
    <ProgramContext.Provider value={{ programs, addProgram }}>
      {children}
    </ProgramContext.Provider>
  );
};

import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ClassContext = createContext();

export const ClassProvider = ({ children }) => {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const storedClasses = await AsyncStorage.getItem("classes");
      if (storedClasses) {
        setClasses(JSON.parse(storedClasses));
      }
    } catch (error) {
      console.log("Error loading classes:", error);
    }
  };

  const addClass = async (newClass) => {
    const updatedClasses = [...classes, newClass];
    setClasses(updatedClasses);
    await AsyncStorage.setItem("classes", JSON.stringify(updatedClasses));
  };

  const updateClass = async (updatedClass) => {
    const updatedClasses = classes.map((cls) =>
      cls.id === updatedClass.id ? updatedClass : cls
    );
    setClasses(updatedClasses);
    await AsyncStorage.setItem("classes", JSON.stringify(updatedClasses));
  };

  const deleteClass = async (id) => {
    const updatedClasses = classes.filter((cls) => cls.id !== id);
    setClasses(updatedClasses);
    await AsyncStorage.setItem("classes", JSON.stringify(updatedClasses));
  };

  return (
    <ClassContext.Provider value={{ classes, addClass, updateClass, deleteClass }}>
      {children}
    </ClassContext.Provider>
  );
};
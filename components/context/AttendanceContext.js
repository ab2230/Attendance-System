import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AttendanceContext = createContext();

// AttendanceContext.js
export const AttendanceProvider = ({ children }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  useEffect(() => {
    loadAttendanceRecords();
  }, []);

  const loadAttendanceRecords = async () => {
    try {
      const storedRecords = await AsyncStorage.getItem("attendance");
      if (storedRecords) setAttendanceRecords(JSON.parse(storedRecords));
    } catch (error) {
      console.log("Error loading attendance records:", error);
    }
  };

  const markAttendance = async (newRecord) => {
    const updatedRecords = [...attendanceRecords, newRecord];
    setAttendanceRecords(updatedRecords);
    await AsyncStorage.setItem("attendance", JSON.stringify(updatedRecords));
  };

  const updateAttendance = async (updatedRecord) => {
    const updatedRecords = attendanceRecords.map((record) =>
      record.id === updatedRecord.id
        ? updatedRecord
        : record
    );
    setAttendanceRecords(updatedRecords);
    await AsyncStorage.setItem("attendance", JSON.stringify(updatedRecords));
  };

  const deleteAttendance = async (recordToDelete) => {
    const updatedRecords = attendanceRecords.filter(
      (record) => record.id !== recordToDelete.id
    );
    setAttendanceRecords(updatedRecords);
    await AsyncStorage.setItem("attendance", JSON.stringify(updatedRecords));
  };

  return (
    <AttendanceContext.Provider
      value={{ attendanceRecords, markAttendance, updateAttendance, deleteAttendance }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};
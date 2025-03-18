import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AttendanceContext = createContext();

export const AttendanceProvider = ({ children }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  useEffect(() => {
    loadAttendanceRecords();
  }, []);

  // Load attendance records from AsyncStorage
  const loadAttendanceRecords = async () => {
    try {
      const storedRecords = await AsyncStorage.getItem("attendance");
      if (storedRecords) setAttendanceRecords(JSON.parse(storedRecords));
    } catch (error) {
      console.log("Error loading attendance records:", error);
    }
  };

  // Add a new attendance record
  const markAttendance = async (newRecord) => {
    const updatedRecords = [...attendanceRecords, newRecord];
    setAttendanceRecords(updatedRecords);
    await AsyncStorage.setItem("attendance", JSON.stringify(updatedRecords));
  };

  // Update an existing attendance record
  const updateAttendance = async (updatedRecord) => {
    const updatedRecords = attendanceRecords.map((record) =>
      record.date === updatedRecord.date &&
      record.classId === updatedRecord.classId &&
      record.programId === updatedRecord.programId
        ? updatedRecord
        : record
    );
    setAttendanceRecords(updatedRecords);
    await AsyncStorage.setItem("attendance", JSON.stringify(updatedRecords));
  };

  return (
    <AttendanceContext.Provider
      value={{ attendanceRecords, markAttendance, updateAttendance }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};
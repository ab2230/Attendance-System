import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const MemberContext = createContext();

export const MemberProvider = ({ children }) => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const storedMembers = await AsyncStorage.getItem("members");
      if (storedMembers) {
        setMembers(JSON.parse(storedMembers));
      }
    } catch (error) {
      console.log("Error loading members:", error);
    }
  };

  const addMember = async (newMember) => {
    const updatedMembers = [...members, newMember];
    setMembers(updatedMembers);
    await AsyncStorage.setItem("members", JSON.stringify(updatedMembers));
  };

  const importMembers = async (newMembers) => {
    const updatedMembers = [...members, ...newMembers];
    setMembers(updatedMembers);
    await AsyncStorage.setItem("members", JSON.stringify(updatedMembers));
    return true;
  };

  const updateMember = async (updatedMember) => {
    const updatedMembers = members.map((m) =>
      m.id === updatedMember.id ? updatedMember : m
    );
    setMembers(updatedMembers);
    await AsyncStorage.setItem("members", JSON.stringify(updatedMembers));
  };

  const deleteMember = async (id) => {
    const updatedMembers = members.filter((m) => m.id !== id);
    setMembers(updatedMembers);
    await AsyncStorage.setItem("members", JSON.stringify(updatedMembers));
  };

  return (
    <MemberContext.Provider value={{ members, addMember, updateMember, deleteMember, importMembers, setMembers }}>
      {children}
    </MemberContext.Provider>
  );
};
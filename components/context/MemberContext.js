import React, { createContext, useState, useEffect } from "react";
import supabaseService from "../../services/supabaseService";

export const MemberContext = createContext();

export const MemberProvider = ({ children }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const membersData = await supabaseService.getMembers();
      
      // Transform Supabase data to match existing app structure
      const transformedMembers = membersData.map(member => ({
        id: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        classId: member.class_id,
        className: member.class_name,
        created_at: member.created_at,
        updated_at: member.updated_at
      }));
      
      setMembers(transformedMembers);
    } catch (error) {
      console.error("Error loading members:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (newMember) => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.addMember(
        newMember.firstName, 
        newMember.lastName, 
        newMember.classId
      );
      await loadMembers(); // Reload to get updated data
    } catch (error) {
      console.error("Error adding member:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const importMembers = async (newMembers) => {
    try {
      setLoading(true);
      setError(null);
      
      // Add members one by one
      for (const member of newMembers) {
        await supabaseService.addMember(
          member.firstName, 
          member.lastName, 
          member.classId
        );
      }
      
      await loadMembers(); // Reload to get updated data
      return true;
    } catch (error) {
      console.error("Error importing members:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateMember = async (updatedMember) => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.updateMember(updatedMember.id, {
        firstName: updatedMember.firstName,
        lastName: updatedMember.lastName,
        classId: updatedMember.classId
      });
      await loadMembers(); // Reload to get updated data
    } catch (error) {
      console.error("Error updating member:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteMember = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.deleteMember(id);
      await loadMembers(); // Reload to get updated data
    } catch (error) {
      console.error("Error deleting member:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <MemberContext.Provider value={{ 
      members, 
      loading, 
      error, 
      addMember, 
      updateMember, 
      deleteMember, 
      importMembers, 
      loadMembers,
      setMembers 
    }}>
      {children}
    </MemberContext.Provider>
  );
};
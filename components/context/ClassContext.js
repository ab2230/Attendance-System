import React, { createContext, useState, useEffect } from "react";
import supabaseService from "../../services/supabaseService";

export const ClassContext = createContext();

export const ClassProvider = ({ children }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const classesData = await supabaseService.getClasses();
      
      // Transform Supabase data to match existing app structure
      const transformedClasses = classesData.map(cls => ({
        id: cls.id,
        name: cls.name,
        created_at: cls.created_at,
        updated_at: cls.updated_at
      }));
      
      setClasses(transformedClasses);
    } catch (error) {
      console.error("Error loading classes:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addClass = async (newClass) => {
    try {
      setLoading(true);
      setError(null);
      
      const className = typeof newClass === 'string' ? newClass : newClass.name;
      await supabaseService.addClass(className);
      await loadClasses(); // Reload to get updated data
    } catch (error) {
      console.error("Error adding class:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateClass = async (updatedClass) => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.updateClass(updatedClass.id, { name: updatedClass.name });
      await loadClasses(); // Reload to get updated data
    } catch (error) {
      console.error("Error updating class:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteClass = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.deleteClass(id);
      await loadClasses(); // Reload to get updated data
    } catch (error) {
      console.error("Error deleting class:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClassContext.Provider value={{ 
      classes, 
      loading, 
      error, 
      addClass, 
      updateClass, 
      deleteClass, 
      loadClasses 
    }}>
      {children}
    </ClassContext.Provider>
  );
};
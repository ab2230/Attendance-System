import React, { createContext, useState, useEffect } from "react";
import supabaseService from "../../services/supabaseService";
import { supabase } from "../../supabase-client";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get initial session
    getCurrentSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const getCurrentSession = async () => {
    try {
      setLoading(true);
      const session = await supabaseService.getCurrentSession();
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error getting current session:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const { user, session } = await supabaseService.signIn(email, password);
      setUser(user);
      setSession(session);
      
      return { user, session };
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, firstName, lastName) => {
    try {
      setLoading(true);
      setError(null);
      
      const { user, session } = await supabaseService.signUp(email, password, firstName, lastName);
      setUser(user);
      setSession(session);
      
      return { user, session };
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseService.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'your-app://reset-password',
      });
      
      if (error) throw error;
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Update password error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getProfile = async () => {
    try {
      if (!user) return null;
      
      setLoading(true);
      setError(null);
      
      const profile = await supabaseService.getProfile(user.id);
      return profile;
    } catch (error) {
      console.error('Get profile error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      setLoading(true);
      setError(null);
      
      const updatedProfile = await supabaseService.updateProfile(user.id, updates);
      return updatedProfile;
    } catch (error) {
      console.error('Update profile error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    getProfile,
    updateProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

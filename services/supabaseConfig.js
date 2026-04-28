import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kqittlmnkvdaaualuswr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaXR0bG1ua3ZkYWF1YWx1c3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxODA0NjMsImV4cCI6MjA5MDc1NjQ2M30.cmWYhVvcgaPYo3WfYUQb8hy3-Cp24bLvV0B6S1KMhx4';

/**
 * Custom Storage Wrapper
 * Ajustado para garantizar que la persistencia sea atómica y 
 * compatible con la política de sesión eterna.
 */
const ExpoSqliteStorage = {
  getItem: (key) => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key, value) => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key) => {
    return AsyncStorage.removeItem(key);
  },
};

// Configuración optimizada y blindada
// Se mantiene la persistencia activa para que el RootLayout pueda leer la sesión al arrancar
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSqliteStorage,
    autoRefreshToken: true,
    persistSession: true, // Crucial para que no se olvide de la sesión
    detectSessionInUrl: false, 
  },
  global: {
    headers: { 'apikey': supabaseAnonKey }, 
  },
});

/**
 * Obtiene solo el ID del usuario logueado
 */
export const getUserId = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;
    return session.user.id;
  } catch (e) {
    console.error("Error obteniendo ID:", e);
    return null;
  }
};

/**
 * Obtiene el perfil completo desde la tabla 'Usuarios'
 */
export const getUserProfile = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return null;

    const { data, error } = await supabase
      .from('Usuarios') 
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn("No se encontró perfil en la tabla Usuarios:", error.message);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error("Error en getUserProfile:", e);
    return null;
  }
};
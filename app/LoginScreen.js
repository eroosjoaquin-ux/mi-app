import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

// CORRECCIÓN DE RUTA: Apunta a la carpeta services desde la raíz de app
import { supabase } from '../services/supabaseConfig';

export default function LoginScreen({ onGoToRegister }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verClave, setVerClave] = useState(false);

  // Cargar el email guardado al iniciar
  useEffect(() => {
    const cargarEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("user_email");
        if (savedEmail) {
          setEmail(savedEmail);
          setRecordar(true);
        }
      } catch (e) {
        console.log("Error cargando email guardado");
      }
    };
    cargarEmail();
  }, []);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !clave) {
      return Alert.alert("Error", "Completa todos los campos.");
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: clave,
      });

      if (error) throw error;

      // Lógica de "Recordar"
      if (recordar) {
        await AsyncStorage.setItem("user_email", cleanEmail);
      } else {
        await AsyncStorage.removeItem("user_email");
      }

      // Si usas Expo Router y tenés un listener de sesión, 
      // esto redirigirá solo. Si no, podés usar:
      // router.replace('/(tabs)/home'); 

    } catch (e) {
      Alert.alert("Error", "Email o contraseña inválidos.");
      console.error(e.message);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          <Text style={styles.loginTitle}>Eros App</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            placeholderTextColor="#999" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address" 
          />
          
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.inputPasswordInner} 
              placeholder="Contraseña" 
              placeholderTextColor="#999" 
              value={clave} 
              onChangeText={setClave} 
              secureTextEntry={!verClave} 
            />
            <TouchableOpacity onPress={() => setVerClave(!verClave)} style={styles.eyeIcon}>
              {verClave ? <EyeOff size={22} color="#666" /> : <Eye size={22} color="#666" />}
            </TouchableOpacity>
          </View>

          <View style={styles.rememberContainer}>
            <Text style={styles.rememberText}>Mantener conectado</Text>
            <Switch 
              value={recordar} 
              onValueChange={setRecordar} 
              trackColor={{ false: "#767577", true: "#1976D2" }} 
              thumbColor={recordar ? "#FFF" : "#f4f3f4"}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#1976D2" />
          ) : (
            <TouchableOpacity style={styles.btnSubmit} onPress={handleLogin}>
              <Text style={styles.btnSubmitText}>INGRESAR</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.footerLink} onPress={onGoToRegister}>
            <Text style={styles.footerText}>
              ¿No tenés cuenta? <Text style={styles.linkText}>Registrate</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F5' 
  },
  innerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 25 
  },
  loginTitle: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#1976D2', 
    marginBottom: 40, 
    textAlign: 'center' 
  },
  input: { 
    width: '100%', 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#DDD', 
    color: '#000' 
  },
  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#DDD' 
  },
  inputPasswordInner: { 
    flex: 1, 
    padding: 15, 
    borderRadius: 12, 
    color: '#000' 
  },
  eyeIcon: { 
    paddingHorizontal: 15 
  },
  rememberContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    justifyContent: 'space-between' 
  },
  rememberText: { 
    color: '#666' 
  },
  btnSubmit: { 
    backgroundColor: '#1976D2', 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center', 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4 
  },
  btnSubmitText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 18 
  },
  footerLink: { 
    marginTop: 25 
  },
  footerText: { 
    textAlign: 'center', 
    color: '#666' 
  },
  linkText: { 
    color: '#1976D2', 
    fontWeight: 'bold' 
  },
});
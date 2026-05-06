import { Tabs } from 'expo-router';
import { Briefcase, MessageSquare, User, Wallet } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#1976D2',
      tabBarInactiveTintColor: '#65676B',
      headerShown: false, 
      tabBarStyle: { 
        height: 120,          
        paddingBottom: 25,   
        paddingTop: 10,      
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E1E4E8'
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600'
      }
    }}>
      {/* 1. PERFIL */}
      <Tabs.Screen 
        name="perfil" 
        options={{ 
          title: 'Mi Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} /> 
        }} 
      />

      {/* 2. MIS TRABAJOS */}
      <Tabs.Screen 
        name="mis_trabajos" 
        options={{ 
          title: 'Trabajos',
          tabBarIcon: ({ color }) => <Briefcase size={24} color={color} /> 
        }} 
      />

      {/* 3. MENSAJES */}
      <Tabs.Screen 
        name="chat/lista_chats" 
        options={{ 
          title: 'Mensajes',
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} /> 
        }} 
      />

      {/* 4. WALLET */}
      <Tabs.Screen 
        name="wallet" 
        options={{ 
          title: 'Billetera',
          tabBarIcon: ({ color }) => <Wallet size={24} color={color} /> 
        }} 
      />

      {/* OCULTAR RUTAS INTERNAS */}
      <Tabs.Screen 
        name="chat/index" 
        options={{ href: null }} 
      />
      <Tabs.Screen 
        name="chat/chats" 
        options={{ href: null }} 
      />
    </Tabs>
  );
}
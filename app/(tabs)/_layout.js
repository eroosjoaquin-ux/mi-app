import { Tabs } from 'expo-router';
import { Briefcase, Globe, MessageSquare, User, Wallet } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#1976D2',
      tabBarInactiveTintColor: '#65676B',
      headerShown: false, 
      tabBarStyle: { 
        height: 70, 
        paddingBottom: 12,
        paddingTop: 8,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E1E4E8'
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600'
      }
    }}>
      {/* 1. SOCIAL */}
      <Tabs.Screen 
        name="social" 
        options={{ 
          title: 'Comunidad',
          tabBarIcon: ({ color }) => <Globe size={24} color={color} /> 
        }} 
      />

      {/* 2. PERFIL */}
      <Tabs.Screen 
        name="perfil" 
        options={{ 
          title: 'Mi Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} /> 
        }} 
      />

      {/* 3. MIS TRABAJOS */}
      <Tabs.Screen 
        name="mis_trabajos" 
        options={{ 
          title: 'Trabajos',
          tabBarIcon: ({ color }) => <Briefcase size={24} color={color} /> 
        }} 
      />

      {/* 4. CHATS - Corregido segun tu estructura de archivos app/chat/chats */}
      <Tabs.Screen 
        name="chat/chats" 
        options={{ 
          title: 'Mensajes',
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} /> 
        }} 
      />

      {/* 5. WALLET */}
      <Tabs.Screen 
        name="wallet" 
        options={{ 
          title: 'Billetera',
          tabBarIcon: ({ color }) => <Wallet size={24} color={color} /> 
        }} 
      />
    </Tabs>
  );
}
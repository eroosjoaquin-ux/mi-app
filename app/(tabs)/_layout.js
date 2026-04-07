import { Tabs } from 'expo-router';
import { Briefcase, MessageSquare, User, Wallet } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#1976D2',
      tabBarInactiveTintColor: '#65676B',
      headerShown: false, // Lo ponemos en false porque ya creamos headers personalizados en cada pantalla
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
      {/* 1. PERFIL: Tu carta de presentación */}
      <Tabs.Screen 
        name="perfil" 
        options={{ 
          title: 'Mi Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} /> 
        }} 
      />

      {/* 2. MIS TRABAJOS: Gestión y Agenda */}
      <Tabs.Screen 
        name="mis_trabajos" 
        options={{ 
          title: 'Trabajos',
          tabBarIcon: ({ color }) => <Briefcase size={24} color={color} /> 
        }} 
      />

      {/* 3. CHATS: Comunicación y Presupuestos */}
      <Tabs.Screen 
        name="chat" 
        options={{ 
          title: 'Mensajes',
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} /> 
        }} 
      />

      {/* 4. WALLET: Cobros y Saldo */}
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
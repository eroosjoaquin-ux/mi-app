import { useLocalSearchParams } from 'expo-router';
import ChatScreen from './chats';
import ListaChats from './lista_chats';

export default function ChatIndex() {
  const params = useLocalSearchParams();

  // Si hay ID, mostramos la pantalla de mensajes (chats.js)
  if (params.id) {
    return (
      <ChatScreen 
        chat={{
          id: params.id,
          name: params.name
        }} 
      />
    );
  }

  // Si no hay ID, mostramos la lista (lista_chats.js)
  return <ListaChats />;
}
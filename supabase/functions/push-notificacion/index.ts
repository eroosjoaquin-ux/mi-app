// supabase/functions/push-notificacion/index.ts
// 
// CÓMO DEPLOYAR:
//   supabase functions deploy push-notificacion
//
// CÓMO CONFIGURAR EL TRIGGER EN SUPABASE:
//   En el dashboard de Supabase -> Database -> Webhooks -> Create Webhook
//   - Name: push_mensaje_nuevo
//   - Table: messages
//   - Events: INSERT
//   - URL: https://<tu-proyecto>.supabase.co/functions/v1/push-notificacion
//   - HTTP Headers: Authorization: Bearer <tu-service-role-key>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    
    // El webhook de Supabase manda el registro nuevo en body.record
    const mensaje = body.record;
    
    if (!mensaje || !mensaje.chat_id || !mensaje.sender_id || !mensaje.text) {
      return new Response('Sin datos suficientes', { status: 200 });
    }

    // Bloqueamos mensajes de tipo quote con texto genérico
    const textoPush = mensaje.type === 'quote' 
      ? '💼 Te enviaron un presupuesto' 
      : mensaje.text;

    // Conectamos a Supabase con el service role para leer datos
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Buscar el chat para saber quién es el RECEPTOR (el que no mandó el mensaje)
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('user_1, user_2')
      .eq('id', mensaje.chat_id)
      .single();

    if (chatError || !chat) {
      console.error('Chat no encontrado:', chatError);
      return new Response('Chat no encontrado', { status: 200 });
    }

    const receptorId = chat.user_1 === mensaje.sender_id ? chat.user_2 : chat.user_1;

    // 2. Buscar el nombre del EMISOR para mostrarlo en la notificación
    const { data: emisor } = await supabase
      .from('Usuarios')
      .select('nombre, usuario_empresa')
      .eq('id', mensaje.sender_id)
      .single();

    const nombreEmisor = emisor?.usuario_empresa?.trim() 
      || emisor?.nombre?.trim() 
      || 'Alguien';

    // 3. Buscar el push_token del RECEPTOR
    const { data: receptor, error: receptorError } = await supabase
      .from('Usuarios')
      .select('push_token')
      .eq('id', receptorId)
      .single();

    if (receptorError || !receptor?.push_token) {
      console.log('Receptor sin token, no se manda push');
      return new Response('Sin token', { status: 200 });
    }

    // 4. Mandar la notificación a Expo
    const notificacion = {
      to: receptor.push_token,
      channelId: 'mensajes',           // El canal que ya configuraste en notificaciones.js
      sound: 'default',
      title: nombreEmisor,
      body: textoPush,
      data: {
        type: 'chat',
        chat_id: mensaje.chat_id,
        chat_name: nombreEmisor,
      },
      priority: 'high',
      badge: 1,
    };

    const respExpo = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(notificacion),
    });

    const respData = await respExpo.json();
    console.log('Expo response:', JSON.stringify(respData));

    return new Response(JSON.stringify({ ok: true, expo: respData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en push-notificacion:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
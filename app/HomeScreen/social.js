import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  Heart,
  Image as ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Reply,
  Send,
  Trash2,
  X
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import { getNombreMostrar } from '../../services/nombreUsuario';
import { supabase } from '../../services/supabaseConfig';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

const COLORS = {
  white: '#FFFFFF',
  background: '#F0F2F5',
  blueLight: '#E3F2FD',
  blue: '#1976D2',
  textPrimary: '#050505',
  textSecondary: '#65676B',
  border: '#E4E6EB',
  red: '#E53935',
  like: '#E1306C',
  bgModal: 'rgba(0,0,0,0.5)',
  bgComment: '#F0F2F5'
};

const MAX_INPUT_HEIGHT = 100;

// ==========================================
// COMPONENTE PARA CADA PUBLICACIÓN (SOCIAL)
// ==========================================
const SocialPost = ({ post, currentUser, onPostEliminado, onPostEditado }) => {
  const router = useRouter();
  const userName = getNombreMostrar(post.Usuarios, 'Usuario');
  const userAvatar = post.Usuarios?.avatar_url;
  const isOwner = currentUser?.id === post.usuario_id;

  // ── Like del post ──
  const [likesPost, setLikesPost] = useState(
    Array.isArray(post.likes) ? post.likes.length : (post.likes || 0)
  );
  const [likedPost, setLikedPost] = useState(false);
  const [likeCargando, setLikeCargando] = useState(false);

  // ── Modal lista de likes ──
  const [modalLikesVisible, setModalLikesVisible] = useState(false);
  const [listaLikes, setListaLikes] = useState([]);
  const [cargandoLikes, setCargandoLikes] = useState(false);

  // ── Comentarios ──
  const [modalComentariosVisible, setModalComentariosVisible] = useState(false);
  const [comentarios, setComentarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [textoComentario, setTextoComentario] = useState('');
  const [inputHeight, setInputHeight] = useState(36);
  const [respondiendo, setRespondiendo] = useState(null);
  const [likesComentario, setLikesComentario] = useState({});
  const [commentsCount, setCommentsCount] = useState(
    Array.isArray(post.comentarios) ? post.comentarios.length : (post.comentarios || 0)
  );

  // ── Visor foto fullscreen ──
  const [fotoVisible, setFotoVisible] = useState(false);
  const [fotoIndex, setFotoIndex] = useState(0);
  const fotosPost = post.imagenes_urls?.length
    ? post.imagenes_urls
    : post.imagen_url
    ? [post.imagen_url]
    : [];

  // ── Menú tres puntitos — comentarios ──
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuItem, setMenuItem] = useState(null);
  const [menuPuedeEditar, setMenuPuedeEditar] = useState(false);

  // ── Modal edición — comentario ──
  const [modalEdicionVisible, setModalEdicionVisible] = useState(false);
  const [textoEdicion, setTextoEdicion] = useState('');
  const [itemEditando, setItemEditando] = useState(null);

  // ── Menú tres puntitos — POST propio ──
  const [menuPostVisible, setMenuPostVisible] = useState(false);

  // ── Modal edición — POST ──
  const [modalEdicionPostVisible, setModalEdicionPostVisible] = useState(false);
  const [descripcionEdicion, setDescripcionEdicion] = useState('');

  const keyboardOffset = useRef(new Animated.Value(44)).current;
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  // Verificar like inicial
  useEffect(() => {
    if (!currentUser) return;
    supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('usuario_id', currentUser.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setLikedPost(true); });
  }, []);

  // Keyboard listeners para modal comentarios
  useEffect(() => {
    if (!modalComentariosVisible) return;
    const showSub = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: e.endCoordinates.height + 44,
          duration: 150,
          useNativeDriver: false,
        }).start();
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => {
        Animated.timing(keyboardOffset, {
          toValue: 30,
          duration: 150,
          useNativeDriver: false,
        }).start();
      }
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, [modalComentariosVisible]);

  // ── Like del post ──
  const toggleLikePost = async () => {
    if (!currentUser || likeCargando) return;
    setLikeCargando(true);
    try {
      if (likedPost) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', currentUser.id);
        if (!error) {
          setLikedPost(false);
          setLikesPost(prev => Math.max(prev - 1, 0));
        }
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, usuario_id: currentUser.id });
        if (!error) {
          setLikedPost(true);
          setLikesPost(prev => prev + 1);
          // Notificar al dueño si no es el mismo usuario
          if (post.usuario_id && post.usuario_id !== currentUser.id) {
            const { data: u } = await supabase
              .from('Usuarios')
              .select('nombre, usuario_empresa')
              .eq('id', currentUser.id)
              .single();
            const nombre = u?.usuario_empresa || u?.nombre || 'Alguien';
            await supabase.from('notificaciones').insert({
              usuario_id: post.usuario_id,
              titulo: '❤️ A alguien le gustó tu publicación',
              mensaje: `${nombre} le dio Me gusta a tu publicación`,
              post_id: post.id,
            });
          }
        }
      }
    } catch (e) {
      console.error('Error en like:', e.message);
    } finally {
      setLikeCargando(false);
    }
  };

  const cargarListaLikes = async () => {
    setCargandoLikes(true);
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('usuario_id, created_at')
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const conUsuarios = await Promise.all(
        (data || []).map(async (l) => {
          const { data: u } = await supabase
            .from('Usuarios')
            .select('nombre, usuario_empresa, avatar_url')
            .eq('id', l.usuario_id)
            .single();
          return { ...l, Usuarios: u || null };
        })
      );
      setListaLikes(conUsuarios);
    } catch (e) {
      console.error('Error cargando likes:', e.message);
    } finally {
      setCargandoLikes(false);
    }
  };

  const abrirModalLikes = () => {
    setModalLikesVisible(true);
    cargarListaLikes();
  };

  // ── Comentarios ──
  const cargarComentarios = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('comentarios')
        .select('*')
        .eq('post_id', post.id)
        .is('parent_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const comentariosCompletos = await Promise.all(
        (data || []).map(async (c) => {
          const { data: u } = await supabase
            .from('Usuarios')
            .select('usuario_empresa, nombre, avatar_url')
            .eq('id', c.usuario_id)
            .single();

          const { data: respuestas } = await supabase
            .from('comentarios')
            .select('*')
            .eq('parent_id', c.id)
            .order('created_at', { ascending: true });

          const respuestasConUsuario = await Promise.all(
            (respuestas || []).map(async (r) => {
              const { data: ru } = await supabase
                .from('Usuarios')
                .select('usuario_empresa, nombre, avatar_url')
                .eq('id', r.usuario_id)
                .single();
              return { ...r, Usuarios: ru || null };
            })
          );

          return { ...c, Usuarios: u || null, respuestas: respuestasConUsuario };
        })
      );

      setComentarios(comentariosCompletos);
      setCommentsCount(comentariosCompletos.length);

      const likesIniciales = {};
      comentariosCompletos.forEach(c => {
        likesIniciales[c.id] = { count: c.likes || 0, liked: false };
        (c.respuestas || []).forEach(r => {
          likesIniciales[r.id] = { count: r.likes || 0, liked: false };
        });
      });
      // Cargar likes reales de likes_comentarios
      const todosLosIds = [];
      comentariosCompletos.forEach(c => {
        todosLosIds.push(c.id);
        (c.respuestas || []).forEach(r => todosLosIds.push(r.id));
      });

      let likesDados = new Set();
      let conteosLikes = {};

      if (todosLosIds.length > 0) {
        const { data: likesData } = await supabase
          .from('likes_comentarios')
          .select('comentario_id, usuario_id')
          .in('comentario_id', todosLosIds);

        (likesData || []).forEach(l => {
          conteosLikes[l.comentario_id] = (conteosLikes[l.comentario_id] || 0) + 1;
          if (l.usuario_id === currentUser?.id) likesDados.add(l.comentario_id);
        });
      }

      const likesFinales = {};
      comentariosCompletos.forEach(c => {
        likesFinales[c.id] = { count: conteosLikes[c.id] || 0, liked: likesDados.has(c.id) };
        (c.respuestas || []).forEach(r => {
          likesFinales[r.id] = { count: conteosLikes[r.id] || 0, liked: likesDados.has(r.id) };
        });
      });
      setLikesComentario(likesFinales);
    } catch (e) {
      console.error('Error cargando comentarios:', e.message);
    } finally {
      setCargando(false);
    }
  };

  const abrirComentarios = () => {
    setModalComentariosVisible(true);
    cargarComentarios();
  };

  const enviarComentario = async () => {
    const texto = textoComentario.trim();
    if (!texto || !currentUser) return;

    const textoFinal = respondiendo ? `@${respondiendo.nombre} ${texto}` : texto;
    const parentId = respondiendo?.id ?? null;

    setTextoComentario('');
    setInputHeight(36);
    setRespondiendo(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from('comentarios').insert([{
        post_id: post.id,
        usuario_id: session.user.id,
        contenido: textoFinal,
        parent_id: parentId,
      }]);

      if (!error) {
        if (!parentId) setCommentsCount(prev => prev + 1);
        cargarComentarios();
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
      }
    } catch (e) {
      console.error('Error enviando comentario:', e.message);
    }
  };

  const toggleLikeComentario = async (id) => {
    if (!currentUser) return;
    const actual = likesComentario[id] || { count: 0, liked: false };
    // Optimista
    setLikesComentario(prev => ({
      ...prev,
      [id]: { count: actual.liked ? actual.count - 1 : actual.count + 1, liked: !actual.liked }
    }));
    try {
      if (actual.liked) {
        await supabase
          .from('likes_comentarios')
          .delete()
          .eq('comentario_id', id)
          .eq('usuario_id', currentUser.id);
      } else {
        await supabase
          .from('likes_comentarios')
          .insert({ comentario_id: id, usuario_id: currentUser.id });
      }
    } catch (e) {
      // Revertir si falla
      setLikesComentario(prev => ({
        ...prev,
        [id]: actual
      }));
      console.error('Error like comentario:', e.message);
    }
  };

  const handleResponder = (item) => {
    const nombre = getNombreMostrar(item.Usuarios);
    setRespondiendo({ id: item.id, nombre });
    setTextoComentario('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelarRespuesta = () => {
    setRespondiendo(null);
    setTextoComentario('');
  };

  // ── Menú comentarios ──
  const abrirMenu = (item, puedeEditar) => {
    setMenuItem(item);
    setMenuPuedeEditar(puedeEditar);
    setMenuVisible(true);
  };
  const cerrarMenu = () => { setMenuVisible(false); setMenuItem(null); setMenuPuedeEditar(false); };

  const iniciarEdicionComentario = () => {
    if (!menuItem) return;
    setItemEditando(menuItem);
    setTextoEdicion(menuItem.contenido ?? '');
    setMenuVisible(false);
    setMenuItem(null);
    setTimeout(() => setModalEdicionVisible(true), 300);
  };

  const guardarEdicionComentario = async () => {
    const texto = textoEdicion.trim();
    if (!texto || !itemEditando) return;
    try {
      const { error } = await supabase
        .from('comentarios')
        .update({ contenido: texto })
        .eq('id', itemEditando.id);
      if (!error) {
        setModalEdicionVisible(false);
        setItemEditando(null);
        setTextoEdicion('');
        cargarComentarios();
      }
    } catch (e) {
      console.error('Error editando comentario:', e.message);
    }
  };

  const cancelarEdicionComentario = () => {
    setModalEdicionVisible(false);
    setItemEditando(null);
    setTextoEdicion('');
  };

  const eliminarComentario = async () => {
    if (!menuItem) return;
    const idAEliminar = menuItem.id;
    const esRaiz = !menuItem.parent_id;
    cerrarMenu();
    try {
      const { error } = await supabase
        .from('comentarios')
        .delete()
        .eq('id', idAEliminar);
      if (!error) {
        if (esRaiz) setCommentsCount(prev => Math.max(prev - 1, 0));
        cargarComentarios();
      }
    } catch (e) {
      console.error('Error eliminando comentario:', e.message);
    }
  };

  // ── Menú POST propio ──
  const abrirMenuPost = () => setMenuPostVisible(true);
  const cerrarMenuPost = () => setMenuPostVisible(false);

  const iniciarEdicionPost = () => {
    setDescripcionEdicion(post.descripcion ?? '');
    setMenuPostVisible(false);
    setTimeout(() => setModalEdicionPostVisible(true), 300);
  };

  const guardarEdicionPost = async () => {
    const descripcion = descripcionEdicion.trim();
    try {
      const { error } = await supabase
        .from('posts')
        .update({ descripcion })
        .eq('id', post.id);
      if (!error) {
        setModalEdicionPostVisible(false);
        onPostEditado?.(post.id, descripcion);
      }
    } catch (e) {
      console.error('Error editando post:', e.message);
    }
  };

  const cancelarEdicionPost = () => { setModalEdicionPostVisible(false); setDescripcionEdicion(''); };

  const eliminarPost = () => {
    cerrarMenuPost();
    Alert.alert(
      'Eliminar publicación',
      '¿Seguro que querés eliminar esta publicación? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('posts').delete().eq('id', post.id);
              if (!error) onPostEliminado?.(post.id);
            } catch (e) {
              console.error('Error eliminando post:', e.message);
            }
          }
        }
      ]
    );
  };

  // ── Render burbuja comentario ──
  const renderBurbuja = (item, esPadre) => {
    const nombreMostrar = getNombreMostrar(item.Usuarios);
    const inicial = nombreMostrar.charAt(0).toUpperCase();
    const contenido = item.contenido ?? '';
    const likeData = likesComentario[item.id] || { count: 0, liked: false };
    const esMio = item.usuario_id === currentUser?.id;

    return (
      <View style={esPadre ? styles.commentContainer : styles.replyContainer}>
        {!esPadre && <View style={styles.replyLine} />}

        <View style={esPadre ? styles.commentAvatar : styles.replyAvatar}>
          {item.Usuarios?.avatar_url ? (
            <Image source={{ uri: item.Usuarios.avatar_url }} style={esPadre ? styles.avatarMini : styles.avatarMiniSmall} />
          ) : (
            <Text style={esPadre ? styles.avatarLetra : styles.avatarLetraSmall}>{inicial}</Text>
          )}
        </View>

        <View style={styles.commentBody}>
          <View style={styles.bubbleRow}>
            <View style={[styles.commentBubble, { flex: 1 }]}>
              <Text style={esPadre ? styles.commentUser : styles.replyUser}>{nombreMostrar}</Text>
              <Text style={styles.commentText}>{contenido}</Text>
            </View>
            {(esMio || isOwner) && (
              <TouchableOpacity
                onPress={() => abrirMenu(item, esMio)}
                style={styles.menuBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MoreHorizontal size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.commentActionBtn} onPress={() => toggleLikeComentario(item.id)}>
              <Heart
                size={13}
                color={likeData.liked ? COLORS.red : COLORS.textSecondary}
                fill={likeData.liked ? COLORS.red : 'transparent'}
              />
              <Text style={[styles.commentActionText, likeData.liked && { color: COLORS.red }]}>
                {likeData.count > 0 ? `Me gusta (${likeData.count})` : 'Me gusta'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleResponder(item)}>
              <Reply size={13} color={COLORS.textSecondary} />
              <Text style={styles.commentActionText}>Responder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderComentario = ({ item }) => (
    <View>
      {renderBurbuja(item, true)}
      {(item.respuestas || []).map(r => (
        <View key={r.id}>{renderBurbuja(r, false)}</View>
      ))}
    </View>
  );

  return (
    <View style={styles.socialCard}>
      {/* ── CABECERA: Avatar + Nombre + tres puntitos ── */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => router.push({ pathname: '/perfil', params: { userId: post.usuario_id } })}
          activeOpacity={0.7}
        >
          <View style={styles.avatarWrapper}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>{userName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.userNameContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.badgeSocial}><Text style={styles.badgeSocialText}>Social</Text></View>
            </View>
            <Text style={styles.postDate}>
              {post.created_at ? new Date(post.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : 'Recién'}
            </Text>
          </View>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity onPress={abrirMenuPost} style={styles.moreOptions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MoreHorizontal size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── CONTENIDO ── */}
      {!!post.descripcion && <Text style={styles.postText}>{post.descripcion}</Text>}

      {/* ── GALERÍA ── */}
      {fotosPost.length > 0 && (
        <View style={styles.galeriaContainer}>
          {fotosPost.length === 1 && (
            <TouchableOpacity onPress={() => { setFotoIndex(0); setFotoVisible(true); }} activeOpacity={0.92}>
              <Image source={{ uri: fotosPost[0] }} style={styles.galeriaUnica} resizeMode="cover" />
            </TouchableOpacity>
          )}
          {fotosPost.length === 2 && (
            <View style={styles.galeria2}>
              {fotosPost.map((uri, i) => (
                <TouchableOpacity key={i} style={styles.galeria2Item} onPress={() => { setFotoIndex(i); setFotoVisible(true); }} activeOpacity={0.92}>
                  <Image source={{ uri }} style={styles.galeriaFill} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {fotosPost.length >= 3 && (
            <View style={styles.galeria2}>
              <TouchableOpacity style={styles.galeria2Item} onPress={() => { setFotoIndex(0); setFotoVisible(true); }} activeOpacity={0.92}>
                <Image source={{ uri: fotosPost[0] }} style={styles.galeriaFill} resizeMode="cover" />
              </TouchableOpacity>
              <View style={[styles.galeria2Item, { gap: 4 }]}>
                {[1, 2].map(i => (
                  <TouchableOpacity key={i} style={{ flex: 1 }} onPress={() => { setFotoIndex(i); setFotoVisible(true); }} activeOpacity={0.92}>
                    <Image source={{ uri: fotosPost[i] }} style={styles.galeriaFill} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Visor fullscreen ── */}
      <Modal visible={fotoVisible} transparent animationType="fade" onRequestClose={() => setFotoVisible(false)} statusBarTranslucent>
        <View style={styles.fotoViewerOverlay}>
          <TouchableOpacity style={styles.fotoViewerClose} onPress={() => setFotoVisible(false)}>
            <X size={28} color="white" />
          </TouchableOpacity>
          {fotosPost.length > 1 && (
            <Text style={styles.fotoViewerCounter}>{fotoIndex + 1} / {fotosPost.length}</Text>
          )}
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            contentOffset={{ x: fotoIndex * SCREEN_W, y: 0 }}
            onMomentumScrollEnd={e => setFotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
          >
            {fotosPost.map((uri, i) => (
              <View key={i} style={{ width: SCREEN_W, height: SCREEN_H, justifyContent: 'center', alignItems: 'center' }}>
                <Image source={{ uri }} style={{ width: SCREEN_W, height: SCREEN_H * 0.8 }} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
          {fotosPost.length > 1 && (
            <View style={styles.fotoDots}>
              {fotosPost.map((_, i) => (
                <View key={i} style={[styles.fotoDot, i === fotoIndex && styles.fotoDotActive]} />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* ── Barra de stats ── */}
      <View style={styles.interactionBar}>
        <TouchableOpacity style={styles.statGroup} onPress={abrirModalLikes} disabled={likesPost === 0}>
          <View style={[styles.likeIconCircle, likedPost && { backgroundColor: COLORS.like }]}>
            <Heart size={10} color="white" fill="white" />
          </View>
          <Text style={styles.statText}>{likesPost}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={abrirComentarios}>
          <Text style={styles.statText}>{commentsCount} comentarios</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* ── Botones de acción ── */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.actionButton, likedPost && { backgroundColor: COLORS.blueLight }]}
          onPress={toggleLikePost}
          disabled={likeCargando}
        >
          <Heart size={18} color={likedPost ? COLORS.like : COLORS.textSecondary} fill={likedPost ? COLORS.like : 'transparent'} />
          <Text style={[styles.actionButtonText, likedPost && { color: COLORS.like }]}>Me gusta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={abrirComentarios}>
          <MessageSquare size={18} color={COLORS.textSecondary} />
          <Text style={styles.actionButtonText}>Comentar</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal Comentarios (bottom sheet) ── */}
      <Modal visible={modalComentariosVisible} animationType="slide" transparent onRequestClose={() => setModalComentariosVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { paddingBottom: keyboardOffset }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comentarios</Text>
              <TouchableOpacity onPress={() => setModalComentariosVisible(false)}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {cargando ? (
              <ActivityIndicator size="large" color={COLORS.blue} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                ref={flatListRef}
                data={comentarios}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderComentario}
                contentContainerStyle={styles.commentsList}
                ListEmptyComponent={<Text style={styles.emptyText}>Sé el primero en comentar</Text>}
                keyboardShouldPersistTaps="always"
              />
            )}

            {respondiendo && (
              <View style={styles.respondiendoBanner}>
                <Text style={styles.respondiendoText}>Respondiendo a {respondiendo.nombre}</Text>
                <TouchableOpacity onPress={cancelarRespuesta}>
                  <X size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={[styles.commentInput, { height: Math.min(inputHeight, MAX_INPUT_HEIGHT) }]}
                placeholder={respondiendo ? `Responder a ${respondiendo.nombre}...` : 'Escribe un comentario...'}
                placeholderTextColor={COLORS.textSecondary}
                value={textoComentario}
                onChangeText={setTextoComentario}
                onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                multiline
                scrollEnabled={inputHeight >= MAX_INPUT_HEIGHT}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                onPress={enviarComentario}
                disabled={!textoComentario.trim()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Send size={20} color={textoComentario.trim() ? COLORS.blue : COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Menú tres puntitos — COMENTARIOS ── */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={cerrarMenu}>
        <TouchableWithoutFeedback onPress={cerrarMenu}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuCard}>
                {menuPuedeEditar && (
                  <>
                    <TouchableOpacity style={styles.menuItem} onPress={iniciarEdicionComentario}>
                      <Pencil size={16} color={COLORS.blue} />
                      <Text style={styles.menuItemText}>Editar</Text>
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />
                  </>
                )}
                <TouchableOpacity style={styles.menuItem} onPress={eliminarComentario}>
                  <Trash2 size={16} color={COLORS.red} />
                  <Text style={[styles.menuItemText, { color: COLORS.red }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal edición — COMENTARIO ── */}
      <Modal visible={modalEdicionVisible} transparent animationType="fade" onRequestClose={cancelarEdicionComentario}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.edicionOverlay}>
          <TouchableWithoutFeedback onPress={cancelarEdicionComentario}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={styles.edicionCard}>
            <View style={styles.edicionHeader}>
              <Text style={styles.edicionTitulo}>Editar comentario</Text>
              <TouchableOpacity onPress={cancelarEdicionComentario} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.edicionInput}
              value={textoEdicion}
              onChangeText={setTextoEdicion}
              multiline autoFocus
              placeholder="Editá tu comentario..."
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.edicionBotones}>
              <TouchableOpacity onPress={cancelarEdicionComentario} style={styles.edicionBtnCancelar}>
                <Text style={styles.edicionCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={guardarEdicionComentario}
                disabled={!textoEdicion.trim()}
                style={[styles.edicionBtnGuardar, !textoEdicion.trim() && { opacity: 0.5 }]}
              >
                <Text style={styles.edicionGuardarText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Menú tres puntitos — POST PROPIO ── */}
      <Modal visible={menuPostVisible} transparent animationType="fade" onRequestClose={cerrarMenuPost}>
        <TouchableWithoutFeedback onPress={cerrarMenuPost}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuCard}>
                <TouchableOpacity style={styles.menuItem} onPress={iniciarEdicionPost}>
                  <Pencil size={16} color={COLORS.blue} />
                  <Text style={styles.menuItemText}>Editar publicación</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={eliminarPost}>
                  <Trash2 size={16} color={COLORS.red} />
                  <Text style={[styles.menuItemText, { color: COLORS.red }]}>Eliminar publicación</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal edición — POST ── */}
      <Modal visible={modalEdicionPostVisible} transparent animationType="fade" onRequestClose={cancelarEdicionPost}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.edicionOverlay}>
          <TouchableWithoutFeedback onPress={cancelarEdicionPost}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={styles.edicionCard}>
            <View style={styles.edicionHeader}>
              <Text style={styles.edicionTitulo}>Editar publicación</Text>
              <TouchableOpacity onPress={cancelarEdicionPost} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.edicionInput}
              value={descripcionEdicion}
              onChangeText={setDescripcionEdicion}
              multiline autoFocus
              placeholder="¿Qué estás pensando?"
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.edicionBotones}>
              <TouchableOpacity onPress={cancelarEdicionPost} style={styles.edicionBtnCancelar}>
                <Text style={styles.edicionCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={guardarEdicionPost}
                style={styles.edicionBtnGuardar}
              >
                <Text style={styles.edicionGuardarText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal lista de Me gusta ── */}
      <Modal visible={modalLikesVisible} animationType="slide" transparent onRequestClose={() => setModalLikesVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Le gustó a {likesPost}</Text>
              <TouchableOpacity onPress={() => setModalLikesVisible(false)}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {cargandoLikes ? (
              <ActivityIndicator size="large" color={COLORS.blue} style={{ marginTop: 24 }} />
            ) : (
              <FlatList
                data={listaLikes}
                keyExtractor={(item) => item.usuario_id}
                contentContainerStyle={{ padding: 12 }}
                ListEmptyComponent={<Text style={styles.emptyText}>Nadie dio Me gusta todavía</Text>}
                renderItem={({ item }) => {
                  const nombre = getNombreMostrar(item.Usuarios);
                  const inicial = nombre.charAt(0).toUpperCase();
                  return (
                    <View style={styles.likeUserRow}>
                      <View style={styles.likeUserAvatar}>
                        {item.Usuarios?.avatar_url ? (
                          <Image source={{ uri: item.Usuarios.avatar_url }} style={styles.likeUserAvatarImg} />
                        ) : (
                          <Text style={styles.likeUserAvatarLetra}>{inicial}</Text>
                        )}
                      </View>
                      <Text style={styles.likeUserNombre}>{nombre}</Text>
                      <Heart size={14} color={COLORS.like} fill={COLORS.like} style={{ marginLeft: 'auto' }} />
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ==========================================
// PANTALLA PRINCIPAL SOCIAL
// ==========================================
export default function SocialScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoPost, setNuevoPost] = useState({ descripcion: '', imagenes: [] });
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
      fetchPosts();
    };
    init();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          Usuarios ( id, nombre, usuario_empresa, avatar_url ),
          likes ( usuario_id ),
          comentarios ( id )
        `)
        .eq('tipo', 'social')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (e) {
      console.error('Error fetching posts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchPosts(); };

  const seleccionarImagen = async () => {
    if (nuevoPost.imagenes.length >= 4) {
      Alert.alert('Límite', 'Podés subir hasta 4 fotos por publicación.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4 - nuevoPost.imagenes.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const nuevas = result.assets.map(a => a.uri);
      setNuevoPost(prev => ({ ...prev, imagenes: [...prev.imagenes, ...nuevas].slice(0, 4) }));
    }
  };

  const handleCrearPost = async () => {
    if (!nuevoPost.descripcion.trim() && nuevoPost.imagenes.length === 0) {
      Alert.alert('Error', 'Escribe algo o sube una imagen.');
      return;
    }
    if (!user) { Alert.alert('Error', 'Debes iniciar sesión para publicar.'); return; }

    setSubiendo(true);
    try {
      // Subir todas las imágenes
      const urls = await Promise.all(
        nuevoPost.imagenes.map(async (uri, idx) => {
          const ext = (uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
          const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
          const fileName = `social/${user.id}/${Date.now()}_${idx}.${ext}`;
          const response = await fetch(uri);
          const arrayBuffer = await response.arrayBuffer();
          const { error: uploadError } = await supabase.storage
            .from('imagenes_posts')
            .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: false });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('imagenes_posts').getPublicUrl(fileName);
          return urlData.publicUrl;
        })
      );

      const imagenUrl = urls[0] || null;
      const imagenesUrls = urls.length > 1 ? urls : null;

      const { data, error } = await supabase
        .from('posts')
        .insert({
          usuario_id: user.id,
          descripcion: nuevoPost.descripcion.trim(),
          imagen_url: imagenUrl,
          imagenes_urls: imagenesUrls,
          tipo: 'social'
        })
        .select(`*, Usuarios ( id, nombre, usuario_empresa, avatar_url ), likes ( usuario_id ), comentarios ( id )`)
        .single();

      if (error) throw error;
      setPosts([data, ...posts]);
      setModalVisible(false);
      setNuevoPost({ descripcion: '', imagenes: [] });
    } catch (e) {
      console.error('Error creando post:', e);
      Alert.alert('Error', 'Hubo un problema al crear la publicación.');
    } finally {
      setSubiendo(false);
    }
  };

  const handlePostEliminado = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  const handlePostEditado = (id, nuevaDescripcion) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, descripcion: nuevaDescripcion } : p));
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.blue} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <SocialPost
            post={item}
            currentUser={user}
            onPostEliminado={handlePostEliminado}
            onPostEditado={handlePostEditado}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay publicaciones aún. ¡Sé el primero en compartir algo!</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus size={30} color={COLORS.white} />
      </TouchableOpacity>

      {/* ── MODAL CREAR PUBLICACIÓN ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.crearOverlay} behavior={Platform.OS === 'ios' ? 'padding' : null}>
          <View style={styles.crearContainer}>
            <View style={styles.crearHeader}>
              <Text style={styles.crearTitle}>Nueva Publicación</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={26} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputCrear}
                  placeholder="¿Qué estás pensando?"
                  placeholderTextColor={COLORS.textSecondary}
                  multiline
                  value={nuevoPost.descripcion}
                  onChangeText={(txt) => setNuevoPost({ ...nuevoPost, descripcion: txt })}
                />
              </View>

              {nuevoPost.imagenes.length > 0 && (
                <View style={styles.previewGrid}>
                  {nuevoPost.imagenes.map((uri, idx) => (
                    <View key={idx} style={styles.previewItem}>
                      <Image source={{ uri }} style={styles.previewImagen} />
                      <TouchableOpacity
                        style={styles.btnQuitarImagen}
                        onPress={() => setNuevoPost(prev => ({ ...prev, imagenes: prev.imagenes.filter((_, i) => i !== idx) }))}
                      >
                        <X size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {nuevoPost.imagenes.length < 4 && (
                <TouchableOpacity style={styles.btnAñadirImagen} onPress={seleccionarImagen}>
                  <ImageIcon size={22} color={COLORS.blue} />
                  <Text style={styles.textoAñadirImagen}>
                    {nuevoPost.imagenes.length === 0 ? 'Añadir fotos' : `Añadir más (${nuevoPost.imagenes.length}/4)`}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.btnPublicar} onPress={handleCrearPost} disabled={subiendo}>
              {subiendo ? <ActivityIndicator color="#FFF" /> : <Text style={styles.textoPublicar}>Publicar</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: 10 },

  // ── Card ──
  socialCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    marginBottom: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E8DEF8',
    padding: 14,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Header ──
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarWrapper: { marginRight: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#CE93D8' },
  avatarFallback: { backgroundColor: '#7C4DFF', justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  userNameContainer: { justifyContent: 'center' },
  userName: { fontSize: 15, fontWeight: '700', color: '#4A148C' },
  postDate: { fontSize: 11, color: '#9E9E9E', marginTop: 1 },
  moreOptions: { padding: 4 },
  badgeSocial: { backgroundColor: '#EDE7F6', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeSocialText: { fontSize: 10, color: '#7C4DFF', fontWeight: '700', letterSpacing: 0.3 },

  // ── Contenido ──
  postText: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22, marginBottom: 10 },

  // ── Galería ──
  galeriaContainer: { marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
  galeriaUnica: { width: '100%', height: 220, borderRadius: 14 },
  galeria2: { flexDirection: 'row', gap: 4 },
  galeria2Item: { flex: 1, height: 160 },
  galeriaFill: { width: '100%', height: '100%', borderRadius: 10 },

  // ── Visor foto ──
  fotoViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center' },
  fotoViewerClose: { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 8 },
  fotoViewerCounter: { position: 'absolute', top: 56, left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: 14, fontWeight: '600', zIndex: 10 },
  fotoDots: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  fotoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  fotoDotActive: { backgroundColor: 'white', width: 20 },

  // ── Stats bar ──
  interactionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeIconCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#AB47BC', alignItems: 'center', justifyContent: 'center' },
  statText: { fontSize: 13, color: COLORS.textSecondary },

  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 10 },

  // ── Botones acción ──
  actionButtonsRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 12, backgroundColor: '#F3E5F5', gap: 6 },
  actionButtonText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  // ── Modal comentarios ──
  modalOverlay: { flex: 1, backgroundColor: COLORS.bgModal, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, height: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },

  // ── Comentarios ──
  commentsList: { padding: 15, flexGrow: 1 },
  commentContainer: { flexDirection: 'row', marginBottom: 4 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarMini: { width: 36, height: 36, borderRadius: 18 },
  avatarLetra: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  replyContainer: { flexDirection: 'row', marginLeft: 20, marginBottom: 4, marginTop: 2 },
  replyLine: { width: 2, backgroundColor: COLORS.border, borderRadius: 2, marginRight: 8, marginLeft: 16 },
  replyAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarMiniSmall: { width: 28, height: 28, borderRadius: 14 },
  avatarLetraSmall: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  commentBody: { flex: 1, marginBottom: 2 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  commentBubble: { backgroundColor: COLORS.bgComment, padding: 10, borderRadius: 15, alignSelf: 'flex-start' },
  commentUser: { fontWeight: 'bold', fontSize: 13, marginBottom: 2, color: COLORS.textPrimary },
  replyUser: { fontWeight: 'bold', fontSize: 12, marginBottom: 2, color: COLORS.textPrimary },
  commentText: { fontSize: 14, color: COLORS.textPrimary },
  commentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 14, paddingLeft: 4 },
  commentActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  menuBtn: { padding: 4, marginLeft: 4, marginTop: 2 },

  // ── Input comentarios ──
  respondiendoBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 8, backgroundColor: COLORS.blueLight, borderTopWidth: 1, borderTopColor: COLORS.border },
  respondiendoText: { fontSize: 13, color: COLORS.blue, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, paddingBottom: 32, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.white },
  commentInput: { flex: 1, backgroundColor: COLORS.bgComment, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, fontSize: 15, color: COLORS.textPrimary },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 20 },

  // ── Menú tres puntitos ──
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  menuCard: { backgroundColor: COLORS.white, borderRadius: 16, width: 210, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  menuItemText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  menuDivider: { height: 1, backgroundColor: COLORS.border },

  // ── Modal edición ──
  edicionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  edicionCard: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  edicionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  edicionTitulo: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  edicionInput: { backgroundColor: COLORS.bgComment, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, minHeight: 80, maxHeight: 160, textAlignVertical: 'top', marginBottom: 14 },
  edicionBotones: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  edicionBtnCancelar: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.bgComment },
  edicionCancelarText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  edicionBtnGuardar: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.blue },
  edicionGuardarText: { fontSize: 14, color: COLORS.white, fontWeight: '600' },

  // ── Lista de likes ──
  likeUserRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  likeUserAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  likeUserAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  likeUserAvatarLetra: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  likeUserNombre: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },

  // ── FAB y crear publicación ──
  fab: { position: 'absolute', bottom: 140, right: 20, backgroundColor: COLORS.blue, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },
  crearOverlay: { flex: 1, backgroundColor: COLORS.bgModal, justifyContent: 'flex-end' },
  crearContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', padding: 20 },
  crearHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  crearTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  inputWrapper: { backgroundColor: COLORS.bgComment, borderRadius: 16, padding: 15, minHeight: 120, marginBottom: 15 },
  inputCrear: { fontSize: 16, color: COLORS.textPrimary, textAlignVertical: 'top' },
  previewContainer: { position: 'relative', marginBottom: 15 },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  previewItem: { position: 'relative', width: '47%' },
  previewImagen: { width: '100%', height: 120, borderRadius: 10 },
  btnQuitarImagen: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  btnAñadirImagen: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, backgroundColor: COLORS.blueLight, alignSelf: 'flex-start', marginBottom: 20 },
  textoAñadirImagen: { marginLeft: 8, fontSize: 15, color: COLORS.blue, fontWeight: '600' },
  btnPublicar: { backgroundColor: COLORS.blue, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 'auto', marginBottom: Platform.OS === 'android' ? 40 : 20 },
  textoPublicar: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 20 },
});
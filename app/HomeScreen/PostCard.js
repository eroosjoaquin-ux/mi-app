import { Heart, MessageSquare, MoreHorizontal, Pencil, Reply, Send, ShieldCheck, Trash2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { getNombreMostrar } from '../../services/nombreUsuario';
import { supabase } from '../../services/supabaseConfig';
import BarraReputacion from './BarraReputacion';
const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

const COLORS = {
  white: '#FFFFFF',
  blueLight: '#E3F2FD',
  blue: '#1976D2',
  textPrimary: '#050505',
  textSecondary: '#65676B',
  border: '#E4E6EB',
  red: '#F44336',
  bgModal: 'rgba(0,0,0,0.5)',
  bgComment: '#F0F2F5'
};

const MAX_INPUT_HEIGHT = 100;

export default function PostCard({ post, onContactar, onPostEliminado, onPostEditado }) {
  const userName = getNombreMostrar(post.Usuarios, post.titulo);
  const userAvatar = post.Usuarios?.avatar_url || post.userPhoto;

  const [modalVisible, setModalVisible] = useState(false);
  const [textoComentario, setTextoComentario] = useState('');
  const [comentarios, setComentarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [inputHeight, setInputHeight] = useState(36);
  const [respondiendo, setRespondiendo] = useState(null);
  const [likesComentario, setLikesComentario] = useState({});

  // Like del post — usa tabla likes
  const [likesPost, setLikesPost] = useState(post.likes || 0);
  const [likedPost, setLikedPost] = useState(false);
  const [likeCargando, setLikeCargando] = useState(false);

  // Modal lista de personas que dieron like
  const [modalLikesVisible, setModalLikesVisible] = useState(false);
  const [listaLikes, setListaLikes] = useState([]);
  const [cargandoLikes, setCargandoLikes] = useState(false);

  // Contador de comentarios raíz
  const [commentsCount, setCommentsCount] = useState(post.comments || 0);

  // Visor de foto fullscreen
  const [fotoVisible, setFotoVisible] = useState(false);
  const [fotoIndex, setFotoIndex] = useState(0);

  // Fotos del post (soporta imagen_url simple o array imagenes_urls)
  const fotosPost = post.imagenes_urls?.length
    ? post.imagenes_urls
    : post.imagen_url
    ? [post.imagen_url]
    : [];

  // Menú tres puntitos — comentarios
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuItem, setMenuItem] = useState(null);
  const [menuPuedeEditar, setMenuPuedeEditar] = useState(false);

  // Modal edición — comentarios
  const [modalEdicionVisible, setModalEdicionVisible] = useState(false);
  const [textoEdicion, setTextoEdicion] = useState('');
  const [itemEditando, setItemEditando] = useState(null);

  // Menú tres puntitos — POST propio
  const [menuPostVisible, setMenuPostVisible] = useState(false);

  // Modal edición — POST
  const [modalEdicionPostVisible, setModalEdicionPostVisible] = useState(false);
  const [tituloEdicion, setTituloEdicion] = useState('');
  const [descripcionEdicion, setDescripcionEdicion] = useState('');

  const [sesionUserId, setSesionUserId] = useState(null);
  const keyboardOffset = useRef(new Animated.Value(44)).current;
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  const esPostPropio = sesionUserId && post.usuario_id === sesionUserId;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSesionUserId(session.user.id);
        // Verificar si ya dio like a este post
        supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('usuario_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setLikedPost(true);
          });
      }
    });
  }, []);

  useEffect(() => {
    if (modalVisible) cargarComentarios();
  }, [modalVisible]);

  useEffect(() => {
    if (!modalVisible) return;
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
  }, [modalVisible]);

  // ── Like del post usando tabla likes ──
  const toggleLikePost = async () => {
    if (!sesionUserId || likeCargando) return;
    setLikeCargando(true);
    try {
      if (likedPost) {
        // Quitar like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', sesionUserId);
        if (!error) {
          setLikedPost(false);
          setLikesPost(prev => Math.max(prev - 1, 0));
        }
      } else {
        // Dar like
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, usuario_id: sesionUserId });
        if (!error) {
          setLikedPost(true);
          setLikesPost(prev => prev + 1);
          // Notificar al dueño del post si no es el mismo usuario
          if (post.usuario_id && post.usuario_id !== sesionUserId) {
            const { data: u } = await supabase
              .from('Usuarios')
              .select('nombre, usuario_empresa')
              .eq('id', sesionUserId)
              .single();
            const nombre = u?.usuario_empresa || u?.nombre || 'Alguien';
            await supabase.from('notificaciones').insert({
              usuario_id: post.usuario_id,
              titulo: '❤️ A alguien le gustó tu publicación',
              mensaje: `${nombre} le dio Me gusta a "${post.titulo}"`,
              post_id: post.id,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error en like:", error.message);
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
      console.error("Error cargando likes:", e.message);
    } finally {
      setCargandoLikes(false);
    }
  };

  const abrirModalLikes = () => {
    setModalLikesVisible(true);
    cargarListaLikes();
  };

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
      setLikesComentario(likesIniciales);
    } catch (error) {
      console.error("Error cargando comentarios:", error.message);
    } finally {
      setCargando(false);
    }
  };

  const enviarComentario = async () => {
    const texto = textoComentario.trim();
    if (!texto) return;

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
    } catch (error) {
      console.error("Error:", error.message);
    }
  };

  const toggleLike = (id) => {
    setLikesComentario(prev => {
      const actual = prev[id] || { count: 0, liked: false };
      return {
        ...prev,
        [id]: { count: actual.liked ? actual.count - 1 : actual.count + 1, liked: !actual.liked }
      };
    });
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

  const cerrarMenu = () => {
    setMenuVisible(false);
    setMenuItem(null);
    setMenuPuedeEditar(false);
  };

  const iniciarEdicion = () => {
    if (!menuItem) return;
    setItemEditando(menuItem);
    setTextoEdicion(menuItem.contenido ?? '');
    setMenuVisible(false);
    setMenuItem(null);
    setTimeout(() => setModalEdicionVisible(true), 300);
  };

  const guardarEdicion = async () => {
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
      } else {
        console.error("Error editando comentario:", error.message);
      }
    } catch (error) {
      console.error("Error editando:", error.message);
    }
  };

  const cancelarEdicion = () => {
    setModalEdicionVisible(false);
    setItemEditando(null);
    setTextoEdicion('');
  };

  // Eliminar comentario — el ON DELETE CASCADE en la FK cuida las respuestas hijas
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
      } else {
        console.error("Error eliminando comentario:", error.message);
      }
    } catch (error) {
      console.error("Error eliminando:", error.message);
    }
  };

  // ── Menú POST propio ──
  const abrirMenuPost = () => setMenuPostVisible(true);
  const cerrarMenuPost = () => setMenuPostVisible(false);

  const iniciarEdicionPost = () => {
    setTituloEdicion(post.titulo ?? '');
    setDescripcionEdicion(post.descripcion ?? '');
    setMenuPostVisible(false);
    setTimeout(() => setModalEdicionPostVisible(true), 300);
  };

  const guardarEdicionPost = async () => {
    const titulo = tituloEdicion.trim();
    const descripcion = descripcionEdicion.trim();
    if (!titulo) return;
    try {
      const { error } = await supabase
        .from('posts')
        .update({ titulo, descripcion })
        .eq('id', post.id);
      if (!error) {
        setModalEdicionPostVisible(false);
        onPostEditado?.({ ...post, titulo, descripcion });
      } else {
        console.error("Error editando post:", error.message);
      }
    } catch (error) {
      console.error("Error:", error.message);
    }
  };

  const cancelarEdicionPost = () => {
    setModalEdicionPostVisible(false);
    setTituloEdicion('');
    setDescripcionEdicion('');
  };

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
              // El trigger ON DELETE CASCADE en comentarios.post_id y likes.post_id
              // elimina automáticamente comentarios y likes al borrar el post
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id);
              if (!error) {
                setModalVisible(false);
                onPostEliminado?.(post.id);
              } else {
                console.error("Error eliminando post:", error.message);
              }
            } catch (error) {
              console.error("Error:", error.message);
            }
          }
        }
      ]
    );
  };

  const renderBurbuja = (item, esPadre) => {
    const nombreMostrar = getNombreMostrar(item.Usuarios);
    const inicial = nombreMostrar.charAt(0).toUpperCase();
    const contenido = item.contenido ?? '';
    const likeData = likesComentario[item.id] || { count: 0, liked: false };
    const esMio = item.usuario_id === sesionUserId;

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
            {(esMio || esPostPropio) && (
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
            <TouchableOpacity style={styles.commentActionBtn} onPress={() => toggleLike(item.id)}>
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
        <View key={r.id}>
          {renderBurbuja(r, false)}
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.postCard, post.es_urgente && { borderColor: COLORS.red, borderWidth: 1.5 }]}>
      <View style={styles.postHeader}>
        <View style={styles.contenedorAvatar}>
          {userAvatar
            ? <Image source={{ uri: userAvatar }} style={styles.userPhoto} />
            : <View style={[styles.userPhoto, { backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>{userName.charAt(0).toUpperCase()}</Text>
              </View>
          }
          <BarraReputacion puntos={post.reputacion || 0} />
        </View>
        <View style={styles.postHeaderText}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.userName}>{userName}</Text>
            {!!post.verificado && <ShieldCheck size={16} color={COLORS.blue} style={{ marginLeft: 4 }} />}
            {!!post.es_urgente && <Text style={styles.tagUrgente}>🚨 URGENTE</Text>}
          </View>
          <Text style={styles.userSubtext}>{post.rubro} • {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Recién'}</Text>
        </View>

        {/* Tres puntitos del POST — solo si es propio */}
        {esPostPropio && (
          <TouchableOpacity
            onPress={abrirMenuPost}
            style={styles.menuBtnPost}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreHorizontal size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.postDescriptionContainer}>
        <Text style={styles.postTitle}>{post.titulo}</Text>
        <Text style={styles.postDescriptionText}>{post.descripcion}</Text>
      </View>

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
          {fotosPost.length === 3 && (
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
          {fotosPost.length === 4 && (
            <View style={{ gap: 4 }}>
              <View style={styles.galeria2}>
                {[0, 1].map(i => (
                  <TouchableOpacity key={i} style={styles.galeria2Item} onPress={() => { setFotoIndex(i); setFotoVisible(true); }} activeOpacity={0.92}>
                    <Image source={{ uri: fotosPost[i] }} style={styles.galeriaFill} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.galeria2}>
                {[2, 3].map(i => (
                  <TouchableOpacity key={i} style={styles.galeria2Item} onPress={() => { setFotoIndex(i); setFotoVisible(true); }} activeOpacity={0.92}>
                    <Image source={{ uri: fotosPost[i] }} style={styles.galeriaFill} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Visor fullscreen de fotos ── */}
      <Modal visible={fotoVisible} transparent animationType="fade" onRequestClose={() => setFotoVisible(false)} statusBarTranslucent>
        <View style={styles.fotoViewerOverlay}>
          <TouchableOpacity style={styles.fotoViewerClose} onPress={() => setFotoVisible(false)}>
            <X size={28} color="white" />
          </TouchableOpacity>
          {fotosPost.length > 1 && (
            <Text style={styles.fotoViewerCounter}>{fotoIndex + 1} / {fotosPost.length}</Text>
          )}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
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

      <View style={styles.interactionBar}>
        <TouchableOpacity style={styles.statGroup} onPress={abrirModalLikes} disabled={likesPost === 0}>
          <View style={[styles.likeIconCircle, likedPost && { backgroundColor: COLORS.red }]}>
            <Heart size={10} color="white" fill="white" />
          </View>
          <Text style={styles.statText}>{likesPost}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Text style={styles.statText}>{commentsCount} comentarios</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={toggleLikePost} disabled={likeCargando}>
          <Heart
            size={20}
            color={likedPost ? COLORS.red : COLORS.textSecondary}
            fill={likedPost ? COLORS.red : 'transparent'}
          />
          <Text style={[styles.actionButtonText, likedPost && { color: COLORS.red }]}>Me gusta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(true)}>
          <MessageSquare size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionButtonText}>Comentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.contactBtnActive]} onPress={() => onContactar(post)}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Contactar</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal principal de comentarios ── */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { marginBottom: keyboardOffset }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comentarios</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                placeholder={respondiendo ? `Responder a ${respondiendo.nombre}...` : "Escribe un comentario..."}
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
                    <TouchableOpacity style={styles.menuItem} onPress={iniciarEdicion}>
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

      {/* ── Modal edición — COMENTARIO ── */}
      <Modal visible={modalEdicionVisible} transparent animationType="fade" onRequestClose={cancelarEdicion}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.edicionOverlay}
        >
          <TouchableWithoutFeedback onPress={cancelarEdicion}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={styles.edicionCard}>
            <View style={styles.edicionHeader}>
              <Text style={styles.edicionTitulo}>Editar comentario</Text>
              <TouchableOpacity onPress={cancelarEdicion} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.edicionInput}
              value={textoEdicion}
              onChangeText={setTextoEdicion}
              multiline
              autoFocus
              placeholder="Editá tu comentario..."
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.edicionBotones}>
              <TouchableOpacity onPress={cancelarEdicion} style={styles.edicionBtnCancelar}>
                <Text style={styles.edicionCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={guardarEdicion}
                disabled={!textoEdicion.trim()}
                style={[styles.edicionBtnGuardar, !textoEdicion.trim() && { opacity: 0.5 }]}
              >
                <Text style={styles.edicionGuardarText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal edición — POST ── */}
      <Modal visible={modalEdicionPostVisible} transparent animationType="fade" onRequestClose={cancelarEdicionPost}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.edicionOverlay}
        >
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
              style={[styles.edicionInput, { minHeight: 44, maxHeight: 80 }]}
              value={tituloEdicion}
              onChangeText={setTituloEdicion}
              placeholder="Título..."
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
            />
            <TextInput
              style={styles.edicionInput}
              value={descripcionEdicion}
              onChangeText={setDescripcionEdicion}
              multiline
              placeholder="Descripción..."
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.edicionBotones}>
              <TouchableOpacity onPress={cancelarEdicionPost} style={styles.edicionBtnCancelar}>
                <Text style={styles.edicionCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={guardarEdicionPost}
                disabled={!tituloEdicion.trim()}
                style={[styles.edicionBtnGuardar, !tituloEdicion.trim() && { opacity: 0.5 }]}
              >
                <Text style={styles.edicionGuardarText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal lista de Me gusta ── */}
      <Modal visible={modalLikesVisible} animationType="slide" transparent={true} onRequestClose={() => setModalLikesVisible(false)}>
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
                      <Heart size={14} color={COLORS.red} fill={COLORS.red} style={{ marginLeft: 'auto' }} />
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
}

const styles = StyleSheet.create({
  postCard: { backgroundColor: COLORS.white, marginHorizontal: 15, marginTop: 15, borderRadius: 25, borderWidth: 1, borderColor: COLORS.border, padding: 15 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  contenedorAvatar: { position: 'relative' },
  userPhoto: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.blueLight },
  postHeaderText: { flex: 1, paddingHorizontal: 10 },
  userName: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary },
  userSubtext: { fontSize: 12, color: COLORS.textSecondary },
  tagUrgente: { color: COLORS.red, fontSize: 10, fontWeight: 'bold', marginLeft: 8 },
  postDescriptionContainer: { marginBottom: 10 },
  postTitle: { fontWeight: 'bold', fontSize: 14, color: COLORS.textPrimary },
  postDescriptionText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 18 },
  postImage: { width: '100%', height: 220, borderRadius: 20, marginBottom: 12 },
  galeriaContainer: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  galeriaUnica: { width: '100%', height: 220, borderRadius: 16 },
  galeria2: { flexDirection: 'row', gap: 4 },
  galeria2Item: { flex: 1, height: 160 },
  galeriaFill: { width: '100%', height: '100%', borderRadius: 10 },
  fotoViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center' },
  fotoViewerClose: { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 8 },
  fotoViewerCounter: { position: 'absolute', top: 56, left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: 14, fontWeight: '600', zIndex: 10 },
  fotoDots: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  fotoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  fotoDotActive: { backgroundColor: 'white', width: 20 },
  interactionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeIconCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center' },
  statText: { fontSize: 13, color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },
  actionButtonsRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#F0F2F5', gap: 5 },
  actionButtonText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  contactBtnActive: { backgroundColor: COLORS.blue, flex: 1 },
  menuBtnPost: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.bgModal, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, height: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
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
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  menuCard: { backgroundColor: COLORS.white, borderRadius: 16, width: 200, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  menuItemText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  menuDivider: { height: 1, backgroundColor: COLORS.border },
  respondiendoBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 8, backgroundColor: COLORS.blueLight, borderTopWidth: 1, borderTopColor: COLORS.border },
  respondiendoText: { fontSize: 13, color: COLORS.blue, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, paddingBottom: 32, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.white },
  commentInput: { flex: 1, backgroundColor: COLORS.bgComment, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 20 },
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
  likeUserRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  likeUserAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  likeUserAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  likeUserAvatarLetra: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  likeUserNombre: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
});
import Router from 'next/router';
import Usuario from '../../model/Usuario';
import firebase from '../../firebase/config';
import Cookies from 'js-cookie';
import { createContext, useEffect, useState } from 'react';

interface AuthContextProps {
    usuario?: Usuario | null,
    carregando?: boolean,
    login?: (email: string, senha: string) => Promise<void>,
    cadastrar?: (email: string, senha: string) => Promise<void>,
    loginGoogle?: () => Promise<void>,
    logout?: () => Promise<void>
}

const AuthContext = createContext<AuthContextProps>({});

async function usuarioNormalizado(usuarioFirebase: firebase.User): Promise<Usuario> {
    const token = await usuarioFirebase.getIdToken();
    return {
        uid: usuarioFirebase.uid,
        nome: usuarioFirebase.displayName ?? '',
        email: usuarioFirebase.email ?? '',
        token,
        provedor: usuarioFirebase.providerData[0]?.providerId ?? '',
        imagemUrl: usuarioFirebase.photoURL ?? ''
    }
}

function gerenciarCookie(logado: boolean) {
    if (logado) {
        Cookies.set('admin-template-jk-auth', `${logado}`, {
            expires: 7
        });
    } else {
        Cookies.remove('admin-template-jk-auth');
    }
}

export function AuthProvider(props: any) {
    const [carregando, setCarregando] = useState(true);
    const [usuario, setUsuario] = useState<Usuario|null>(null);

    async function configurarSessao(usuarioFirebase: any) {
        if (usuarioFirebase?.email) {
            const usuario = await usuarioNormalizado(usuarioFirebase);
            setUsuario(usuario);
            gerenciarCookie(true);
            setCarregando(false);
            return usuario.email;
        } else {
            setUsuario(null);
            gerenciarCookie(false);
            setCarregando(false);
            return false;
        }
    }

    async function login(email: string, senha: string) {
        try {
            setCarregando(true);
            const resposta = await firebase.auth().signInWithEmailAndPassword(email, senha);
    
            await configurarSessao(resposta.user);
            Router.push('/');
        } finally {
            setCarregando(false);
        }
    }

    async function cadastrar(email: string, senha: string) {
        try {
            setCarregando(true);
            const resposta = await firebase.auth().createUserWithEmailAndPassword(
                email, senha
            );
    
            await configurarSessao(resposta.user);
            Router.push('/');
        } finally {
            setCarregando(false);
        }
    }

    async function loginGoogle() {
        try {
            setCarregando(true);
            const resposta = await firebase.auth().signInWithPopup(
                new firebase.auth.GoogleAuthProvider()
            );
    
            await configurarSessao(resposta.user);
            Router.push('/');
        } finally {
            setCarregando(false);
        }
    }

    async function logout() {
        try {
            setCarregando(true);
            await firebase.auth().signOut();
            await configurarSessao(null);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        if (Cookies.get('admin-template-jk-auth')) {
            const cancelar = firebase.auth().onIdTokenChanged(configurarSessao);
            return () => cancelar();
        } else {
            setCarregando(false);
        }
    }, []);

    return (
        <AuthContext.Provider value={{
            usuario,
            carregando,
            login,
            cadastrar,
            loginGoogle,
            logout
        }}>
            {props.children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
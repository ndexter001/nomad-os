/**
 * Modular auth client — local demo mode + Firebase / Supabase ready hooks.
 * Set AUTH_CONFIG.provider to 'firebase' or 'supabase' and fill credentials.
 */
const AUTH_CONFIG = {
    provider: 'local',
    firebase: { apiKey: '', authDomain: '', projectId: '' },
    supabase: { url: '', anonKey: '' }
};

const AUTH_STORAGE_KEY = 'nomad-os-auth-session';

const AuthClient = {
    user: null,
    _listeners: [],

    init() {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
            try {
                this.user = JSON.parse(saved);
            } catch {
                localStorage.removeItem(AUTH_STORAGE_KEY);
            }
        }
        this._emit();
        return this.user;
    },

    onAuthStateChanged(fn) {
        this._listeners.push(fn);
        fn(this.user);
        return () => {
            this._listeners = this._listeners.filter((f) => f !== fn);
        };
    },

    _emit() {
        for (const fn of this._listeners) fn(this.user);
    },

    _persist(user) {
        this.user = user;
        if (user) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        else localStorage.removeItem(AUTH_STORAGE_KEY);
        this._emit();
    },

    async signUp(email, password, displayName = '') {
        if (!email || !password) throw new Error('Email and password required');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');

        if (AUTH_CONFIG.provider === 'firebase') {
            return this._firebaseSignUp(email, password, displayName);
        }
        if (AUTH_CONFIG.provider === 'supabase') {
            return this._supabaseSignUp(email, password, displayName);
        }

        const users = JSON.parse(localStorage.getItem('nomad-os-local-users') || '{}');
        if (users[email]) throw new Error('Account already exists');
        const user = {
            uid: `local_${Date.now()}`,
            email,
            displayName: displayName || email.split('@')[0],
            provider: 'local',
            createdAt: new Date().toISOString()
        };
        users[email] = { ...user, passwordHash: btoa(password) };
        localStorage.setItem('nomad-os-local-users', JSON.stringify(users));
        this._persist(user);
        return user;
    },

    async signIn(email, password) {
        if (!email || !password) throw new Error('Email and password required');

        if (AUTH_CONFIG.provider === 'firebase') {
            return this._firebaseSignIn(email, password);
        }
        if (AUTH_CONFIG.provider === 'supabase') {
            return this._supabaseSignIn(email, password);
        }

        const users = JSON.parse(localStorage.getItem('nomad-os-local-users') || '{}');
        const record = users[email];
        if (!record || record.passwordHash !== btoa(password)) {
            throw new Error('Invalid email or password');
        }
        const { passwordHash, ...user } = record;
        this._persist(user);
        return user;
    },

    async signOut() {
        if (AUTH_CONFIG.provider === 'firebase') {
            /* global firebase */ if (typeof firebase !== 'undefined') await firebase.auth().signOut();
        }
        if (AUTH_CONFIG.provider === 'supabase') {
            /* global supabase */ if (typeof supabase !== 'undefined') await supabase.auth.signOut();
        }
        this._persist(null);
    },

    isLoggedIn() {
        return Boolean(this.user);
    },

    getUid() {
        return this.user?.uid ?? null;
    },

    async _firebaseSignUp(email, password, displayName) {
        if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName });
        const user = { uid: cred.user.uid, email, displayName, provider: 'firebase' };
        this._persist(user);
        return user;
    },

    async _firebaseSignIn(email, password) {
        if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
        const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: cred.user.displayName || email.split('@')[0],
            provider: 'firebase'
        };
        this._persist(user);
        return user;
    },

    async _supabaseSignUp(email, password, displayName) {
        if (typeof supabase === 'undefined') throw new Error('Supabase SDK not loaded');
        const client = supabase.createClient(AUTH_CONFIG.supabase.url, AUTH_CONFIG.supabase.anonKey);
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } }
        });
        if (error) throw error;
        const user = {
            uid: data.user.id,
            email,
            displayName: displayName || email.split('@')[0],
            provider: 'supabase'
        };
        this._persist(user);
        return user;
    },

    async _supabaseSignIn(email, password) {
        if (typeof supabase === 'undefined') throw new Error('Supabase SDK not loaded');
        const client = supabase.createClient(AUTH_CONFIG.supabase.url, AUTH_CONFIG.supabase.anonKey);
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const user = {
            uid: data.user.id,
            email: data.user.email,
            displayName: data.user.user_metadata?.display_name || email.split('@')[0],
            provider: 'supabase'
        };
        this._persist(user);
        return user;
    }
};

function initAuthModal() {
    const modal = document.getElementById('auth-modal');
    const openBtn = document.getElementById('auth-open-btn');
    const closeBtn = document.getElementById('auth-close-btn');
    const backdrop = document.getElementById('auth-modal-backdrop');
    const signInForm = document.getElementById('auth-signin-form');
    const signUpForm = document.getElementById('auth-signup-form');
    const tabSignIn = document.getElementById('auth-tab-signin');
    const tabSignUp = document.getElementById('auth-tab-signup');
    const errorEl = document.getElementById('auth-error');
    const profileBtn = document.getElementById('auth-open-btn');

    if (!modal || !openBtn) return;

    function openModal() {
        modal.hidden = false;
        document.body.classList.add('modal-open');
        errorEl.textContent = '';
    }

    function closeModal() {
        modal.hidden = true;
        document.body.classList.remove('modal-open');
    }

    function showTab(mode) {
        const isSignIn = mode === 'signin';
        signInForm.hidden = !isSignIn;
        signUpForm.hidden = isSignIn;
        tabSignIn.classList.toggle('auth-tab--active', isSignIn);
        tabSignUp.classList.toggle('auth-tab--active', !isSignIn);
        errorEl.textContent = '';
    }

    openBtn.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);
    tabSignIn?.addEventListener('click', () => showTab('signin'));
    tabSignUp?.addEventListener('click', () => showTab('signup'));

    signInForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.textContent = '';
        try {
            await AuthClient.signIn(
                document.getElementById('auth-email-in').value.trim(),
                document.getElementById('auth-password-in').value
            );
            closeModal();
        } catch (err) {
            errorEl.textContent = err.message;
        }
    });

    signUpForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.textContent = '';
        try {
            await AuthClient.signUp(
                document.getElementById('auth-email-up').value.trim(),
                document.getElementById('auth-password-up').value,
                document.getElementById('auth-name-up').value.trim()
            );
            closeModal();
        } catch (err) {
            errorEl.textContent = err.message;
        }
    });

    document.getElementById('auth-signout-btn')?.addEventListener('click', () => AuthClient.signOut());

    AuthClient.onAuthStateChanged((user) => {
        const signOutBtn = document.getElementById('auth-signout-btn');
        if (user) {
            profileBtn.textContent = user.displayName || user.email;
            profileBtn.classList.add('auth-btn--logged-in');
            document.getElementById('vault-panel')?.removeAttribute('hidden');
            document.getElementById('auth-guest-hint')?.setAttribute('hidden', '');
            if (signOutBtn) signOutBtn.hidden = false;
        } else {
            profileBtn.textContent = typeof t === 'function' ? t('authSignIn') : 'Sign In';
            profileBtn.classList.remove('auth-btn--logged-in');
            document.getElementById('vault-panel')?.setAttribute('hidden', '');
            document.getElementById('auth-guest-hint')?.removeAttribute('hidden');
            if (signOutBtn) signOutBtn.hidden = true;
        }
        if (typeof VaultManager !== 'undefined') VaultManager.onAuthChange(user);
    });

    AuthClient.init();
    showTab('signin');
}

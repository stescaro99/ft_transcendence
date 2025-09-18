import './style.css';
import { environment } from './environments/environment';
import { HomePage } from './pages/home/home';
import { IdentificationPage } from './pages/identification/identification';
import { StatsPage } from './pages/stats/stats';
import { LogInPage } from './pages/login/login';
import { ProfilePage } from './pages/profile/profile';
import { GamePage } from './pages/game/game';
import { TournamentPage } from './pages/tournament/tournament';
import { OnlineGamePage } from './pages/online_game/online_game';
import { friendPage } from './pages/friend/friend';
import { UserService } from './service/user.service';


console.log("Script caricato");

export let currentLang = (() => {
  try {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      const userObj = JSON.parse(userStr);
      if (userObj.language) {
        console.log('🌐 Lingua caricata dal profilo:', userObj.language);
        return userObj.language;
      }
    }
  } catch (error) {
    console.error('Errore lettura lingua:', error);
  }
  console.log('🌐 Lingua di default: en');
  return 'en';
})();
export const LANG_CHANGED_EVENT = 'lang:changed';
function emitLangChanged() {
  window.dispatchEvent(new CustomEvent(LANG_CHANGED_EVENT, { detail: { lang: currentLang } }));
}
export function setLang(lang: string) {
  if (currentLang !== lang) {
    currentLang = lang;
    // Persist immediatamente
    try {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        u.language = lang;
        sessionStorage.setItem('user', JSON.stringify(u));
      }
    } catch {}
    emitLangChanged();
  }
}
const appDiv = document.getElementById('app')!;
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const nickname = params.get('nickname');
const error = params.get('error');
let navigationStack: string[] = [];

try {
  const existingToken = sessionStorage.getItem('token');
  if (!existingToken) {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        if (userObj && typeof userObj.token === 'string' && userObj.token.length > 0) {
          sessionStorage.setItem('token', userObj.token);
        }
        if (!sessionStorage.getItem('nickname')) {
          const nickFromUser = typeof userObj?.nickname === 'string' ? userObj.nickname : null;
          if (nickFromUser) sessionStorage.setItem('nickname', nickFromUser);
        }
      } catch {}
    }
  }
  if (!sessionStorage.getItem('nickname') && nickname) {
    sessionStorage.setItem('nickname', nickname);
  }
} catch {}

function clearTournamentSession() {
  const KEYS = [
    'tournamentMode',
    'activeTournament',
    'currentGameIndex',
    'currentRound',
    'tournamentP1',
    'tournamentP2',
  ];
  try { KEYS.forEach(k => sessionStorage.removeItem(k)); } catch {}
}

export function navigateWithHistory(route: string) {
  const currentRoute = location.hash.slice(1) || '/';
  
  // Aggiungi la route corrente allo stack (se non è già presente)
  if (navigationStack[navigationStack.length - 1] !== currentRoute) {
    navigationStack.push(currentRoute);
  }
  
  console.log('Navigation stack:', navigationStack);
  window.location.hash = route;
}

export function goBack() {
  if (navigationStack.length > 0) {
    const previousRoute = navigationStack.pop();
    console.log('Going back to:', previousRoute);
    window.location.hash = previousRoute || '/';
  } else {
    // Fallback alla home se non c'è storia
    window.location.hash = '/';
  }
}
// Definisci le rotte una volta sola
const routes: Record<string, () => string> = {
  '/': () => {
    if (sessionStorage.getItem('user')) {
      new HomePage(currentLang);
      return "";
    } else {
      window.location.hash = '/login';
      return "";
    }
  },
  '/identification': () => {
    new IdentificationPage(currentLang);
    return "";
  },
  '/login': () => {
    new LogInPage(currentLang);
    return "";
  },
  '/stats': () => {
    new StatsPage();
    return "";
  },
  '/profile': () => {

    const nickname = location.hash.split('?')[1]?.split('=')[1] || sessionStorage.getItem('nickname') || '';
    new ProfilePage(currentLang, nickname);
    return "";
  },
  '/game': () => {
    
    const fromPage = navigationStack[navigationStack.length - 2] || '/';

    const hash = location.hash.slice(1) || '/';
    const urlParams = hash.split('?')[1]; // Ottieni la parte dopo il '?'
    
    let player1 = sessionStorage.getItem('nickname') || 'Player 1';
    let player2 = 'player 2';
    
    // Se ci sono parametri nell'URL, estraili
    if (urlParams) {
        // Controlla se è il nuovo formato con parametri query
        if (urlParams.includes('player1=') || urlParams.includes('player2=')) {
       
            const params = new URLSearchParams(urlParams);
            player1 = decodeURIComponent(params.get('player1') || player1);
            player2 = decodeURIComponent(params.get('player2') || player2);
            
            console.log('Using query parameters format:', { player1, player2 });
        } else {
            // Formato precedente: /game?Mario_Luigi
            const players = urlParams.split('_');
            if (players.length >= 2) {
                player1 = decodeURIComponent(players[0]);
                player2 = decodeURIComponent(players[1]);
            }
            
            console.log('Using underscore format:', { player1, player2 });
        }
    }


    new GamePage(currentLang, fromPage, player1, player2);
    return "";
  },
  '/online_game': () => {
    new OnlineGamePage(currentLang);
    return "";
  },
  '/tournament': () => {
    new TournamentPage(currentLang);
    return "";
  },
  '/friends': () => {
    new friendPage(currentLang);
    return "";
  }
};

let userLangHydrated = false;
async function hydrateUserLanguageOnce() {
  if (userLangHydrated) return;
  userLangHydrated = true;
  try {
    const userStr = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('token');
    const nickname = sessionStorage.getItem('nickname');
    if (!nickname || !token) return;
    let storedLang: string | undefined;
    if (userStr) { try { storedLang = JSON.parse(userStr).language; } catch {} }
    const resp = await fetch(`${environment.apiUrl}/get_user?nickname=${encodeURIComponent(nickname)}`, { headers: { Authorization: `Bearer ${token}` }});
    if (resp.ok) {
      const userData = await resp.json();
      const backendLang = (userData.language && ['en','it','fr'].includes(userData.language)) ? userData.language : 'it';
      if (backendLang !== currentLang) {
        currentLang = backendLang;
        try {
          const u = userStr ? JSON.parse(userStr) : { nickname };
          u.language = backendLang;
          sessionStorage.setItem('user', JSON.stringify(u));
        } catch {}
        emitLangChanged();
      }
    } else {
      if (storedLang && ['en','it','fr'].includes(storedLang) && storedLang !== currentLang) {
        currentLang = storedLang;
        emitLangChanged();
      }
    }
  } catch (e) { console.warn('Language hydration failed:', e); }
}

function router() {
  const hash = location.hash.slice(1) || '/';
  const path = hash.split('?')[0]; 
  console.log("Navigazione verso:", path);
  
  const currentRoute = hash;
    if (navigationStack[navigationStack.length - 1] !== currentRoute) {
      navigationStack.push(currentRoute);
      console.log('Navigation stack updated:', navigationStack);
    }
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (sessionStorage.getItem('user')) {
      navbar.style.display = 'block';
    } else {
      navbar.style.display = 'none';
    }
  }
  
  const render = routes[path];

  if (render) {
    if (path === '/tournament') {
      render();
    } else {
      const content = render();
      if (content) {
        appDiv.innerHTML = content;
      }
    }
  } else {
    appDiv.innerHTML = `<h1>404</h1><p>Pagina non trovata</p>`;
  }
}

// Gestione errore di autenticazione Google
if (error) {
  console.log('Google auth error detected:', error);
  
  // Controlla se eravamo in attesa di un'autenticazione Google
  const wasGoogleAuthPending = sessionStorage.getItem('googleAuthPending') === 'true';
  
  if (wasGoogleAuthPending) {
    // Pulisci lo stato di attesa
    sessionStorage.removeItem('googleAuthPending');
    sessionStorage.removeItem('googleAuthResolve');
    
    console.log('Processing Google auth error');
    alert('Google login failed: ' + error);
  }
  
  // Reindirizza alla pagina di login
  window.location.hash = '/login';
}
else if (token && nickname)
{
  
  // Controlla se eravamo in attesa di un'autenticazione Google
  const wasGoogleAuthPending = sessionStorage.getItem('googleAuthPending') === 'true';
  
  if (wasGoogleAuthPending)
  {
    // Pulisci lo stato di attesa
    sessionStorage.removeItem('googleAuthPending');
    sessionStorage.removeItem('googleAuthResolve');
    
    console.log('Processing Google auth success');
  }
  
  // Salva i dati nel sessionStorage
  // Manteniamo compatibilità salvando sia il token diretto sia l'oggetto user completo
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify({ token, nickname }));
  const userToStore = {
    token: token,
    nickname: nickname,
 
    language: '',
    image_url: '',
    online: false,
    last_seen: '',
    current_room: '',
    friends: [],
    fr_request: [],
  };

  sessionStorage.setItem('user', JSON.stringify(userToStore));
  sessionStorage.setItem('token', token); // opzionale ma comodo
  sessionStorage.setItem('nickname', nickname);
  
  // Mostra la navbar ora che l'utente è autenticato
  const navbar = document.getElementById('navbar');
  if (navbar) {
    navbar.style.display = 'block';
  }
  
  // Pulisci l'URL dai parametri e naviga alla home
  window.history.replaceState({}, document.title, window.location.pathname);
  window.location.hash = '/';
  
  // Forza il routing dopo un breve delay per assicurarsi che tutto sia impostato
  setTimeout(async () => {
    await hydrateUserLanguageOnce();
    router();
  }, 50);
}

document.addEventListener('DOMContentLoaded', () => {
  const powerBtn = document.getElementById('powerBtn');
  if (powerBtn) {
    powerBtn.addEventListener('click', async () => {
      const nickname = sessionStorage.getItem('nickname');
      if (nickname) {
        try {
          await fetch(environment.apiUrl + '/force_offline', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname })
          });
        } catch (e) { console.error('force_offline error:', e); }
      }
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('nickname');
      sessionStorage.removeItem('token');
      const navbar = document.getElementById('navbar');
      if (navbar) navbar.style.display = 'none';
      window.location.hash = '/login';
    });
  }
});


window.addEventListener('hashchange', (e: HashChangeEvent) => {
  const oldHash = (e as any).oldURL ? new URL((e as any).oldURL).hash : '';
  const newHash = (e as any).newURL ? new URL((e as any).newURL).hash : location.hash;

  const wasTournament = oldHash.startsWith('#/tournament');
  const wasGame = oldHash.startsWith('#/game');
  const goingToGame = newHash.startsWith('#/game');
  const goingToTournament = newHash.startsWith('#/tournament');

  if (wasTournament && !goingToGame) {
    clearTournamentSession();
  }
  if (wasGame) {
    // spegni controller/loop del game se registrato
    (window as any).__cleanupGame?.();
     if (!goingToTournament) {
      clearTournamentSession();
    } 
  }
  router();
  // Mark user online on navigation
  (async () => {
    try {
      const nickname = sessionStorage.getItem('nickname');
      const token = sessionStorage.getItem('token');
      if (nickname) {
        await fetch(environment.apiUrl + '/force_online', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nickname })
        });
      }
    } catch (err) { console.warn('force_online failed:', err); }
  })();
});

// Bootstrap: attende DOM, poi assicura lingua e poi prima render
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await hydrateUserLanguageOnce();
    router();
  });
} else {
  (async () => { await hydrateUserLanguageOnce(); router(); })();
}

window.onbeforeunload = async () => {
  try { clearTournamentSession(); } catch {}
  const nickname = sessionStorage.getItem('nickname');
    if (nickname) {
      try {
        await fetch(environment.apiUrl + '/force_offline', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nickname })
        });
      } catch (e) { console.error('force_offline error:', e); }
    }
}

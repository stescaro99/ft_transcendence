import './style.css';
import { HomePage } from './pages/home/home';
import { IdentificationPage } from './pages/identification/identification';
import { StatsPage } from './pages/stats/stats';
import { LogInPage } from './pages/login/login';
import { ProfilePage } from './pages/profile/profile';
import { GamePage } from './pages/game/game';
import { TournamentPage } from './pages/tournament/tournament';
import { OnlineGamePage } from './pages/online_game/online_game';
import { friendPage } from './pages/friend/friend';

console.log("Script caricato");

export let currentLang = 'it';
export function setLang(lang: string) {
  currentLang = lang;
}

const appDiv = document.getElementById('app')!;
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const nickname = params.get('nickname');
const error = params.get('error');
let navigationStack: string[] = [];

// Normalizza l'autenticazione nel sessionStorage per compatibilità
// - Se esiste solo user.token, copia in token
// - Se manca nickname ma è presente in URL o in user, salvalo
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
     console.log('LLLLL navigation stack', navigationStack);
    const fromPage = navigationStack[navigationStack.length - 2] || '/';

    const hash = location.hash.slice(1) || '/';
    const urlParams = hash.split('?')[1]; // Ottieni la parte dopo il '?'
    
    let player1 = sessionStorage.getItem('nickname') || 'Player 1';
    let player2 = 'Player 2';
    
    // Se ci sono parametri nell'URL, estraili
    if (urlParams) {
        // Controlla se è il nuovo formato con parametri query
        if (urlParams.includes('player1=') || urlParams.includes('player2=')) {
            // Nuovo formato: /game?players=2&player1=Mario&player2=Luigi&tournament=true
            const params = new URLSearchParams(urlParams);
            player1 = params.get('player1') || player1;
            player2 = params.get('player2') || player2;
            
            console.log('Using query parameters format:', { player1, player2 });
        } else {
            // Formato precedente: /game?Mario_Luigi
            const players = urlParams.split('_');
            if (players.length >= 2) {
                player1 = players[0];
                player2 = players[1];
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

function router() {
  const hash = location.hash.slice(1) || '/';
  const path = hash.split('?')[0]; 
  console.log("Navigazione verso:", path);
  
  const currentRoute = hash;
    if (navigationStack[navigationStack.length - 1] !== currentRoute) {
      navigationStack.push(currentRoute);
      console.log('Navigation stack updated:', navigationStack);
    }
  // Gestisci la visibilità della navbar
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
    const content = render(); 
    if (content) {
      appDiv.innerHTML = content;
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
  console.log('Google auth success detected with token and nickname');
  
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
    language: 'English',
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
  
  console.log('Authentication completed, navigating to home');
  
  // Forza il routing dopo un breve delay per assicurarsi che tutto sia impostato
  setTimeout(() => {
    router();
  }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
  const powerBtn = document.getElementById('powerBtn');
  if (powerBtn) {
    powerBtn.addEventListener('click', async () => {
      const nickname = sessionStorage.getItem('nickname');
      if (nickname) {
        try {
          await fetch('https://transcendence.be:9443/api/force_offline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

window.addEventListener('hashchange', router);
window.addEventListener('load', router);
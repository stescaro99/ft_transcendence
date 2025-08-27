import friendHtml from './friend.html?raw';
import { User } from '../../model/user.model';
import { UserService } from '../../service/user.service';
import { TranslationService } from '../../service/translation.service';


export class friendPage {

    private currentLang: string;
    private translationService: TranslationService;
    private userService: UserService = new UserService();
    private user!: User;
    private profile: Pick<User, 'nickname' | 'image_url' | 'online'> = {
        nickname: '',
        image_url: '',
        online: false
    };
    private friends: Pick<User, 'nickname' | 'image_url' | 'online'>[] = [];
	private friendRequest: Pick<User, 'nickname' | 'image_url' | 'online'>[] = [];
    
    constructor(lang: string){
        this.currentLang = lang;
        this.initializeUser();
        this.render();
        
        // Aspetta che il DOM sia renderizzato prima di aggiungere gli event listeners
        setTimeout(() => {
            this.addEventListeners();
        }, 100);
    }

    private async initializeUser() {
        try {
            this.user = await this.userService.takeUserFromApi(localStorage.getItem('nickname') || '');
        } catch (error) {
            console.error('Error fetching user data:', error);
            this.user = new User();
        }
    }

    private render() {
        const appDiv = document.getElementById('app');
        if (appDiv) {
            this.translationService = new TranslationService(this.currentLang);
            const translatedHtml = this.translationService.translateTemplate(friendHtml);
            appDiv.innerHTML = translatedHtml;
        }

        // Aspetta che l'HTML sia renderizzato prima di caricare gli amici
        setTimeout(() => {
            this.loadFriends();
			this.renderFriendRequests();
        }, 50);
    }

    // Method to translate dynamically added content
    private translateDynamicContent(element: HTMLElement) {
        const html = element.innerHTML;
        const translatedHtml = this.translationService.translateTemplate(html);
        element.innerHTML = translatedHtml;
    }

    private loadFriends() {
        for (const friend of this.user.friends || []) {
            this.userService.takeUserFromApi(friend)
                .then((friendData) => {
                    this.friends.push({
                        nickname: friendData.nickname,
                        image_url: friendData.image_url || './src/utils/default.png',
                        online: friendData.online || false
                    });
                    this.renderFriends();
                })
                .catch((error) => {
                    console.error('Error fetching friend data:', error);
                });
        }
		for (const request of this.user.fr_request || []) {
			this.userService.takeUserFromApi(request)
				.then((requestData) => {
					this.friendRequest.push({
						nickname: requestData.nickname,
						image_url: requestData.image_url || './src/utils/default.png',
						online: requestData.online || false
					});
					this.renderFriendRequests();
				})
				.catch((error) => {
					console.error('Error fetching friend request data:', error);
				});
		}
    }

	private renderFriendRequests() {
    const requestList = document.getElementById('requestList');
    if (requestList) {
        requestList.innerHTML = '';
        
        if (this.friendRequest.length === 0) {
            requestList.innerHTML = '<div class="text-gray-400 text-center">{{friend.no_friend_requests}}</div>';
            this.translateDynamicContent(requestList);
            return;
        }
        
        this.friendRequest.forEach(request => {
            const requestItem = document.createElement('div');
            requestItem.className = 'request-item flex items-center gap-4 p-3 border-b border-gray-600';
            requestItem.innerHTML = `
                <a href="#/profile?nickname=${request.nickname}" class="hover:opacity-80 transition-opacity">
                    <img src="${request.image_url}" alt="${request.nickname}" class="w-12 h-12 rounded-full">
                </a>
                <div class="flex-1">
                    <span class="text-white">${request.nickname}</span>
                    <br>
                    <span class="text-sm ${request.online ? 'text-green-400' : 'text-gray-400'}">
                        ${request.online ? '{{friend.online}}' : '{{friend.offline}}'}
                    </span>
                </div>
                <div class="flex gap-2">
                    <button class="accept-btn bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600" 
                            data-nickname="${request.nickname}">
                        {{friend.accept}}
                    </button>
                </div>
            `;
            this.translateDynamicContent(requestItem);
            requestList.appendChild(requestItem);
        });
        
        this.addRequestEventListeners();
    }
}

	private addRequestEventListeners() {
    // Event listeners per i pulsanti "Accetta"
		const acceptButtons = document.querySelectorAll('.accept-btn');
		acceptButtons.forEach(button => {
			button.addEventListener('click', (event) => {
				const nickname = (event.target as HTMLElement).getAttribute('data-nickname');
				if (nickname) {
					this.userService.addFriend(this.user.nickname ,nickname);
                     this.render()
				}
			});
		});
	}

    private addEventListeners() {
        console.log('🔍 Adding event listeners...');
        
        const searchbar = document.getElementById('searchInput') as HTMLInputElement;
        const searchButton = document.getElementById('searchButton');
        
        console.log('🔍 Searchbar found:', searchbar);
        console.log('🔍 Search button found:', searchButton);
        
        if (!searchbar || !searchButton) {
            return;
        }
        

        searchbar.addEventListener('keypress', (event) => {
            console.log('🔍 Key pressed:', event.key);
            if (event.key === 'Enter') {
                console.log('🔍 Enter pressed, searching...');
                this.searchUser();
            }
        });
        
        searchButton.addEventListener('click', (event) => {
            console.log('🔍 Button clicked, searching...');
            event.preventDefault();
            this.searchUser();
        });

        console.log('✅ Event listeners added successfully');
    }

    private searchUser() {
        console.log('🔍 searchUser called');
        
        const searchbar = document.getElementById('searchInput') as HTMLInputElement;
        if (!searchbar) {
            console.error('❌ Search input not found');
            return;
        }

        const searchValue = searchbar.value.trim();
        console.log('🔍 Search value:', searchValue);
        
        if (!searchValue) {
            console.warn('⚠️ Search input is empty');
            this.showErrorMessage(this.translationService.translateTemplate('{{friend.enter_username}}'));
            return;
        }
        
        console.log('🔍 Searching for user:', searchValue);
        this.showLoadingState();
        
        this.userService.takeUserFromApi(searchValue)
            .then((userData) => {
                console.log('✅ User found:', userData);
                this.profile = {
                    nickname: userData.nickname,
                    image_url: userData.image_url || './src/utils/default.png',
                    online: userData.online || false
                };
                this.renderSearchResult();
            })
            .catch((error) => {
                console.error('❌ Error fetching user data:', error);
                this.showErrorMessage(this.translationService.translateTemplate('{{friend.user_not_found}}'));
            });
    }

    private showLoadingState() {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.innerHTML = '<div class="text-cyan-400 mt-4">{{friend.searching_user}}</div>';
            this.translateDynamicContent(resultDiv);
        }
    }

    private renderSearchResult() {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="search-result border border-cyan-400 rounded p-4 mt-4 flex items-center gap-4">
                    <a href="#/profile?nickname=${this.profile.nickname}" class="hover:opacity-80 transition-opacity">
                    <img src="${this.profile.image_url}" alt="${this.profile.nickname}" class="w-16 h-16 rounded-full">
                </a>
                    <div class="flex-1">
                        <span class="text-white text-lg">${this.profile.nickname}</span>
                        <br>
                        <span class="text-sm ${this.profile.online ? 'text-green-400' : 'text-gray-400'}">
                            ${this.profile.online ? '{{friend.online}}' : '{{friend.offline}}'}
                        </span>
                    </div>
                    <button id="addFriendBtn" class="bg-cyan-400 text-black px-4 py-2 rounded hover:bg-cyan-300">
                        {{friend.add_friend}}
                    </button>
                </div>
            `;

            // Translate the dynamic content
            this.translateDynamicContent(resultDiv);
            
            // Aggiungi event listener per il pulsante "Aggiungi Amico"
            const addFriendBtn = document.getElementById('addFriendBtn');
            if (addFriendBtn) {
                addFriendBtn.addEventListener('click', () => {
                    this.addFriend(this.profile.nickname);
                });
            }
        }
    }

    private showErrorMessage(message: string) {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.innerHTML = `<div class="error text-red-400 mt-4">${message}</div>`;
        }
    }

    private addFriend(nickname: string) {
        this.userService.addFriend(this.user.nickname, nickname)
			.then((response) => {
				console.log('✅ Friend added:', response);
                 this.render()
			})
			.catch((error) => {
				console.error('❌ Error adding friend:', error);
				this.showErrorMessage(this.translationService.translateTemplate('{{friend.error_adding_friend}}'));
			});
    }

    private renderFriends() {
        const friendsList = document.getElementById('friendsList');
        if (friendsList) {
            friendsList.innerHTML = '';
            this.friends.forEach(friend => {
                const friendItem = document.createElement('div');
                friendItem.className = 'friend-item flex items-center gap-4 p-3 border-b border-gray-600';
                friendItem.innerHTML = `
                   <a href="#/profile?nickname=${friend.nickname}" class="hover:opacity-80 transition-opacity">
                    <img src="${friend.image_url}" alt="${friend.nickname}" class="w-12 h-12 rounded-full">
                	</a>
                    <span class="text-white flex-1">${friend.nickname}</span>
                    <span class="text-sm ${friend.online ? 'text-green-400' : 'text-gray-400'}">
                        ${friend.online ? '{{friend.online}}' : '{{friend.offline}}'}
                    </span>
                `;
                this.translateDynamicContent(friendItem);
                friendsList.appendChild(friendItem);
            });
        }
    }
}